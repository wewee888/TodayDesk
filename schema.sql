-- TodayDesk Cloudflare D1 Database Schema
-- 2026-10-19

CREATE TABLE IF NOT EXISTS users (
  account TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  grade_class TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  target_goal TEXT,
  password_hash TEXT DEFAULT '123456',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS desk_settings (
  account TEXT PRIMARY KEY,
  pomodoro_minutes INTEGER DEFAULT 25,
  pe_exercises TEXT,
  extracurricular_activities TEXT,
  custom_subjects TEXT,
  activity_configs TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homework_tasks (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  subject TEXT NOT NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 15,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_pomodoros INTEGER NOT NULL DEFAULT 0,
  task_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routine_schedules (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  title TEXT NOT NULL,
  time_text TEXT NOT NULL,
  tag TEXT NOT NULL,
  tag_class TEXT,
  icon TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  attendance_status TEXT DEFAULT 'active',
  leave_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mistakes (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  subject TEXT NOT NULL,
  source_label TEXT,
  title TEXT NOT NULL,
  reason_text TEXT,
  excerpt TEXT,
  solution_detail TEXT,
  image_url TEXT,
  cleared INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_scores (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  exam_period TEXT NOT NULL,
  subject TEXT NOT NULL,
  score REAL NOT NULL,
  full_score REAL NOT NULL DEFAULT 100,
  trend_text TEXT,
  score_card_image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_assets (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  category TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  content_type TEXT,
  file_size INTEGER,
  ocr_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default demo accounts if not exist
INSERT OR IGNORE INTO users (account, student_name, grade_class, role, target_goal)
VALUES 
  ('lizihan', '李子涵', '初二 (3) 班', 'student', '稳步攻克数理压轴题 · 坚持每晚15分钟中考体育打卡'),
  ('parent_li', '李子涵', '初二 (3) 班', 'parent', '静默伴学不焦虑 · 周末错题清账与学情复盘');
