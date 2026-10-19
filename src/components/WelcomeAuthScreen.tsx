import React, { useState } from 'react';

export interface UserAccountProfile {
  account: string;
  studentName: string;
  gradeClass: string;
  role: 'student' | 'parent';
  targetGoal: string;
}

interface WelcomeAuthScreenProps {
  onAuthenticated: (profile: UserAccountProfile, isNewRegistration: boolean) => void;
  currentProfile?: UserAccountProfile | null;
  onCancelSwitch?: () => void;
}

interface StoredAccount extends UserAccountProfile {
  password: string;
}

const STORAGE_ACCOUNTS_KEY = 'warm_desk_registered_accounts_v1';
const STORAGE_KEY_DESK_SETTINGS = 'todaydesk_desk_settings_v1';
const STORAGE_KEY_REMEMBER_CREDENTIALS = 'todaydesk_remember_credentials_v1';
const STORAGE_KEY_LAST_LOGIN_ACCOUNT = 'todaydesk_last_login_account_v1';
const STORAGE_KEY_LAST_LOGIN_PASSWORD = 'todaydesk_last_login_password_v1';

function getActivePresetInfo(): { studentName: string; gradeClass: string } {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DESK_SETTINGS) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.studentName || parsed?.gradeClass) {
        return {
          studentName: parsed.studentName || '李子涵',
          gradeClass: parsed.gradeClass || '初二 (3) 班',
        };
      }
    }
  } catch {}
  return { studentName: '李子涵', gradeClass: '初二 (3) 班' };
}

const DEFAULT_DEMO_ACCOUNTS: StoredAccount[] = [
  {
    account: 'lizihan',
    password: '123456',
    studentName: '李子涵',
    gradeClass: '初二 (3) 班',
    role: 'student',
    targetGoal: '稳步攻克数理压轴题 · 坚持每晚15分钟中考体育打卡',
  },
  {
    account: 'parent_li',
    password: '123456',
    studentName: '李子涵',
    gradeClass: '初二 (3) 班',
    role: 'parent',
    targetGoal: '静默伴学不焦虑 · 周末错题清账与学情复盘',
  },
];

const GRADE_PRESETS = [
  '初一 (1) 班',
  '初一 (5) 班',
  '初二 (3) 班',
  '初二 (6) 班',
  '初三 (2) 班',
  '初三 (8) 班',
  '高一 (4) 班',
];

function loadStoredAccounts(): StoredAccount[] {
  const preset = getActivePresetInfo();
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ACCOUNTS_KEY) : null;
    if (!raw) {
      return DEFAULT_DEMO_ACCOUNTS.map((a) => ({
        ...a,
        studentName: preset.studentName,
        gradeClass: preset.gradeClass,
      }));
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((a: StoredAccount) => {
        if (a.account === 'lizihan' || a.account === 'parent_li') {
          return {
            ...a,
            studentName: preset.studentName,
            gradeClass: preset.gradeClass,
          };
        }
        return a;
      });
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_DEMO_ACCOUNTS.map((a) => ({
    ...a,
    studentName: preset.studentName,
    gradeClass: preset.gradeClass,
  }));
}

function saveStoredAccounts(accounts: StoredAccount[]) {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage errors
  }
}

export const WelcomeAuthScreen: React.FC<WelcomeAuthScreenProps> = ({
  onAuthenticated,
  currentProfile,
  onCancelSwitch,
}) => {
  const [activePreset] = useState(getActivePresetInfo);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'student' | 'parent'>('student');

  // Check if user previously opted to remember credentials (defaults to true)
  const [rememberCredentials, setRememberCredentials] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REMEMBER_CREDENTIALS);
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  // Login form state: prioritize real registered user credentials over demo credentials
  const [loginAccount, setLoginAccount] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_LOGIN_ACCOUNT);
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return 'lizihan';
  });

  const [loginPassword, setLoginPassword] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_LOGIN_PASSWORD);
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return '123456';
  });

  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regAccount, setRegAccount] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regStudentName, setRegStudentName] = useState('');
  const [regGradeClass, setRegGradeClass] = useState(activePreset.gradeClass);
  const [regTargetGoal, setRegTargetGoal] = useState(
    '今日事今日毕 · 错题周末清零'
  );

  // Validation / feedback message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedAccount = loginAccount.trim();
    const trimmedPass = loginPassword.trim();

    if (!trimmedAccount) {
      setErrorMessage('请输入登录账号或手机号');
      return;
    }
    if (!trimmedPass) {
      setErrorMessage('请输入登录密码');
      return;
    }

    const accounts = loadStoredAccounts();
    const matched = accounts.find(
      (a) =>
        a.account.toLowerCase() === trimmedAccount.toLowerCase() ||
        a.studentName === trimmedAccount
    );

    if (matched) {
      if (matched.password !== trimmedPass) {
        setErrorMessage('密码不正确，请重新输入');
        return;
      }

      // Persist real registered user credentials
      try {
        if (rememberCredentials) {
          localStorage.setItem(STORAGE_KEY_REMEMBER_CREDENTIALS, 'true');
          localStorage.setItem(STORAGE_KEY_LAST_LOGIN_ACCOUNT, matched.account);
          localStorage.setItem(STORAGE_KEY_LAST_LOGIN_PASSWORD, trimmedPass);
        } else {
          localStorage.setItem(STORAGE_KEY_REMEMBER_CREDENTIALS, 'false');
          localStorage.removeItem(STORAGE_KEY_LAST_LOGIN_ACCOUNT);
          localStorage.removeItem(STORAGE_KEY_LAST_LOGIN_PASSWORD);
        }
      } catch {}

      onAuthenticated(
        {
          account: matched.account,
          studentName: matched.studentName,
          gradeClass: matched.gradeClass,
          role: matched.role,
          targetGoal: matched.targetGoal,
        },
        false
      );
      return;
    }

    // If user typed a custom account name with valid password >= 4 chars, log them in directly
    if (trimmedPass.length < 4) {
      setErrorMessage('密码长度至少为 4 位字符');
      return;
    }

    try {
      if (rememberCredentials) {
        localStorage.setItem(STORAGE_KEY_REMEMBER_CREDENTIALS, 'true');
        localStorage.setItem(STORAGE_KEY_LAST_LOGIN_ACCOUNT, trimmedAccount);
        localStorage.setItem(STORAGE_KEY_LAST_LOGIN_PASSWORD, trimmedPass);
      } else {
        localStorage.setItem(STORAGE_KEY_REMEMBER_CREDENTIALS, 'false');
        localStorage.removeItem(STORAGE_KEY_LAST_LOGIN_ACCOUNT);
        localStorage.removeItem(STORAGE_KEY_LAST_LOGIN_PASSWORD);
      }
    } catch {}

    const fallbackProfile: UserAccountProfile = {
      account: trimmedAccount,
      studentName:
        trimmedAccount === 'lizihan' ? '李子涵' : trimmedAccount,
      gradeClass: '初二 (3) 班',
      role,
      targetGoal: '保持专注节奏 · 每日作业与体育有序推进',
    };
    onAuthenticated(fallbackProfile, false);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = regStudentName.trim();
    const trimmedGrade = regGradeClass.trim();
    const trimmedAcc = regAccount.trim();
    const trimmedPass = regPassword.trim();
    const trimmedConfirm = regConfirmPassword.trim();

    if (!trimmedName) {
      setErrorMessage('请填写学生姓名（如：李子涵、张明远）');
      return;
    }
    if (!trimmedGrade) {
      setErrorMessage('请填写或选择所在年级与班级');
      return;
    }
    if (!trimmedAcc) {
      setErrorMessage('请设置登录账号或手机号');
      return;
    }
    if (trimmedPass.length < 4) {
      setErrorMessage('请设置至少 4 位登录密码');
      return;
    }
    if (trimmedConfirm && trimmedPass !== trimmedConfirm) {
      setErrorMessage('两次输入的密码不一致，请检查');
      return;
    }

    const accounts = loadStoredAccounts();
    const newEntry: StoredAccount = {
      account: trimmedAcc,
      password: trimmedPass,
      studentName: trimmedName,
      gradeClass: trimmedGrade,
      role,
      targetGoal: regTargetGoal.trim() || '今日事今日毕 · 错题周末清零',
    };

    const filtered = accounts.filter(
      (a) => a.account.toLowerCase() !== trimmedAcc.toLowerCase()
    );
    saveStoredAccounts([newEntry, ...filtered]);

    // Automatically remember the newly registered user's credentials!
    try {
      localStorage.setItem(STORAGE_KEY_REMEMBER_CREDENTIALS, 'true');
      localStorage.setItem(STORAGE_KEY_LAST_LOGIN_ACCOUNT, newEntry.account);
      localStorage.setItem(STORAGE_KEY_LAST_LOGIN_PASSWORD, newEntry.password);
    } catch {}

    onAuthenticated(
      {
        account: newEntry.account,
        studentName: newEntry.studentName,
        gradeClass: newEntry.gradeClass,
        role: newEntry.role,
        targetGoal: newEntry.targetGoal,
      },
      true
    );
  };

  const handleQuickDemoEnter = (selectedRole: 'student' | 'parent') => {
    setErrorMessage(null);
    const preset = getActivePresetInfo();
    onAuthenticated(
      {
        account: selectedRole === 'student' ? 'lizihan' : 'parent_li',
        studentName: preset.studentName,
        gradeClass: preset.gradeClass,
        role: selectedRole,
        targetGoal:
          selectedRole === 'student'
            ? '稳步攻克数理压轴题 · 坚持每晚15分钟中考体育打卡'
            : '静默伴学不焦虑 · 周末错题清账与学情复盘',
      },
      false
    );
  };

  return (
    <div
      data-testid="welcome-auth-screen"
      className="min-h-screen w-full bg-[#FDFBF7] text-on-surface flex flex-col justify-between relative overflow-x-hidden"
    >
      {/* Warm Sunlit Desk Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-28 -left-28 w-96 h-96 rounded-full bg-[#FFE4C8]/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-[#D9F0E6]/45 blur-3xl"
      />

      {/* Top Minimal Brand Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-5 pt-4 sm:pt-5 pb-2 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
              auto_stories
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-on-surface whitespace-nowrap">
                暖光伴学台 · Today
              </span>
              <span className="hidden sm:inline text-xs text-secondary font-semibold whitespace-nowrap">
                家庭静默伴学工作台
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant truncate">
              今日书桌 · 3秒快记 · 错题清账 · 周/月/季/年全科报表
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentProfile && onCancelSwitch && (
            <button
              type="button"
              onClick={onCancelSwitch}
              className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              返回书桌 ({currentProfile.studentName})
            </button>
          )}
          <button
            type="button"
            onClick={() => handleQuickDemoEnter('student')}
            className="px-3 sm:px-3.5 py-1.5 rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[15px]">bolt</span>
            <span>一键体验示范书桌</span>
          </button>
        </div>
      </header>

      {/* Center Split Welcome & Auth Card */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-6 flex items-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Warm Editorial Welcome & Feature Showcase (7 cols on Desktop) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  wb_incandescent
                </span>
                <span>点亮书桌暖灯 · 告别鸡飞狗跳的催作业日常</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-bold text-on-surface tracking-tight leading-tight">
                欢迎来到属于你与家人的
                <span className="text-primary block sm:inline">
                  {' '}
                  静默成长伴学书桌
                </span>
              </h1>

              <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-xl">
                专为中学家庭打造的温度感作业、体育锻炼与全科成绩档案台。无需繁琐打字，3秒记录今日待办、灵活管理兴趣班请假顺延，自动汇总周/月/季/年全科学情报表。
              </p>
            </div>

            {/* 4 Key Value Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-[#EAE4DA] shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">
                    timer
                  </span>
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-on-surface">
                    3秒免打字快记 & 番茄钟
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    内置语数英物化历地生道法及自定义学科，体育支持 5~45 分钟快捷计时打卡。
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-[#EAE4DA] shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">
                    event_repeat
                  </span>
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-on-surface">
                    固定/机动日程 & 请假顺延
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    区分每周固定与不固定兴趣班，老师请假或自己请假一键标记顺延不漏课。
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-[#EAE4DA] shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">
                    analytics
                  </span>
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-on-surface">
                    周/月/季/年视图与全科报表
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    支持 90/100/120/150 自定义满分，多维度对照作业投入时长与考试得分率。
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-[#EAE4DA] shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5EFE6] text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">
                    family_star
                  </span>
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-on-surface">
                    周末错题清账 & AI 学情周报
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    平时错题拍照归档，周末集中重做销项，一键生成温和有据的家庭复盘周报。
                  </p>
                </div>
              </div>
            </div>

            {/* Quick One-Tap Role Demo Strip */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-[#EAE4DA] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  verified_user
                </span>
                <div className="text-xs">
                  <span className="font-bold text-on-surface">
                    免输入快速体验通道：
                  </span>
                  <span className="text-on-surface-variant">
                    直接以「{activePreset.studentName} · {activePreset.gradeClass}」数据快速进入书桌
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoEnter('student')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-primary-fixed text-primary border border-[#EAE4DA] text-xs font-bold cursor-pointer transition-colors"
                >
                  🧑‍🎓 学生身份体验
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoEnter('parent')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-secondary-container text-secondary border border-[#EAE4DA] text-xs font-bold cursor-pointer transition-colors"
                >
                  👨‍👩‍👧 家长身份体验
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Login & Registration Card (5 cols on Desktop) */}
          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-[0_12px_36px_rgba(42,24,0,0.08)] border border-[#EAE4DA] space-y-5">
              {/* Segmented Switcher: 登录已有书桌 vs 注册新书桌 */}
              <div className="flex p-1 rounded-2xl bg-surface-container">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  登录已有书桌
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  注册新家庭书桌
                </button>
              </div>

              {/* Identity Role Selector */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-on-surface-variant block">
                  选择当前伴学身份：
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === 'student'
                        ? 'bg-primary-fixed/40 border-primary text-primary'
                        : 'bg-surface-container-low border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      school
                    </span>
                    <span>学生本人使用</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('parent')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === 'parent'
                        ? 'bg-secondary-container/60 border-secondary text-secondary'
                        : 'bg-surface-container-low border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      supervisor_account
                    </span>
                    <span>家长静默伴学</span>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0">
                    error
                  </span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {authMode === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-on-surface">
                      登录账号 / 学生姓名
                    </span>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined text-[18px] text-outline absolute left-3">
                        person
                      </span>
                      <input
                        type="text"
                        aria-label="登录账号"
                        value={loginAccount}
                        onChange={(e) => setLoginAccount(e.target.value)}
                        placeholder="请输入账号或学生姓名（如：lizihan）"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container-low border border-[#EAE4DA] text-sm font-medium text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-on-surface">
                        登录密码
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        示范账号：lizihan / 密码：123456
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined text-[18px] text-outline absolute left-3">
                        lock
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        aria-label="登录密码"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="请输入密码"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-surface-container-low border border-[#EAE4DA] text-sm font-medium text-on-surface focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 text-outline hover:text-on-surface cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </label>

                  {/* Remember credentials & Quick Demo option */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-on-surface-variant hover:text-on-surface">
                      <input
                        type="checkbox"
                        checked={rememberCredentials}
                        onChange={(e) => setRememberCredentials(e.target.checked)}
                        className="rounded border-[#EAE4DA] text-primary focus:ring-primary w-4 h-4 cursor-pointer accent-primary"
                      />
                      <span className="font-medium">记住登录名和密码</span>
                    </label>

                    {loginAccount !== 'lizihan' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLoginAccount('lizihan');
                          setLoginPassword('123456');
                        }}
                        className="text-[11px] text-outline hover:text-primary transition-colors cursor-pointer"
                      >
                        切为示范账号
                      </button>
                    ) : (
                      <span className="text-[11px] text-outline">
                        示范账号已填入
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      login
                    </span>
                    <span>点亮台灯 · 进入今日书桌</span>
                  </button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setErrorMessage(null);
                      }}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      还没有专属家庭书桌？点击立即注册 →
                    </button>
                  </div>
                </form>
              ) : (
                /* REGISTER FORM */
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-on-surface">
                        学生姓名 *
                      </span>
                      <input
                        type="text"
                        aria-label="注册学生姓名"
                        value={regStudentName}
                        onChange={(e) => setRegStudentName(e.target.value)}
                        placeholder="如：陈思源"
                        className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-[#EAE4DA] text-sm font-medium text-on-surface focus:outline-none focus:border-primary"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-on-surface">
                        所在年级班级 *
                      </span>
                      <input
                        type="text"
                        aria-label="注册所在年级班级"
                        value={regGradeClass}
                        onChange={(e) => setRegGradeClass(e.target.value)}
                        placeholder="如：初二 (3) 班"
                        className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-[#EAE4DA] text-sm font-medium text-on-surface focus:outline-none focus:border-primary"
                      />
                    </label>
                  </div>

                  {/* Quick Grade Class Selector */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-outline">快捷选班：</span>
                    {GRADE_PRESETS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setRegGradeClass(g)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                          regGradeClass === g
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-on-surface">
                      设置登录账号 / 手机号 *
                    </span>
                    <input
                      type="text"
                      aria-label="设置登录账号"
                      value={regAccount}
                      onChange={(e) => setRegAccount(e.target.value)}
                      placeholder="字母、数字或手机号（如：chensiyuan）"
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-[#EAE4DA] text-sm font-medium text-on-surface focus:outline-none focus:border-primary"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-on-surface">
                        设置密码 *
                      </span>
                      <input
                        type="password"
                        aria-label="设置密码"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="至少 4 位字符"
                        className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-[#EAE4DA] text-sm font-medium text-on-surface focus:outline-none focus:border-primary"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-on-surface">
                        确认密码
                      </span>
                      <input
                        type="password"
                        aria-label="确认密码"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="再次输入密码"
                        className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-[#EAE4DA] text-sm font-medium text-on-surface focus:outline-none focus:border-primary"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-on-surface">
                      本学期伴学寄语 / 小目标（选填）
                    </span>
                    <input
                      type="text"
                      aria-label="本学期伴学小目标"
                      value={regTargetGoal}
                      onChange={(e) => setRegTargetGoal(e.target.value)}
                      placeholder="如：今日事今日毕 · 错题周末清零"
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-[#EAE4DA] text-xs font-medium text-on-surface focus:outline-none focus:border-primary"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-secondary hover:bg-secondary/90 text-on-secondary text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      how_to_reg
                    </span>
                    <span>完成注册 · 创建专属伴学书桌</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Warm Footer */}
      <footer className="w-full max-w-6xl mx-auto px-5 py-4 text-center sm:flex sm:items-center sm:justify-between text-xs text-on-surface-variant border-t border-[#EAE4DA]/60 relative z-10">
        <span>暖光伴学台 · 家庭静默伴学与全科成长档案</span>
        <span>支持多学科自定义 · 固定/机动兴趣班请假管理 · 周/月/季/年全科报表</span>
      </footer>
    </div>
  );
};
