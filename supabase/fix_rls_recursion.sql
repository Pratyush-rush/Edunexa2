-- ============================================================
-- EduNexa RLS Recursion Fix Migration
-- Run this script directly in the Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. DROP EXISTING POLICIES THAT CAUSE MUTUAL RECURSION
drop policy if exists "classrooms_select_member" on public.classrooms;
drop policy if exists "classrooms_select_auth" on public.classrooms;
drop policy if exists "classrooms_insert_teacher" on public.classrooms;
drop policy if exists "classrooms_update_teacher" on public.classrooms;
drop policy if exists "classrooms_delete_teacher" on public.classrooms;

drop policy if exists "class_members_select_auth" on public.class_members;
drop policy if exists "class_members_insert_student" on public.class_members;
drop policy if exists "class_members_delete_student" on public.class_members;

drop policy if exists "attendance_select_auth" on public.attendance;
drop policy if exists "attendance_insert_teacher" on public.attendance;
drop policy if exists "attendance_delete_teacher" on public.attendance;

drop policy if exists "quizzes_select_auth" on public.quizzes;
drop policy if exists "quizzes_insert_teacher" on public.quizzes;
drop policy if exists "quizzes_update_teacher" on public.quizzes;
drop policy if exists "quizzes_delete_teacher" on public.quizzes;

drop policy if exists "quiz_questions_select_auth" on public.quiz_questions;
drop policy if exists "quiz_questions_all_teacher" on public.quiz_questions;

drop policy if exists "quiz_attempts_select_auth" on public.quiz_attempts;
drop policy if exists "quiz_attempts_all_student" on public.quiz_attempts;

drop policy if exists "quiz_answers_select_auth" on public.quiz_answers;
drop policy if exists "quiz_answers_all_student" on public.quiz_answers;

drop policy if exists "quiz_allowed_select_auth" on public.quiz_allowed_students;
drop policy if exists "quiz_allowed_all_teacher" on public.quiz_allowed_students;

drop policy if exists "materials_select_auth" on public.classroom_materials;
drop policy if exists "materials_all_teacher" on public.classroom_materials;

-- 2. CREATE SECURITY DEFINER HELPER FUNCTIONS
-- Using SECURITY DEFINER runs the query with database owner permissions,
-- bypassing RLS checks inside the function body and preventing circular recursion.

create or replace function public.is_classroom_teacher(_classroom_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.classrooms
    where id = _classroom_id and teacher_id = _user_id
  );
$$;

create or replace function public.is_classroom_member(_classroom_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.class_members
    where classroom_id = _classroom_id and student_id = _user_id
  );
$$;

-- 3. RECREATE CLEAN, NON-RECURSIVE POLICIES

-- Classrooms: Any authenticated user can read (teachers, students joining via join code, enrolled students)
create policy "classrooms_select_auth" on public.classrooms
  for select using (auth.role() = 'authenticated');

create policy "classrooms_insert_teacher" on public.classrooms
  for insert with check (auth.uid() = teacher_id);

create policy "classrooms_update_teacher" on public.classrooms
  for update using (auth.uid() = teacher_id);

create policy "classrooms_delete_teacher" on public.classrooms
  for delete using (auth.uid() = teacher_id);

-- Class members: Students see own memberships; teachers see rosters
create policy "class_members_select_auth" on public.class_members
  for select using (
    auth.uid() = student_id
    or public.is_classroom_teacher(classroom_id, auth.uid())
  );

create policy "class_members_insert_student" on public.class_members
  for insert with check (auth.uid() = student_id);

create policy "class_members_delete_student" on public.class_members
  for delete using (auth.uid() = student_id);

-- Attendance: Teachers manage; students see their own
create policy "attendance_select_auth" on public.attendance
  for select using (
    auth.uid() = student_id
    or public.is_classroom_teacher(classroom_id, auth.uid())
  );

create policy "attendance_insert_teacher" on public.attendance
  for insert with check (
    public.is_classroom_teacher(classroom_id, auth.uid())
  );

create policy "attendance_delete_teacher" on public.attendance
  for delete using (
    public.is_classroom_teacher(classroom_id, auth.uid())
  );

-- Quizzes: Teachers manage; students read published quizzes in their classroom
create policy "quizzes_select_auth" on public.quizzes
  for select using (
    auth.uid() = teacher_id
    or (
      is_published = true
      and public.is_classroom_member(classroom_id, auth.uid())
    )
  );

create policy "quizzes_insert_teacher" on public.quizzes
  for insert with check (auth.uid() = teacher_id);

create policy "quizzes_update_teacher" on public.quizzes
  for update using (auth.uid() = teacher_id);

create policy "quizzes_delete_teacher" on public.quizzes
  for delete using (auth.uid() = teacher_id);

-- Quiz Questions
create policy "quiz_questions_select_auth" on public.quiz_questions
  for select using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id
      and (
        q.teacher_id = auth.uid()
        or (
          q.is_published = true
          and public.is_classroom_member(q.classroom_id, auth.uid())
        )
      )
    )
  );

create policy "quiz_questions_all_teacher" on public.quiz_questions
  for all using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and q.teacher_id = auth.uid()
    )
  );

-- Quiz Attempts: Students manage own; teachers see attempts for their quizzes
create policy "quiz_attempts_select_auth" on public.quiz_attempts
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.quizzes q
      where q.id = quiz_attempts.quiz_id and q.teacher_id = auth.uid()
    )
  );

create policy "quiz_attempts_all_student" on public.quiz_attempts
  for all using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Quiz Answers
create policy "quiz_answers_select_auth" on public.quiz_answers
  for select using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = quiz_answers.attempt_id
      and (
        a.student_id = auth.uid()
        or exists (
          select 1 from public.quizzes q
          where q.id = a.quiz_id and q.teacher_id = auth.uid()
        )
      )
    )
  );

create policy "quiz_answers_all_student" on public.quiz_answers
  for all using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = quiz_answers.attempt_id and a.student_id = auth.uid()
    )
  );

-- Quiz Allowed Students
create policy "quiz_allowed_select_auth" on public.quiz_allowed_students
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.quizzes q
      where q.id = quiz_allowed_students.quiz_id and q.teacher_id = auth.uid()
    )
  );

create policy "quiz_allowed_all_teacher" on public.quiz_allowed_students
  for all using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_allowed_students.quiz_id and q.teacher_id = auth.uid()
    )
  );

-- Classroom Materials
create policy "materials_select_auth" on public.classroom_materials
  for select using (
    teacher_id = auth.uid()
    or public.is_classroom_member(classroom_id, auth.uid())
  );

create policy "materials_all_teacher" on public.classroom_materials
  for all using (
    teacher_id = auth.uid()
  );
