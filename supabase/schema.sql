-- ============================================================
-- EduNexa Full Schema — run this in the Supabase SQL Editor
-- ============================================================

-- ============ BASE IDENTITY ============

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('admin','teacher','student')),
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  admin_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  admin_id uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  registration_no text unique,
  admin_id uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ CLASSROOMS ============

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  name text not null,
  subject text,
  join_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (classroom_id, student_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null,
  status text not null default 'present' check (status in ('present','absent')),
  created_at timestamptz not null default now(),
  unique (classroom_id, student_id, attendance_date)
);

-- ============ QUIZ ENGINE ============

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  title text not null,
  description text,
  question_count integer not null default 0,
  duration_minutes integer not null default 10,
  access_type text not null default 'all' check (access_type in ('all','present','selected')),
  randomize_questions boolean not null default false,
  randomize_options boolean not null default false,
  one_attempt boolean not null default false,
  result_release text not null default 'later' check (result_release in ('later','now')),
  session_code text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_option text,
  topic text,
  marks numeric not null default 1,
  question_order integer,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  score numeric,
  total_marks numeric,
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  created_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option text,
  is_correct boolean not null default false,
  marks_obtained numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table if not exists public.quiz_allowed_students (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);

-- ============ MATERIALS ============

create table if not exists public.classroom_materials (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  title text not null,
  description text,
  resource_url text not null,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.classrooms enable row level security;
alter table public.class_members enable row level security;
alter table public.attendance enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_allowed_students enable row level security;
alter table public.classroom_materials enable row level security;

-- profiles: users manage their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- admins: self-managed only (server routes use the service role);
-- the admin_code is a signup credential and must not be readable by clients
create policy "admins_all_own" on public.admins
  for all using (auth.uid() = id);

-- teachers: readable by authenticated, self-managed
create policy "teachers_select_auth" on public.teachers
  for select using (auth.role() = 'authenticated');
create policy "teachers_all_own" on public.teachers
  for all using (auth.uid() = id);

-- students: readable by authenticated, self-managed, teachers read their enrollees
create policy "students_select_auth" on public.students
  for select using (auth.role() = 'authenticated');
create policy "students_all_own" on public.students
  for all using (auth.uid() = id);

-- classrooms: teacher manages own; students read classrooms they belong to
create policy "classrooms_select_member" on public.classrooms
  for select using (
    auth.uid() = teacher_id
    or exists (
      select 1 from public.class_members cm
      where cm.classroom_id = classrooms.id and cm.student_id = auth.uid()
    )
  );
create policy "classrooms_insert_teacher" on public.classrooms
  for insert with check (auth.uid() = teacher_id);
create policy "classrooms_update_teacher" on public.classrooms
  for update using (auth.uid() = teacher_id);
create policy "classrooms_delete_teacher" on public.classrooms
  for delete using (auth.uid() = teacher_id);

-- class_members: students see/join their memberships; teachers see classroom rosters
create policy "class_members_select_auth" on public.class_members
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.classrooms c
      where c.id = class_members.classroom_id and c.teacher_id = auth.uid()
    )
  );
create policy "class_members_insert_student" on public.class_members
  for insert with check (auth.uid() = student_id);
create policy "class_members_delete_student" on public.class_members
  for delete using (auth.uid() = student_id);

-- attendance: teachers manage classroom attendance; students see their own
create policy "attendance_select_auth" on public.attendance
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.classrooms c
      where c.id = attendance.classroom_id and c.teacher_id = auth.uid()
    )
  );
create policy "attendance_insert_teacher" on public.attendance
  for insert with check (
    exists (
      select 1 from public.classrooms c
      where c.id = attendance.classroom_id and c.teacher_id = auth.uid()
    )
  );
create policy "attendance_delete_teacher" on public.attendance
  for delete using (
    exists (
      select 1 from public.classrooms c
      where c.id = attendance.classroom_id and c.teacher_id = auth.uid()
    )
  );

-- quizzes: teachers manage own; students read published in their classroom
create policy "quizzes_select_auth" on public.quizzes
  for select using (
    auth.uid() = teacher_id
    or (
      is_published = true
      and exists (
        select 1 from public.class_members cm
        join public.classrooms c on c.id = cm.classroom_id
        where c.id = quizzes.classroom_id and cm.student_id = auth.uid()
      )
    )
  );
create policy "quizzes_insert_teacher" on public.quizzes
  for insert with check (auth.uid() = teacher_id);
create policy "quizzes_update_teacher" on public.quizzes
  for update using (auth.uid() = teacher_id);
create policy "quizzes_delete_teacher" on public.quizzes
  for delete using (auth.uid() = teacher_id);

-- quiz_questions: readable by anyone who can read the quiz; teachers manage
create policy "quiz_questions_select_auth" on public.quiz_questions
  for select using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id
      and (
        q.teacher_id = auth.uid()
        or (
          q.is_published = true
          and exists (
            select 1 from public.class_members cm
            join public.classrooms c on c.id = cm.classroom_id
            where c.id = q.classroom_id and cm.student_id = auth.uid()
          )
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

-- quiz_attempts: students manage their own; teachers read classroom attempts
create policy "quiz_attempts_select_auth" on public.quiz_attempts
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.quizzes q
      join public.classrooms c on c.id = q.classroom_id
      where q.id = quiz_attempts.quiz_id and c.teacher_id = auth.uid()
    )
  );
create policy "quiz_attempts_all_student" on public.quiz_attempts
  for all using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- quiz_answers: students manage their own attempt answers; teachers read
create policy "quiz_answers_select_auth" on public.quiz_answers
  for select using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = quiz_answers.attempt_id
      and (
        a.student_id = auth.uid()
        or exists (
          select 1 from public.quizzes q
          join public.classrooms c on c.id = q.classroom_id
          where q.id = a.quiz_id and c.teacher_id = auth.uid()
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

-- quiz_allowed_students: students read own eligibility; teachers manage
create policy "quiz_allowed_select_auth" on public.quiz_allowed_students
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.quizzes q
      join public.classrooms c on c.id = q.classroom_id
      where q.id = quiz_allowed_students.quiz_id and c.teacher_id = auth.uid()
    )
  );
create policy "quiz_allowed_all_teacher" on public.quiz_allowed_students
  for all using (
    exists (
      select 1 from public.quizzes q
      join public.classrooms c on c.id = q.classroom_id
      where q.id = quiz_allowed_students.quiz_id and c.teacher_id = auth.uid()
    )
  );

-- classroom_materials: teachers manage own classroom materials; students read enrolled classrooms
create policy "materials_select_auth" on public.classroom_materials
  for select using (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_materials.classroom_id
      and (
        c.teacher_id = auth.uid()
        or exists (
          select 1 from public.class_members cm
          where cm.classroom_id = c.id and cm.student_id = auth.uid()
        )
      )
    )
  );
create policy "materials_all_teacher" on public.classroom_materials
  for all using (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_materials.classroom_id and c.teacher_id = auth.uid()
    )
  );

-- ============ STORAGE ============

insert into storage.buckets (id, name, public)
values ('classroom-materials', 'classroom-materials', true)
on conflict (id) do update set public = true;

create policy "materials_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'classroom-materials');
create policy "materials_storage_select" on storage.objects
  for select to authenticated using (bucket_id = 'classroom-materials');
create policy "materials_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'classroom-materials');