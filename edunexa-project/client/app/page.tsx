"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Smart Assessments",
    text: "Create engaging quizzes with timers, random questions and controlled access.",
  },
  {
    icon: Brain,
    title: "Learning Gap Detection",
    text: "Understand where students need support through topic-wise performance.",
  },
  {
    icon: LineChart,
    title: "Actionable Analytics",
    text: "Turn attendance, assessments and results into meaningful classroom insights.",
  },
  {
    icon: GraduationCap,
    title: "Personalized Learning",
    text: "Help students follow learning recommendations based on their performance.",
  },
];

const stats = [
  { value: "01", label: "Connected Platform" },
  { value: "03", label: "Powerful Portals" },
  { value: "24/7", label: "Learning Access" },
  { value: "∞", label: "Room to Grow" },
];

export default function Home() {
  return (
    <main className="landing-page">
      {/* NAVBAR */}
      <nav className="navbar">
        <a href="/" className="brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>

          <div>
            <div className="brand-name">EduNexa</div>
            <div className="brand-caption">Smart Education Platform</div>
          </div>
        </a>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#portals">Portals</a>
        </div>

        <a href="/login" className="nav-login">
          Login
          <ArrowRight size={17} />
        </a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />

        <div className="hero-content">
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles size={15} />
            SMART EDUCATION • CONNECTED CLASSROOMS
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Turn every classroom
            <br />
            into a <span>smarter journey.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            EduNexa connects teachers, students and administrators in one
            intelligent learning ecosystem — from classroom attendance and
            assessments to results and personalized learning insights.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <a href="/login" className="primary-button">
              Enter EduNexa
              <ArrowRight size={18} />
            </a>

            <a href="#how-it-works" className="secondary-button">
              Explore platform
            </a>
          </motion.div>

          <motion.div
            className="hero-trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div>
              <CheckCircle2 size={17} />
              Connected classrooms
            </div>

            <div>
              <CheckCircle2 size={17} />
              Smarter assessments
            </div>

            <div>
              <CheckCircle2 size={17} />
              Learning insights
            </div>
          </motion.div>
        </div>

        {/* HERO VISUAL */}
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
        >
          <div className="dashboard-window">
            <div className="window-top">
              <div className="window-dots">
                <span />
                <span />
                <span />
              </div>

              <span>EduNexa Dashboard</span>

              <div className="window-user">
                <Users size={15} />
              </div>
            </div>

            <div className="mini-dashboard">
              <div className="mini-sidebar">
                <div className="mini-logo">
                  <Sparkles size={15} />
                </div>

                <div className="mini-line active" />
                <div className="mini-line" />
                <div className="mini-line" />
                <div className="mini-line" />
                <div className="mini-line" />
              </div>

              <div className="mini-content">
                <div className="mini-heading">
                  <div>
                    <small>WELCOME BACK</small>
                    <strong>Classroom overview</strong>
                  </div>

                  <div className="mini-avatar">E</div>
                </div>

                <div className="mini-cards">
                  <div>
                    <span>Students</span>
                    <strong>64</strong>
                    <small>Across classrooms</small>
                  </div>

                  <div>
                    <span>Attendance</span>
                    <strong>92%</strong>
                    <small>+8.4% this month</small>
                  </div>

                  <div>
                    <span>Assessments</span>
                    <strong>18</strong>
                    <small>Active & completed</small>
                  </div>
                </div>

                <div className="mini-chart">
                  <div className="chart-heading">
                    <span>Learning performance</span>
                    <small>Last 7 assessments</small>
                  </div>

                  <div className="chart-bars">
                    {[45, 62, 54, 78, 66, 88, 74, 94].map(
                      (height, index) => (
                        <motion.div
                          key={index}
                          className="chart-bar"
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{
                            duration: 0.8,
                            delay: 0.6 + index * 0.08,
                          }}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            className="floating-card floating-attendance"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="floating-icon">
              <ClipboardCheck size={18} />
            </div>
            <div>
              <small>Today's attendance</small>
              <strong>92% Present</strong>
            </div>
          </motion.div>

          <motion.div
            className="floating-card floating-learning"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity }}
          >
            <div className="floating-icon brain-icon">
              <Brain size={18} />
            </div>
            <div>
              <small>Learning insight</small>
              <strong>3 gaps detected</strong>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* STATS */}
      <section className="stats-section">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="stat-item"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
          >
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </motion.div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="section features-section" id="features">
        <div className="section-heading">
          <div className="section-label">WHY EDUNEXA</div>

          <h2>
            Everything your classroom
            <br />
            needs to <span>move forward.</span>
          </h2>

          <p>
            One connected platform designed to simplify classroom management
            while turning student data into useful learning actions.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                className="feature-card"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -7 }}
              >
                <div className="feature-icon">
                  <Icon size={23} />
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.text}</p>

                <div className="feature-arrow">
                  <ArrowRight size={17} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section workflow-section" id="how-it-works">
        <div className="section-heading centered">
          <div className="section-label">HOW IT WORKS</div>

          <h2>
            From classroom activity
            <br />
            to <span>better learning.</span>
          </h2>
        </div>

        <div className="workflow">
          {[
            {
              number: "01",
              icon: Users,
              title: "Connect",
              text: "Teachers create classrooms and students join using a simple classroom code.",
            },
            {
              number: "02",
              icon: ClipboardCheck,
              title: "Assess",
              text: "Manage attendance, conduct smart quizzes and upload academic results.",
            },
            {
              number: "03",
              icon: Brain,
              title: "Understand",
              text: "EduNexa analyzes performance to identify topic-wise learning gaps.",
            },
            {
              number: "04",
              icon: GraduationCap,
              title: "Improve",
              text: "Students receive focused learning recommendations and opportunities to improve.",
            },
          ].map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                className="workflow-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="workflow-number">{step.number}</div>

                <div className="workflow-icon">
                  <Icon size={22} />
                </div>

                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* PORTALS */}
      <section className="section portals-section" id="portals">
        <div className="portal-intro">
          <div className="section-label">ONE PLATFORM</div>

          <h2>
            Built for everyone
            <br />
            in the <span>education ecosystem.</span>
          </h2>

          <p>
            Every role gets the tools and information they need, while
            everything remains connected through one platform.
          </p>

          <a href="/login" className="primary-button">
            Explore your portal
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="portal-cards">
          <motion.div
            className="portal-card student-portal"
            whileHover={{ scale: 1.025 }}
          >
            <GraduationCap size={25} />

            <small>FOR STUDENTS</small>
            <h3>Learn with clarity.</h3>

            <p>
              Classes, quizzes, attendance, results and personalized learning
              insights in one place.
            </p>
          </motion.div>

          <motion.div
            className="portal-card teacher-portal"
            whileHover={{ scale: 1.025 }}
          >
            <BookOpen size={25} />

            <small>FOR TEACHERS</small>
            <h3>Teach with insight.</h3>

            <p>
              Manage classrooms, assessments, attendance, results and student
              learning gaps.
            </p>
          </motion.div>

          <motion.div
            className="portal-card admin-portal"
            whileHover={{ scale: 1.025 }}
          >
            <ShieldCheck size={25} />

            <small>FOR ADMINS</small>
            <h3>Manage with confidence.</h3>

            <p>
              Monitor users, classrooms, assessments and platform-wide
              performance.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow" />

        <div className="cta-content">
          <div className="section-label">THE NEXT CLASSROOM STARTS HERE</div>

          <h2>
            Make learning
            <br />
            <span>more connected.</span>
          </h2>

          <p>
            EduNexa brings classroom management, assessment and learning
            intelligence together.
          </p>

          <a href="/login" className="primary-button light-button">
            Get started
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-brand">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>

          <div>
            <strong>EduNexa</strong>
            <span>Smart Education Platform</span>
          </div>
        </div>

        <p>Smart Learning. Connected Classrooms. Better Outcomes.</p>

        <span className="footer-copy">
          © {new Date().getFullYear()} EduNexa
        </span>
      </footer>
    </main>
  );
}