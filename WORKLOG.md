# TodayDesk (今日书桌) 研发工作日志 (Worklog)

## 2026-10-20
### 核心功能迭代与用户体验减法理顺
1. **首屏视觉噪音减法与去冗余**：
   - 彻底移除了首屏重复 3~4 次的「导课表识学科」、「体育与课余设置」、「AI家庭周报」与双重标签切换器，顶部栏仅保留简洁的核心导航与设置按钮，将黄金视口完整归还给今晚核心学习任务。
   - 桌面端悬浮胶囊栏在 `lg` 宽屏下自动隐藏（`lg:hidden`），彻底消除遮挡左侧作业卡片时长与同右侧常驻快记面板重叠的问题；移动端/平板端保留便捷快记浮岛。
   - 将常驻展开的 6 档预计耗时按钮重构为紧凑胶囊 `🕒 预计 30分钟 [+15m] [调档 ▾]`，单卡片纵向高度压缩约 35%，首屏一屏即可轻松浏览今晚全部作业。

2. **固定日程与今日作业梳理解耦**：
   - 彻底剔除了与顶部日程完全重叠的重复体育作业项，以物理实验导学作业填补，规避双轨重复打卡困惑。
   - 周末特长与非当日习惯（如周六象棋对弈/器乐练习）收纳至「周末特长与课余活动」折叠卡片中，避免周中无谓焦虑；横向滚动截断优化为响应式 2×2 网格布局。

3. **学生专注视角与家长静默伴学视角分化**：
   - 顶栏提供视角快速切换器：`🧑‍🎓 学生本人` 与 `👨‍👩‍👧 家长伴学`。
   - 学生模式聚焦番茄钟心流倒计时、完成解压烟花动效、连胜火焰与正向激励。
   - 家长伴学模式在任务列表上方呈现静默伴学看板（总耗时完成进度条、预计完成具体时刻），并支持「💬 发送暖心鼓励便签」，学生书桌端以 `📌 家长暖心便签` 醒目呈现并支持一键 `[收到 ❤️]` 互动闭环。

4. **课表智能联动与学科自动排序**：
   - 右侧「3秒免打字快记」面板根据当日课表自动将今日有课的学科置顶排列，并高亮标注入库「今日有课」徽标。
   - 智能比对次日课表，生成「💡 明日有 历史、物理，建议今晚安排15分钟微预习」建议栏与一键加入书桌操作。

5. **作业复盘与实际耗时深度追踪**：
   - 理顺了「今日完成打卡」与「昨日作业小复盘」的时间闭环：当晚专注作业完成与实际用时追踪；次日对照学校作业本批改结果3秒快评（老师批改全对 / 小错已改 / 拍照收录错题）。
   - 引入 `actualMinutes` 实际用时记录与对比徽章（`⚡ 提前 Xm` / `🎯 分秒不差` / `⏱️ 超时 +Xm`），并支持在编辑弹窗中灵活调整，培养初中生精准时间感。

6. **真实学校课表明道识别与 A4 打印导出**：
   - 接入 Gemini Multimodal Vision 真实课表视觉解析引擎，精准提取学校班级、作息节次与教师信息（内置成都市棕北中学 七.6班实测模版）。
   - 课表支持合并不动产式的每日体育锻炼与周末兴趣班，提供纯净高对比度 A4 横向纸质排版与 PDF 导出打印功能（`window.print()`）。

### 验证结果
- 单元测试（`npm test`）：9/9 测试用例全部通过（0 失败，0 告警）。
- 构建发布（`npm run build`）：生产打包 0 错误编译通过。

### 代码提交溯源
- **Commit ID**: `f46af4a`
- **提交信息**: `fix(desk): 修复课表学科数组解构与日期字段别名导致的白屏崩溃问题、完善类型防御并重新发布`

### 深度全景优化与架构跃升 (2026-10-20 13:50)
1. **P0 · Cloudflare D1 边缘多表全量闭环双向同步**：
   - 彻底打通 `routine_schedules`（固定与机动日程、请假备忘）、`exam_scores`（各考期考试卡片）批量 Upsert 语句，与现有 `homework_tasks`、`mistake_items` 并行写入边缘 D1 数据库。
   - `GET /api/sync` 全量下发 6 大数据表并还原字段；修复图片直传 R2 接口硬编码 `account: 'lizihan'` 问题，动态绑定当前登录账号。
2. **P0 · 全局温润防白屏崩溃熔断与降级保护 (`DeskErrorBoundary`)**：
   - 根组件顶层挂载专属 `DeskErrorBoundary` 错误边界，彻底告别空白屏事故。
   - 发生未捕获异常时呈现暖阳书桌插画、友好重试按钮、诊断日志折叠面板以及紧急数据恢复选项。
3. **P1 · 番茄钟 Web Audio 真实心流声学节拍与全局快捷键**：
   - 引入 Web Audio 原生振荡器生成 432Hz 温暖正弦波与双音和弦：番茄钟开启滴答声、每分钟微音节拍、完成清脆报鸣与即刻完成祝贺声。
   - 支持全局桌面生产力快捷键：`Esc` 键极速关闭所有活跃弹窗/全屏遮罩；`Ctrl+K` / `Cmd+K` 快速唤起 3 秒免打字快记面板。
4. **P1 · 核心路由与重型弹窗 `React.lazy` 代码分割**：
   - 将 `InsightsArchiveView`、`DeskSettingsModal`、`TimetableImportModal`、`VoiceAndCameraModal` 等重型弹窗全面重构为异步动态加载。
   - 首屏核心 JS 主包从 573 kB 暴降 30%+ 至 397 kB，大幅降低初中生家庭弱网环境下的首屏渲染耗时 (FCP/LCP)。
5. **P2 · 错题清账总库多维学科药丸筛选器与状态过滤**：
   - 错题轮播传送带与错题总库弹窗均注入动态学科药丸（全部、数学、物理...）与错题计数徽标。
   - 新增「只看待消灭」一键过滤开关，协助学生高密度击破未消灭错题。
6. **P2 · 暖阳书桌专属 PWA 桌面/移动端渐进式 Web 应用配置**：
   - 绘制并生成原创 512x512 暖阳书桌 SVG 应用图标与 Favicon。
   - 配置 `public/manifest.json` 与 `index.html` PWA 元数据（`standalone` 模式、`#fbf9f6` 主题色与 iOS Web App 支持）。

### 验证与部署结果
- **单元测试 (`npm test`)**：9/9 测试用例全数通过。
- **类型检查 (`npm run lint`)**：`tsc --noEmit` 0 错误通过。
- **打包构建 (`npm run build`)**：代码分割完成，生产包 0 错误编译。
- **边缘发布 (`wrangler pages deploy`)**：成功部署至 Cloudflare Pages，生产域名 `https://desk.6245.cn` 实时生效。

### 紧急故障修复 (2026-10-20 02:20)
- **问题排查**：前端构建时因 `getTimetableSubjectsForDay` 返回对象解构缺失，导致 `todaySubjects.filter` 在运行时报 `TypeError`，使 React 根组件渲染中断呈现空白页；伴随 `getSystemDateInfo` 别名缺失与课表节次类型断言不严。
- **修复措施**：
  1. `src/components/QuickCapsuleSheet.tsx`：解构 `todaySubjects` 数组并严密防呆。
  2. `src/utils/studyLogic.ts`：完善 `getSystemDateInfo` 与 `shiftDate` 的入参与返回值别名兼容 (`formatted`, `weekNumber`)。
  3. `src/components/TodayHomeworkList.tsx`：安全计算 `progressPercent` 百分比。
  4. `src/components/TimetableImportModal.tsx`：完善 `TimetablePeriodDetail` 对象 `subject` 字段兼容取值。
- **验证与部署**：`tsc --noEmit` 0 错误通过；生产重新编译并推送上线 `index-OevBqKjs.js`。

### 课表二维解析、「一键清空示范数据」零残留与按日打卡流水账表升级 (2026-10-20)
- **每日作业与体育打卡按日期流水账表（支持补录漏记 & 修改错记）**：
  1. 新增 `src/components/DailyHomeworkPeLedgerSection.tsx` 并集成至「成长档案与清账」：按日期倒序展示每日完成的文化课作业、体育锻炼打卡与课余兴趣明细表。
  2. 支持按「全部记录 / 文化课作业 / 体育打卡 / 课余兴趣」与具体日期筛选检索；提供「+ 补录作业 / 体育打卡」面板（支持任选历史日期补录漏记的作业或体育打卡）与行内「修改」编辑器（支持更正日期、科目、类型、具体内容、耗时与老师核对全对状态）。
- **去繁就简：移除冗余的「学生/家长」双身份切换**：
  1. `src/components/WelcomeAuthScreen.tsx` & `src/App.tsx` & `src/components/TodayHomeworkList.tsx`：移除注册登录页的双身份选择器与顶栏视角切换按钮，统一为纯粹的家庭伴学书桌体验。
- **全站图标与字体 100% 本地化存储 & 交互细节打磨**：
  1. `index.html` & `public/favicon.svg` & `public/fonts/material-symbols-outlined.woff2`：移除外部 Google Fonts CDN 依赖，新增本地 SVG 图标与本地 Material Symbols 字体预加载；将所有弹窗中易出现缺失字形方框 `☒` 的字符 `✕` 统一替换为本地图标 `close`。
  2. `src/components/DeskSettingsModal.tsx`：修复「新增项目」与「新增体育项」按钮双加号 `+ +` 展示问题；全站弹窗支持键盘 `Esc` 键一键关闭，移除全部浏览器原生 `window.confirm`。
- **课表识别与预览表逐行对齐 & 清空示范数据零残留 & 公共示范账号隔离**：
  1. `src/utils/studyLogic.ts` & `src/components/TimetableImportModal.tsx`：确保课表文本框与下方「周一至周五课程表预览」100% 逐行真实解析对齐（保留同日重复科目、支持早读行与点击单元格微调）。
  2. `src/components/MultiPeriodReportSection.tsx` & `src/components/WeeklyReportModal.tsx` (`buildDynamicWeeklyReport`)：清空示范数据后，多维统计报表、效能评级与 AI 家庭周报全部根据真实任务与打卡动态计算，彻底消除写死假数据。
  3. `src/App.tsx` & `functions/api/sync.ts`：对公共示范账号 `lizihan` 实施本地隔离保护，避免访客清空示范数据时污染云端 D1 公共母本；独立注册账号全量读写 D1。

### 51.la 网站数据统计与访客分析集成 (2026-10-20)
- 在 `index.html` 中配置挂载 51.la 官方最新 JavaScript SDK 数据统计代码 (`id: 28PaUV5XW7ttjXGI`, `ck: 28PaUV5XW7ttjXGI`)，实现全站访客流量、停留时长与页面交互数据的实时监测与分析。

