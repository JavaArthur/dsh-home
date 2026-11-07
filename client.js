window.__ModuleLoader__.load({
  id: 'chen-home-dsh',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useContext, useSyncExternalStore } = React;
    const NS = 'chen-home';
    // Personal content and persisted values stay unchanged; only display text uses these dictionaries.
    const MESSAGES = {
      closeDialog: ['关闭弹窗', 'Close dialog'], cancel: ['取消', 'Cancel'], saving: ['保存中…', 'Saving…'], save: ['保存', 'Save'], confirmDelete: ['确认删除', 'Delete'],
      settingsTitle: ['把首页调成你的节奏', 'Make this home your own'], name: ['怎么称呼你', 'Your name'], focusMinutes: ['专注时长 · 分钟', 'Focus duration · minutes'], breakMinutes: ['休息时长 · 分钟', 'Break duration · minutes'], dailyGoal: ['每天的专注目标 · 个', 'Daily focus goal · sessions'], defaultSearch: ['默认搜索引擎', 'Default search engine'], durationNote: ['时长修改会在下一次新计时生效。正在进行的这一轮会保留。', 'Duration changes apply to the next timer. Your current session will continue.'],
      editBookmark: ['编辑快捷方式', 'Edit shortcut'], addBookmark: ['添加快捷方式', 'Add shortcut'], bookmarkName: ['名称', 'Name'], bookmarkPlaceholder: ['例如：我的知识库', 'For example: My knowledge base'], url: ['网址', 'URL'], urlPlaceholder: ['https://', 'https://'], category: ['分类', 'Category'], mark: ['图标备用文字', 'Fallback icon text'], editTask: ['编辑待办', 'Edit task'], taskTitle: ['要完成的事', 'Task'], deleteTask: ['删除待办', 'Delete task'], deleteBookmark: ['删除快捷方式', 'Delete shortcut'], deletePrompt: ['确定删除「{title}」？', 'Delete “{title}”?'],
      all: ['全部', 'All'], frequent: ['常用', 'Frequent'], learning: ['学习', 'Learning'], career: ['求职', 'Career'], projects: ['项目', 'Projects'], creation: ['创作', 'Creation'], life: ['生活', 'Life'], news: ['资讯', 'News'], google: ['Google', 'Google'], bing: ['Bing', 'Bing'], baidu: ['百度', 'Baidu'],
      tasksHeading: ['今天，做成一件事', 'Make one thing happen today'], focusHeading: ['留一段时间给专注', 'Make time to focus'], projectsHeading: ['从这里继续', 'Continue from here'], rhythmHeading: ['工作之外，也照顾自己', 'Make room for life'],
      reconnect: ['重新连接', 'Reconnect'], loading: ['正在打开你的工作台…', 'Opening your workspace…'], lateNight: ['夜深了', 'It’s getting late'], morning: ['早上好', 'Good morning'], noon: ['中午好', 'Good afternoon'], afternoon: ['下午好', 'Good afternoon'], evening: ['晚上好', 'Good evening'], greetingSeparator: ['，', ', '], greetingEnd: ['。', '.'],
      dragCard: ['拖动{title}', 'Drag {title}'], dragSort: ['拖动排序', 'Drag to reorder'], moveEarlier: ['前移{title}', 'Move {title} earlier'], moveLater: ['后移{title}', 'Move {title} later'], taskPlaceholder: ['写下下一步，而不是所有事', 'Write down the next step'], newTask: ['新待办', 'New task'], taskCategory: ['待办分类', 'Task category'], addTask: ['添加待办', 'Add task'], restoreTask: ['恢复待办：{title}', 'Restore task: {title}'], completeTask: ['完成待办：{title}', 'Complete task: {title}'], focusTask: ['专注于：{title}', 'Focus on: {title}'], editTaskLabel: ['编辑待办：{title}', 'Edit task: {title}'], deleteTaskLabel: ['删除待办：{title}', 'Delete task: {title}'], switchTaskError: ['请先结束或重置当前计时，再切换专注任务。', 'Finish or reset the current timer before switching tasks.'], tasksRemaining: ['{count} 件待办 · 一次专注一件事', '{count} tasks left · One thing at a time'], hideCompleted: ['隐藏已完成', 'Hide completed'], completedCount: ['已完成 ({count})', 'Completed ({count})'],
      pomodoro: ['POMODORO', 'POMODORO'], focus: ['专注', 'Focus'], break: ['休息', 'Break'], remainingTime: ['剩余时间 {time}', 'Time remaining {time}'], timerIdle: ['准备好就开始', 'Start when you’re ready'], timerFocus: ['正在专注', 'Focusing'], timerBreak: ['好好休息', 'Taking a break'], timerPaused: ['已暂停', 'Paused'], timerComplete: ['完成了，歇一会儿吧', 'Done. Time for a break'], breakComplete: ['休息结束', 'Break finished'], selectTask: ['选择专注任务', 'Choose a focus task'], freeFocus: ['自由专注', 'Free focus'], pause: ['暂停', 'Pause'], resume: ['继续', 'Resume'], anotherRound: ['再来一轮', 'Another round'], startFocus: ['开始专注', 'Start focus'], startBreak: ['开始休息', 'Start break'], resetTimer: ['重置计时', 'Reset timer'], resetHint: ['重置本轮，不计入完成次数', 'Reset this session without counting it as completed'], todayPrefix: ['今日 ', 'Today '], sessionsSuffix: [' 个番茄', ' focus sessions'], focusedPrefix: ['已专注 ', 'Focused for '], minutesSuffix: [' 分钟', ' minutes'],
      yourPath: ['YOUR PATH', 'YOUR PATH'], projectHint: ['点击准备对话草稿，检查后发送。让学习、求职和作品一起向前。', 'Click to prepare a conversation draft, then review and send it. Keep learning, career and creative work moving.'], lifeMatters: ['LIFE MATTERS', 'LIFE MATTERS'], addTaskLabel: ['加入待办：{title}', 'Add task: {title}'], weekDay: ['本周第 {day} 天', 'Day {day} of this week'], weekLabel: ['这一周 · 慢慢来', 'This week · Take your time'],
      emptyTasksHeading: ['给今天一个清晰的开始', 'Give today a clear start'], doneTasksHeading: ['这一段，完成得不错。', 'Nice work on this chapter.'], moveBody: ['活动一下', 'Get moving'], familyTime: ['留一点时间给家人', 'Make time for family'], windDown: ['给今天收个尾', 'Wrap up your day'],
      urlFormat: ['网址必须是完整的 http 或 https 地址。', 'The URL must be a complete http or https address.'], layoutModules: ['布局必须包含四个不同的模块。', 'The layout must contain four different cards.'], duplicateId: ['ID 不能重复。', 'IDs must be unique.'], timerState: ['计时器状态不一致。', 'The timer state is inconsistent.'], errorPath: ['（{path}）', ' ({path})'],
      brand: ['Chen Home', 'Chen Home'], tagline: ['我的工作与生活', 'My work and life'], finishLayout: ['完成调整', 'Done arranging'], editLayout: ['调整布局', 'Arrange layout'], homeSettings: ['首页设置', 'Home settings'], refresh: ['刷新', 'Refresh'], dismiss: ['关闭提示', 'Dismiss message'], searchPlaceholder: ['搜索灵感、知识，或下一步的答案', 'Search for inspiration, knowledge or your next step'], searchContent: ['搜索内容', 'Search query'], searchEngine: ['搜索引擎', 'Search engine'], search: ['搜索', 'Search'], shortcuts: ['快捷方式', 'Shortcuts'], shortcutsHeading: ['常去的地方', 'Your familiar places'], shortcutsHint: ['熟悉的入口，少一点切换', 'Familiar destinations, fewer detours'], shortcutCategories: ['快捷方式分类', 'Shortcut categories'], moveBookmarkEarlier: ['前移快捷方式：{title}', 'Move shortcut earlier: {title}'], moveBookmarkLater: ['后移快捷方式：{title}', 'Move shortcut later: {title}'], editBookmarkLabel: ['编辑快捷方式：{title}', 'Edit shortcut: {title}'], deleteBookmarkLabel: ['删除快捷方式：{title}', 'Delete shortcut: {title}'], addLink: ['添加入口', 'Add shortcut'], layoutHint: ['拖动卡片顶部的手柄，或拖动快捷方式调整顺序；也可以用前移 / 后移按钮。修改自动保存。', 'Drag card handles or shortcuts to reorder them, or use the move earlier / later buttons. Changes save automatically.'], workspace: ['我的工作台', 'My workspace'], nextQuote: ['换一句鼓励', 'Another encouragement'],
      changeBackground: ['换背景', 'Change background'], backgroundTitle: ['给首页换一处风景', 'Choose your everyday view'], backgroundHint: ['让熟悉的工作台，有一点新鲜感。', 'A fresh view for your familiar workspace.'], ocean: ['海岸', 'Coast'], forest: ['森林', 'Forest'], dusk: ['暮色', 'Dusk'], aurora: ['极光渐变', 'Aurora'], custom: ['自选图片', 'Your image'], backgroundUrl: ['图片网址 · HTTPS', 'Image URL · HTTPS'], backgroundUpload: ['上传本地图片', 'Upload an image'], backgroundUploadHint: ['PNG、JPG 或 WebP，最大 3 MiB', 'PNG, JPG or WebP, up to 3 MiB'], backgroundDim: ['背景遮罩', 'Background shade'], backgroundDimHint: ['数值越大，背景越柔和，文字越清晰。', 'A higher value softens the photo and keeps text clear.'], backgroundPreview: ['背景预览', 'Background preview'], backgroundApply: ['使用这个背景', 'Apply background'], backgroundHttps: ['图片网址必须是完整的 HTTPS 地址。', 'Enter a complete HTTPS image URL.'], backgroundFileType: ['请选择 PNG、JPG 或 WebP 图片。', 'Choose a PNG, JPG or WebP image.'], backgroundFileSize: ['图片不能超过 3 MiB。', 'The image must be no larger than 3 MiB.'], backgroundFileError: ['图片读取失败，请重新选择。', 'Could not read this image. Choose it again.'], backgroundSelectedFile: ['已选择本地图片', 'Local image selected'], backgroundLoadError: ['这张图片暂时无法显示，请检查网址或换一张。', 'This image could not load. Check its URL or choose another.'],
      workTab: ['工作台', 'Workspace'], notesTab: ['笔记时间流', 'Notes timeline'], writeNote: ['记一笔', 'Write a note'], notesKicker: ['FLOMO · 随时记录', 'FLOMO · CAPTURE THE MOMENT'], notesHeading: ['想法，值得留下', 'An idea worth keeping'], notesSubtitle: ['把一闪而过的念头，写成日后能回来的地方。', 'Give a passing thought a place to return to.'], notePlaceholder: ['此刻在想什么？\n\n记下一点观察、灵感，或今天的小收获。\n用 #标签 把想法串起来。', 'What’s on your mind?\n\nCapture an observation, an idea or a small discovery.\nConnect your thoughts with #tags.'], noteContent: ['笔记内容', 'Note content'], noteSave: ['保存到 Flomo', 'Save to Flomo'], noteSaving: ['正在保存…', 'Saving…'], noteDraft: ['草稿仅保存在这台设备', 'Draft saved on this device'], noteDraftMemory: ['草稿暂存于当前页面', 'Draft kept in this page'], noteStorageUnavailable: ['无法保存本地提交状态，本次尚未发送。请允许本地存储或复制草稿后重试。', 'The local submission state could not be saved. Nothing was sent. Allow local storage or copy your draft before trying again.'], noteSaved: ['已保存到 Flomo', 'Saved to Flomo'], noteCharacters: ['{count} 字', '{count} characters'], noteUnknown: ['保存结果尚不确定，草稿已保留。请先刷新时间流，确认是否已保存，再决定是否重试。', 'The save outcome is unknown. Your draft is kept. Refresh the timeline and check for the note before trying again.'], noteCheckAgain: ['我已核对，继续编辑', 'I checked · continue editing'], noteCheckHint: ['已刷新，请先查看最新笔记，避免重复保存。', 'Refreshed. Check the latest notes to avoid saving twice.'], notesSearch: ['搜索笔记', 'Search notes'], notesSearchPlaceholder: ['搜索想法、关键词…', 'Search ideas, keywords…'], notesRefresh: ['刷新时间流', 'Refresh timeline'], notesLoading: ['正在读取你的笔记…', 'Loading your notes…'], notesLoadMore: ['加载更早的笔记', 'Load earlier notes'], notesEnd: ['已读到这一段的起点', 'You’ve reached the start of this chapter'], notesEmpty: ['这里还没有笔记', 'No notes here yet'], notesEmptyHint: ['从左侧记下第一笔，让想法慢慢积累。', 'Write your first note and let your ideas grow.'], notesNoResults: ['没有找到匹配的笔记', 'No matching notes'], notesNoResultsHint: ['换个关键词，或清除标签后再看看。', 'Try another keyword or clear the tag filter.'], notesClear: ['清除筛选', 'Clear filters'], notesOriginal: ['查看原文', 'Open in Flomo'], notesReadFull: ['展开全文', 'Read full note'], notesReading: ['读取中…', 'Loading…'], notesCollapse: ['收起', 'Collapse'], notesToday: ['今天', 'Today'], notesYesterday: ['昨天', 'Yesterday'], notesCount: ['已显示 {count} 条', '{count} notes shown'], notesSynced: ['更新于 {time}', 'Updated {time}'], notesAll: ['所有笔记', 'All notes'], notesTag: ['标签：{tag}', 'Tag: {tag}'], noteImage: ['笔记图片', 'Note image'],
      todayOverview: ['今天的节奏', 'Today at a glance'], pendingTasks: ['待办', 'To do'], taskUnit: ['件', 'tasks'], todayFocus: ['今日番茄', 'Focus sessions'], goToTimer: ['前往专注计时', 'Go to focus timer'], dailyDirection: ['学习、求职、作品与日常', 'Learning, career, work & life'], dailyDirectionHint: ['从熟悉的入口出发，把下一步做扎实。', 'Your familiar places, and one clear next step.'], lateNightSubtitle: ['今天已经很努力了，也记得好好休息。', 'You have done enough today. Make room for rest.'], daySubtitle: ['把想法变成作品，把日子过成喜欢的样子。', 'Turn ideas into work, and make time for the life you want.'],
      notesPaginationLimit: ['Flomo 每天最多返回 50 条笔记，这一天可能还有未显示的内容。请到 Flomo 查看完整记录。', 'Flomo returns up to 50 notes per day. This day may have more notes; open Flomo to see the full record.'],
      flomoConnect: ['连接 Flomo', 'Connect Flomo'], flomoReconnect: ['重新连接 Flomo', 'Reconnect Flomo'], flomoConnectHint: ['连接后，在这里记录新想法，也能回看自己的笔记。', 'Connect to capture new ideas and revisit your notes here.'], flomoToken: ['Flomo 访问令牌', 'Flomo access token'], flomoTokenHint: ['令牌仅交给本机服务保存，连接成功后输入框会清空。', 'The token is saved by the local service. This field clears after connecting.'], flomoConnecting: ['正在连接…', 'Connecting…'], flomoConnected: ['已连接 Flomo', 'Connected to Flomo'], flomoUnavailable: ['暂时无法读取 Flomo，请刷新重试。', 'Could not read Flomo. Refresh and try again.'],
      serviceUnavailable: ['服务暂时不可用，请重试。', 'Service temporarily unavailable. Please try again.'], requestFailed: ['请求失败 ({status})', 'Request failed ({status})'], connectTimeout: ['连接超时，请稍后重试。', 'Connection timed out. Please try again later.'], saveTimeout: ['保存超时，请刷新检查后重试。', 'Saving timed out. Refresh to check before trying again.'],
      invalidUrl: ['请输入完整的 http 或 https 网址。', 'Enter a complete http or https URL.'], urlProtocol: ['网址仅支持 http 和 https。', 'Only http and https URLs are supported.'], urlLength: ['网址不能超过 2048 个字符。', 'URLs cannot exceed 2048 characters.'], taskMissing: ['任务不存在，请刷新后重试。', 'Task not found. Refresh and try again.'], bookmarkMissing: ['书签不存在，请刷新后重试。', 'Bookmark not found. Refresh and try again.'], taskLimit: ['最多保存 200 个任务。', 'You can save up to 200 tasks.'], bookmarkLimit: ['最多保存 60 个书签。', 'You can save up to 60 bookmarks.'], bookmarkPosition: ['书签目标位置超出范围。', 'The bookmark position is out of range.'], timerTaskConflict: ['专注进行中，请先暂停再更换关联任务。', 'Pause the focus timer before changing its task.'], timerStale: ['只有当前已到时的运行中计时器可以完成，请刷新状态。', 'Only the current elapsed running timer can finish. Refresh the status.'], staleData: ['页面数据已更新，请刷新后重试。', 'The page data has changed. Refresh and try again.'], invalidJson: ['请求必须是有效的 JSON 对象。', 'The request must be a valid JSON object.'], invalidMethod: ['仅支持 GET 和 POST。', 'Only GET and POST are supported.'], storageError: ['主页数据读取或保存失败，请稍后重试。', 'Could not load or save home data. Please try again later.'], invalidParameters: ['参数无效{path}：{message}', 'Invalid parameters{path}: {message}'], networkError: ['网络请求失败，请检查连接后重试。', 'Network request failed. Check your connection and try again.'],
    };
    const LocaleContext = React.createContext(null);
    function LocaleProvider({ ctx, children }) {
      const subscribe = useCallback((listener) => ctx.locale.subscribe(listener), [ctx]);
      const getSnapshot = useCallback(() => ctx.locale.getSnapshot(), [ctx]);
      const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
      const value = useMemo(() => {
        const translate = ctx.locale.bind(NS);
        return { active: snapshot.active, t: (key, values = {}) => translate(key).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match) };
      }, [ctx, snapshot]);
      return h(LocaleContext.Provider, { value }, children);
    }
    const useLocale = () => useContext(LocaleContext);
    const AREAS = ['学习', '求职', '项目', '创作', '生活', '资讯'];
    const LABELS = { 全部: 'all', 常用: 'frequent', 学习: 'learning', 求职: 'career', 项目: 'projects', 创作: 'creation', 生活: 'life', 资讯: 'news', google: 'google', bing: 'bing', baidu: 'baidu' };
    const displayLabel = (value, t) => Object.hasOwn(LABELS, value) ? t(LABELS[value]) : value;
    function displayError(message, t) {
      if (Object.hasOwn(MESSAGES, message)) return t(message);
      const key = Object.keys(MESSAGES).find((key) => MESSAGES[key][0] === message);
      if (key) return t(key);
      const status = /^请求失败 \((\d+)\)$/.exec(message);
      if (status) return t('requestFailed', { status: status[1] });
      const invalid = /^参数无效(?:（(.*?)）)?：(.*)$/.exec(message);
      if (invalid) return t('invalidParameters', { path: invalid[1] ? t('errorPath', { path: invalid[1] }) : '', message: displayError(invalid[2], t) });
      if (['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.'].includes(message)) return t('networkError');
      return message;
    }
    const TITLES = { tasks: 'tasksHeading', focus: 'focusHeading', projects: 'projectsHeading', rhythm: 'rhythmHeading' };
    const QUOTES = ['把注意力放回下一步，今天就会往前一点。', '不必一下子走很远，先把眼前这一小段走扎实。', '学习留下作品，行动带来答案。', '认真做事，也给生活留一点空白。', '允许慢一点，只要还在向前。'];
    const PROJECTS = [
      ['AG', 'Agent 实战', 'LangGraph · 跑通一个小实验', 'mindos-langgraph-lab', '帮我继续 Agent 实战学习。先检查 /Volumes/Storage/ai/30-projects/mindos-langgraph-lab 的 README、AGENTS.md 和当前工作区，再建议一个能在 25 分钟内完成的小实验。'],
      ['CV', '面试与求职', '把经历变成有说服力的案例', 'interview-lab', '帮我准备今天的面试练习。先检查 /Volumes/Storage/ai/30-projects/interview-lab 的现有材料，围绕 Java 后端转 AI Agent 选择一个问题，先问我再点评。'],
      ['N', '我的知识库', 'chen-notes · 学到的，留下来', 'chen-notes', '帮我整理一条今天学到的知识。先读取 /Volumes/Storage/ai/30-projects/chen-notes 的项目约定，再和我确认本次要整理的内容。'],
      ['S', '创作工作室', '把想法做成可以分享的作品', 'channing-studio', '帮我继续创作项目。先检查 /Volumes/Storage/ai/30-projects/channing-studio 的 README、AGENTS.md 与现有状态，再建议一个下一步。'],
    ];
    const css = `
.ch-home{--ch-bg:var(--dsw-alias-bg-base);--ch-card:var(--dsw-alias-bg-layer-1);--ch-layer:var(--dsw-alias-bg-layer-2);--ch-ink:var(--dsw-alias-label-primary);--ch-muted:var(--dsw-alias-label-secondary);--ch-line:var(--dsw-alias-border-l1);--ch-accent:var(--dsw-alias-brand-primary);--ch-green:var(--dsw-alias-state-success-primary);--ch-warm:var(--dsw-alias-state-warn-primary);--ch-glass:color-mix(in srgb,var(--ch-card) 96%,transparent);height:100%;width:100%;min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;-webkit-app-region:no-drag;color:var(--ch-ink);background:var(--ch-bg);background-size:cover;background-position:center;background-attachment:scroll;font-family:inherit;font-size:14px;line-height:1.5;position:relative;isolation:isolate;container-type:inline-size}
.ch-home *{box-sizing:border-box}
.ch-home [hidden]{display:none!important}
.ch-home :where(button,input,select,textarea){font:inherit}
.ch-home button,.ch-home a{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.ch-home :where(button){cursor:pointer;color:inherit}
.ch-home button:disabled{opacity:.48;cursor:default}
.ch-home :is(button,a,input,select,textarea):focus-visible{outline:2px solid var(--ch-accent);outline-offset:3px}
.ch-home a{color:inherit;text-decoration:none}
.ch-home :is(button,input,select,textarea){transition:background .16s,border-color .16s,box-shadow .16s}
.ch-home :is(input,select,textarea){color:var(--ch-ink);background:var(--ch-bg);border:1px solid var(--ch-line);border-radius:9px;padding:10px 12px;min-width:0}
.ch-home :is(input,textarea)::placeholder{color:var(--ch-muted);opacity:1}
.ch-home textarea{resize:vertical}
.ch-sky{position:absolute;inset:0 0 auto;height:480px;pointer-events:none;z-index:-1;background:radial-gradient(ellipse at 12% 0%,color-mix(in srgb,var(--ch-green) 8%,transparent),transparent 70%)}
.ch-photo .ch-sky{display:none}
.ch-wrap{max-width:1280px;margin:0 auto;padding:24px 40px 28px}
.ch-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 14px;background:var(--ch-glass);border:1px solid var(--ch-line);border-radius:14px;backdrop-filter:blur(16px)}
.ch-wordmark{display:flex;gap:10px;align-items:center;font-size:16px;font-weight:650;letter-spacing:-.025em;white-space:nowrap}
.ch-brand-dot{height:30px;width:30px;background:color-mix(in srgb,var(--ch-green) 12%,var(--ch-card));color:var(--ch-green);display:grid;place-items:center;border-radius:9px}
.ch-wordmark small{font-weight:400;font-size:12px;color:var(--ch-muted);margin-left:8px;letter-spacing:0}
.ch-actions{display:flex;gap:7px;align-items:center}
.ch-btn{border:1px solid var(--ch-line);border-radius:9px;min-height:36px;padding:8px 12px;background:var(--ch-card);font-size:12px;line-height:1.3;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap}
.ch-btn:hover{background:var(--ch-layer);border-color:color-mix(in srgb,var(--ch-muted) 45%,var(--ch-line))}
.ch-btn.ch-active{border-color:var(--ch-accent);color:var(--ch-accent)}
.ch-iconbtn{display:inline-grid;place-items:center;flex:none;width:32px;height:32px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--ch-muted)}
.ch-iconbtn:hover{background:var(--ch-layer);color:var(--ch-ink)}
.ch-primary{border:1px solid var(--ch-accent);background:var(--ch-accent);color:var(--ch-bg)!important;font-weight:600}
.ch-primary:hover{border-color:var(--ch-accent);background:color-mix(in srgb,var(--ch-accent) 87%,var(--ch-ink))}
.ch-viewbar{display:flex;align-items:center;justify-content:center;min-width:0;margin:0;padding:0}
.ch-topbar{margin-bottom:18px}
.ch-viewbar .ch-view-hint{display:none}
.ch-view-tabs{display:flex;gap:20px}
.ch-view-tabs button{position:relative;display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 12px 12px;border:0;background:transparent;color:var(--ch-muted);font-size:13px;font-weight:600}
.ch-view-tabs .ch-selected{color:var(--ch-ink)}
.ch-view-tabs .ch-selected:after{content:'';position:absolute;height:2px;bottom:-1px;inset-inline:10px;background:var(--ch-accent);border-radius:2px}
.ch-view-hint{font-size:11px;color:var(--ch-muted)}
.ch-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px 32px;align-items:center;padding:20px 24px;margin-bottom:18px;background:var(--ch-glass);border:1px solid var(--ch-line);border-radius:14px;backdrop-filter:blur(16px)}
.ch-time{font-size:11px;color:var(--ch-muted);display:flex;align-items:center;gap:10px;font-variant-numeric:tabular-nums}
.ch-live-dot{width:4px;height:4px;border-radius:50%;background:var(--ch-green)}
.ch-hero h1{font-size:clamp(25px,3cqw,32px);font-weight:600;letter-spacing:-.035em;line-height:1.3;margin:8px 0 6px}
.ch-hero h1 em{font-style:normal;color:var(--ch-ink)}
.ch-subtitle{font-size:12px;color:var(--ch-muted);margin:0;line-height:1.7}
.ch-day-summary{display:flex;gap:28px;margin:0;align-items:center}
.ch-day-summary div{min-width:76px;padding-left:22px;border-left:1px solid var(--ch-line)}
.ch-day-summary dt{font-size:11px;color:var(--ch-muted);margin-bottom:4px}
.ch-day-summary dd{margin:0;font-size:28px;font-weight:550;font-variant-numeric:tabular-nums;line-height:1.3;letter-spacing:-.035em}
.ch-day-summary small{font-size:13px;font-weight:400;color:var(--ch-muted);letter-spacing:0;margin-left:5px}
.ch-summary-focus{display:flex;align-items:center;gap:8px;border:0;border-radius:5px;padding:0;min-height:36px;background:transparent;color:var(--ch-ink);font:inherit;font-variant-numeric:tabular-nums;letter-spacing:inherit}
.ch-summary-focus:hover{color:var(--ch-accent)}
.ch-summary-focus svg{color:var(--ch-muted)}
.ch-utility{display:flex;align-items:center;gap:16px;justify-content:space-between;margin:0 0 14px}
.ch-search{display:flex;align-items:center;gap:10px;flex:1;max-width:none;padding:4px 5px 4px 12px;border:1px solid var(--ch-line);border-radius:10px;background:var(--ch-card)}
.ch-search input{flex:1;border:0;background:transparent;padding:7px 0;font-size:12px;width:0}
.ch-search select{max-width:76px;font-size:11px;border:0;background:transparent;padding:6px 2px}
.ch-search button{width:30px;min-height:30px;border-radius:7px;padding:0}
.ch-shortcuts{padding:14px 18px 12px;margin:0 0 18px;background:var(--ch-glass);border:1px solid var(--ch-line);border-radius:14px;backdrop-filter:blur(16px)}
.ch-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.ch-section-label{font-size:12px;font-weight:600;flex:none}
.ch-section-label span{font-weight:400;color:var(--ch-muted);margin-left:8px;font-size:11px}
.ch-tabs{display:flex;gap:3px;overflow-x:auto;scrollbar-width:thin;min-width:0}
.ch-tab{font-size:11px;min-height:30px;padding:5px 10px;border-radius:6px;border:0;color:var(--ch-muted);background:transparent;white-space:nowrap}
.ch-tab.ch-selected{color:var(--ch-ink);background:var(--ch-layer);font-weight:600}
.ch-link-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
.ch-link{position:relative;min-width:0;border:1px solid transparent;border-radius:9px;text-align:center;padding:8px 3px}
.ch-link a{display:flex;align-items:center;justify-content:flex-start;gap:8px;min-width:0}
.ch-link:hover{background:var(--ch-layer)}
.ch-link-mark{display:grid;place-items:center;flex:none;width:32px;height:32px;background:var(--ch-card);color:var(--ch-accent);border:1px solid var(--ch-line);border-radius:9px;font-size:13px;font-weight:600;padding:5px}
.ch-link-mark img{width:100%;height:100%;object-fit:contain;border-radius:4px}
.ch-link-name{font-size:11px;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.ch-link-controls{display:flex;justify-content:center;margin-top:8px;flex-wrap:wrap}
.ch-link-controls button{width:30px;height:30px}
.ch-link-add{border:1px dashed var(--ch-line);background:transparent;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--ch-muted)!important;min-height:48px}
.ch-link-add:hover{border-color:var(--ch-accent)}
.ch-edit-link{border:1px dashed var(--ch-line)}
.ch-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;align-items:stretch}
.ch-card{border:1px solid var(--ch-line);border-radius:14px;background:var(--ch-glass);overflow:hidden;min-width:0;backdrop-filter:blur(16px)}
.ch-card-head{display:flex;align-items:center;gap:10px;padding:20px 22px 0}
.ch-card-head h2{font-size:16px;font-weight:600;letter-spacing:-.02em;line-height:1.4;flex:1;margin:0}
.ch-card-symbol{color:var(--ch-green);display:flex}
.ch-card-badge{font-size:10px;color:var(--ch-muted);font-variant-numeric:tabular-nums;letter-spacing:.04em;white-space:nowrap}
.ch-card-body{padding:18px 22px 20px}
.ch-dragbar{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:var(--ch-layer);border-bottom:1px dashed var(--ch-line);font-size:11px;color:var(--ch-muted)}
.ch-handle{cursor:grab!important;border:0;background:transparent;display:flex;gap:5px;align-items:center;font-size:11px;min-height:32px;color:var(--ch-accent)!important}
.ch-handle:active{cursor:grabbing!important}
.ch-drop{outline:2px dashed var(--ch-accent);outline-offset:2px}
.ch-dragging{opacity:.45}
.ch-taskform{display:flex;gap:7px}
.ch-taskform input{flex:1;font-size:13px;padding:10px}
.ch-taskform select{font-size:12px;max-width:70px;padding:8px 5px}
.ch-taskform .ch-btn{padding:8px 11px}
.ch-tasklist{margin:14px 0 0;padding:0;list-style:none;max-height:320px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}
.ch-task{display:grid;grid-template-columns:20px minmax(0,1fr) auto;column-gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--ch-line)}
.ch-task:last-child{border:0}
.ch-check{appearance:none;display:grid;place-items:center;width:18px;height:18px!important;padding:0!important;margin:0;cursor:pointer;grid-row:1/3;border:1px solid var(--ch-muted)!important;border-radius:4px!important;background:var(--ch-bg)!important}
.ch-check:checked{background:var(--ch-accent)!important;border-color:var(--ch-accent)!important}
.ch-check:checked:after{content:'';width:5px;height:9px;border:solid var(--ch-bg);border-width:0 2px 2px 0;transform:translateY(-1px) rotate(45deg)}
.ch-task-title{font-size:13px;line-height:1.65;overflow-wrap:anywhere;grid-column:2}
.ch-task.ch-done .ch-task-title{text-decoration:line-through;color:var(--ch-muted)}
.ch-area{font-size:10px;color:var(--ch-muted);grid-column:2;grid-row:2;line-height:1.4;margin-top:3px}
.ch-task-ops{display:flex;gap:0;grid-column:3;grid-row:1/3}
.ch-task-ops .ch-iconbtn{width:30px;height:32px}
.ch-task-ops .ch-iconbtn:first-child{color:var(--ch-accent)}
.ch-empty{padding:26px 10px 22px;text-align:left;color:var(--ch-muted);font-size:12px;line-height:1.9}
.ch-empty strong{display:block;color:var(--ch-ink);font-size:16px;font-weight:550;margin-bottom:5px}
.ch-suggestions{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}
.ch-suggestions button{font-size:11px;border:1px solid var(--ch-line);min-height:34px;padding:6px 10px;border-radius:8px;background:var(--ch-card);color:var(--ch-ink)}
.ch-task-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:16px;font-size:11px;color:var(--ch-muted)}
.ch-task-foot button{border:0;background:transparent;min-height:30px;font-size:11px;color:var(--ch-accent)}
.ch-progress{height:3px;background:var(--ch-layer);border-radius:6px;overflow:hidden}
.ch-progress span{display:block;height:100%;background:var(--ch-green);border-radius:6px;transition:width .3s}
.ch-timer-top{display:flex;justify-content:center;gap:4px}
.ch-timer-top button{border:0;border-radius:7px;background:transparent;padding:6px 16px;min-height:32px;font-size:12px;color:var(--ch-muted)}
.ch-timer-top .ch-selected{background:var(--ch-layer);color:var(--ch-ink);font-weight:600}
.ch-timer-main{display:flex;align-items:center;gap:24px;justify-content:center;padding:18px 0}
.ch-ring{flex:none;width:142px;height:142px;border-radius:50%;padding:3px;background:conic-gradient(var(--ch-accent) var(--ch-progress),var(--ch-layer) 0)}
.ch-ring-inner{height:100%;border-radius:50%;background:var(--ch-card);display:flex;flex-direction:column;align-items:center;justify-content:center}
.ch-countdown{font-size:36px;font-weight:500;letter-spacing:-.045em;font-variant-numeric:tabular-nums;line-height:1.2}
.ch-timer-status{font-size:11px;color:var(--ch-muted);margin-top:7px;text-align:center;max-width:118px}
.ch-timer-details{max-width:170px;min-width:0}
.ch-timer-details select{font-size:12px;max-width:100%;width:100%;padding:9px}
.ch-timer-details p{font-size:12px;color:var(--ch-muted);margin:10px 0 0;line-height:1.8}
.ch-timer-actions{display:flex;justify-content:center;gap:8px}
.ch-timer-actions .ch-primary{min-width:160px;min-height:40px}
.ch-focus-stats{display:flex;justify-content:space-between;gap:10px;margin-top:20px;padding-top:14px;border-top:1px solid var(--ch-line);font-size:11px;color:var(--ch-muted)}
.ch-focus-stats b{font-size:16px;color:var(--ch-ink);font-weight:550;margin-right:3px;font-variant-numeric:tabular-nums}
.ch-projects{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ch-project{display:flex;align-items:center;text-align:left;gap:12px;padding:14px 12px;border:1px solid var(--ch-line);background:var(--ch-card);border-radius:10px;min-width:0}
.ch-project:hover{background:var(--ch-layer);border-color:var(--ch-muted)}
.ch-project-mark{width:32px;height:36px;display:grid;place-items:center;flex:none;border-radius:8px;background:color-mix(in srgb,var(--ch-green) 8%,var(--ch-card));color:var(--ch-green);font-size:11px;font-weight:650}
.ch-project strong{display:block;font-size:13px;font-weight:550;line-height:1.5}
.ch-project small{font-size:11px;color:var(--ch-muted);display:block;line-height:1.65;margin-top:3px}
.ch-hint{font-size:11px;line-height:1.7;color:var(--ch-muted);margin:14px 0 0}
.ch-rhythm-list{display:flex;flex-direction:column;gap:16px}
.ch-rhythm{display:flex;gap:12px;align-items:center}
.ch-rhythm-icon{display:grid;place-items:center;width:30px;height:30px;flex:none;border-radius:9px;color:var(--ch-warm);background:color-mix(in srgb,var(--ch-warm) 8%,var(--ch-card))}
.ch-rhythm div:nth-child(2){flex:1}
.ch-rhythm strong{font-size:13px;display:block;font-weight:550}
.ch-rhythm small{font-size:11px;color:var(--ch-muted);line-height:1.7}
.ch-week{display:flex;gap:6px;padding-top:18px;margin-top:20px;border-top:1px solid var(--ch-line);align-items:center}
.ch-week span{flex:1;border-radius:5px;height:4px;background:var(--ch-layer)}
.ch-week .ch-past{background:color-mix(in srgb,var(--ch-accent) 40%,var(--ch-card))}
.ch-week .ch-today{background:var(--ch-accent)}
.ch-week small{font-size:10px;color:var(--ch-muted);margin-left:6px;white-space:nowrap}
.ch-footer{display:flex;align-items:center;justify-content:center;gap:10px;margin:24px auto 4px;padding:5px 12px;width:fit-content;border-radius:9px;background:var(--ch-glass);font-size:11px;color:var(--ch-muted);text-align:center;line-height:1.8}
.ch-footer-sign{width:fit-content;margin:auto;padding:3px 8px;border-radius:5px;background:var(--ch-glass);text-align:center;font-size:9px;letter-spacing:.1em;color:var(--ch-muted)}
.ch-banner{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--ch-card);border:1px solid var(--ch-line);border-radius:10px;font-size:12px;margin:16px 0}
.ch-banner span{flex:1;overflow-wrap:anywhere}
.ch-banner.ch-error,.ch-modal-error{color:var(--dsw-alias-state-error-primary,var(--ch-ink))}
.ch-edit-note{font-size:12px;color:var(--ch-accent);padding:12px 14px;background:var(--ch-card);border:1px dashed var(--ch-accent);border-radius:9px;margin:0 0 16px}
.ch-loading{display:grid;place-items:center;min-height:70%;color:var(--ch-muted);font-size:14px}
.ch-loading-panel{padding:32px;max-width:380px;text-align:center;border:1px solid var(--ch-line);border-radius:16px;background:var(--ch-card)}
.ch-loading-panel>svg{color:var(--ch-accent)}
.ch-loading-panel p{line-height:1.8}
.ch-modal-shade{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--ch-bg) 65%,transparent);backdrop-filter:blur(6px);padding:20px}
.ch-modal{background:var(--ch-card);border:1px solid var(--ch-line);border-radius:16px;width:440px;max-width:100%;max-height:85vh;overflow:auto;overscroll-behavior:contain;padding:24px;box-shadow:0 20px 80px color-mix(in srgb,var(--ch-ink) 12%,transparent)}
.ch-modal h2{margin:0;font-size:18px;font-weight:600;line-height:1.5}
.ch-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:22px}
.ch-fields{display:flex;flex-direction:column;gap:16px}
.ch-fields label{display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--ch-muted)}
.ch-fields label input,.ch-fields label select{width:100%;font-size:14px;min-height:42px}
.ch-field-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ch-modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:24px}
.ch-modal p{font-size:12px;color:var(--ch-muted);line-height:1.8}
.ch-modal-error{font-size:12px;margin-top:12px}
.ch-background-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ch-background-choice{padding:0;border:2px solid transparent;border-radius:11px;overflow:hidden;background:var(--ch-bg);text-align:left;position:relative}
.ch-background-choice.ch-selected{border-color:var(--ch-accent)}
.ch-background-thumb{display:block;height:80px;background-size:cover;background-position:center}
.ch-background-name{display:flex;align-items:center;justify-content:space-between;padding:9px 10px;font-size:12px;font-weight:600}
.ch-aurora-art{background:radial-gradient(ellipse at 20% 10%,color-mix(in srgb,var(--ch-green) 65%,var(--ch-bg)),transparent 70%),radial-gradient(ellipse at 90% 80%,var(--ch-accent),var(--ch-bg))}
.ch-background-preview{height:130px;border-radius:11px;overflow:hidden;position:relative;background:var(--ch-bg);display:grid;place-items:center}
.ch-background-preview img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.ch-background-preview:after{content:'';position:absolute;inset:0;background:var(--ch-bg);opacity:var(--ch-preview-dim,.2)}
.ch-background-preview span{position:relative;z-index:1;padding:8px 14px;border-radius:9px;background:var(--ch-glass);font-size:13px}
.ch-background-upload{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ch-background-upload small,.ch-background-note{color:var(--ch-muted);font-size:11px}
.ch-file-input{display:none}
.ch-background-range{display:flex;align-items:center;gap:12px}
.ch-background-range input{flex:1;accent-color:var(--ch-accent);padding:0}
.ch-background-range output{font-variant-numeric:tabular-nums;min-width:36px;text-align:right;font-size:12px}
.ch-background-note{margin:0}
.ch-notes-layout{display:grid;grid-template-columns:minmax(280px,.8fr) minmax(0,1.45fr);align-items:start;gap:24px}
.ch-note-composer{position:sticky;top:20px;border:1px solid var(--ch-line);border-radius:14px;background:var(--ch-glass);backdrop-filter:blur(16px);overflow:hidden}
.ch-note-composer-head{padding:24px 24px 18px}
.ch-note-kicker{font-size:10px;letter-spacing:.1em;color:var(--ch-green);font-weight:650;display:flex;align-items:center;gap:7px}
.ch-note-composer h2{font-size:24px;letter-spacing:-.035em;margin:12px 0 8px;font-weight:550;line-height:1.35}
.ch-note-composer-head p{font-size:12px;line-height:1.8;color:var(--ch-muted);margin:0}
.ch-note-form{padding:0 20px 20px}
.ch-home .ch-note-input{width:100%;min-height:240px;padding:16px;line-height:1.85;font-size:14px;border-color:var(--ch-line);background:var(--ch-bg);border-radius:10px}
.ch-note-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--ch-muted);padding:10px 2px 16px}
.ch-note-save{width:100%;min-height:42px}
.ch-note-feedback{font-size:12px;line-height:1.8;padding:12px 14px;border:1px solid var(--ch-line);border-radius:10px;margin:0 0 12px;overflow-wrap:anywhere;background:var(--ch-card)}
.ch-note-success{color:var(--ch-green);background:color-mix(in srgb,var(--ch-green) 7%,var(--ch-card))}
.ch-note-feedback .ch-btn{margin-top:8px;font-size:12px}
.ch-flomo-connect{padding:20px 24px 24px;border-top:1px solid var(--ch-line);display:grid;gap:12px}
.ch-flomo-connect p{font-size:12px;color:var(--ch-muted);line-height:1.8;margin:0}
.ch-flomo-connect label{font-size:12px;display:grid;gap:8px}
.ch-flomo-connect small{font-size:11px;color:var(--ch-muted);line-height:1.7}
.ch-notes-main{min-width:0}
.ch-notes-toolbar{display:flex;align-items:center;gap:8px;padding:9px 10px;background:var(--ch-glass);backdrop-filter:blur(16px);border:1px solid var(--ch-line);border-radius:11px}
.ch-notes-search{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.ch-home .ch-notes-search input{min-width:0;flex:1;width:0;border:0;background:transparent;padding:8px 0;font-size:13px}
.ch-notes-toolbar .ch-btn{padding:8px;min-width:34px}
.ch-notes-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:14px 0;padding:9px 12px;border-radius:8px;background:var(--ch-glass);color:var(--ch-muted);font-size:11px}
.ch-notes-summary strong{color:var(--ch-ink);font-size:12px;font-weight:600}
.ch-note-tags{display:flex;gap:7px;flex-wrap:wrap}
.ch-note-tag{border:1px solid var(--ch-line);border-radius:6px;background:var(--ch-card);color:var(--ch-muted)!important;padding:5px 8px;font-size:11px;min-height:28px}
.ch-note-tag:hover{color:var(--ch-accent)!important;border-color:var(--ch-accent)}
.ch-notes-day{margin-bottom:24px}
.ch-notes-day-heading{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:600;margin:20px 0 10px;padding:5px 9px;width:fit-content;background:var(--ch-glass);border-radius:6px}
.ch-notes-day-heading:before{content:'';height:5px;width:5px;border-radius:50%;background:var(--ch-green)}
.ch-note-card{padding:24px 26px;background:var(--ch-glass);border:1px solid var(--ch-line);border-radius:12px;backdrop-filter:blur(16px);margin-bottom:12px;overflow:hidden}
.ch-note-card-top{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--ch-muted);font-size:11px;margin-bottom:16px}
.ch-note-card time{font-variant-numeric:tabular-nums}
.ch-note-card-top a{display:flex;align-items:center;gap:5px;font-size:11px}
.ch-note-card-top a:hover{color:var(--ch-accent)}
.ch-note-content{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.9;margin:0}
.ch-note-content mark{background:color-mix(in srgb,var(--ch-warm) 18%,var(--ch-card));color:var(--ch-ink);padding:0 2px}
.ch-note-clamped{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:10;overflow:hidden}
.ch-note-more{border:0;background:transparent;color:var(--ch-accent)!important;padding:10px 0 0;font-size:12px;min-height:36px}
.ch-note-card .ch-note-tags{margin-top:20px}
.ch-note-images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:16px}
.ch-note-images img{width:100%;height:100px;object-fit:cover;border-radius:8px;display:block;background:var(--ch-bg)}
.ch-notes-empty{display:flex;align-items:center;flex-direction:column;gap:14px;text-align:center;padding:48px 24px;border:1px dashed var(--ch-line);border-radius:12px;background:var(--ch-glass);color:var(--ch-muted)}
.ch-notes-empty strong{font-size:16px;color:var(--ch-ink);font-weight:550}
.ch-notes-empty p{font-size:12px;margin:0;line-height:1.8}
.ch-notes-pagination{text-align:center;padding:8px 0 20px}
.ch-notes-pagination p{font-size:11px;color:var(--ch-muted);background:var(--ch-glass);width:fit-content;padding:8px 12px;border-radius:8px;margin:auto}
.ch-notes-error{margin:14px 0}
@container(max-width:1050px){
  .ch-wrap{padding:20px 24px 24px}.ch-wordmark small{display:none}.ch-day-summary{gap:16px}.ch-day-summary div{padding-left:16px;min-width:65px}
  .ch-card-head{padding:18px 18px 0}.ch-card-body{padding:16px 18px 18px}.ch-timer-main{gap:14px}.ch-ring{width:128px;height:128px}.ch-timer-details{max-width:150px}
  .ch-projects{grid-template-columns:1fr}.ch-section-label span{display:none}.ch-link-grid{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:120px;overflow-x:auto;scrollbar-width:thin;overscroll-behavior-x:contain}
  .ch-view-hint{font-size:10px}.ch-notes-layout{grid-template-columns:minmax(250px,.9fr) minmax(0,1.2fr);gap:18px}.ch-note-composer-head{padding:20px 20px 16px}
}
@container(max-width:760px){
  .ch-topbar{flex-wrap:wrap}.ch-viewbar{order:3;flex-basis:100%;border-top:1px solid var(--ch-line)}
  .ch-wrap{padding:16px}.ch-grid{grid-template-columns:1fr}.ch-hero{padding:18px;gap:18px}.ch-day-summary{gap:12px}.ch-day-summary div{min-width:58px;padding-left:12px}.ch-day-summary dd{font-size:24px}
  .ch-projects{grid-template-columns:1fr 1fr}.ch-view-hint{display:none}.ch-notes-layout{grid-template-columns:1fr;gap:20px}.ch-note-composer{position:static}.ch-home .ch-note-input{min-height:150px}
  .ch-note-composer-head p{display:none}.ch-note-composer h2{font-size:21px;margin:8px 0 0}.ch-note-form{padding:0 18px 18px}.ch-note-composer-head{padding:18px}.ch-note-card{padding:20px}
}
@container(max-width:520px){
  .ch-wrap{padding:12px}.ch-topbar{gap:8px;padding:8px 10px}.ch-wordmark{gap:7px;font-size:14px}.ch-brand-dot{height:28px;width:28px}.ch-actions{gap:4px}.ch-topbar .ch-btn{padding:8px;min-height:36px}.ch-action-label{display:none}
  .ch-topbar{flex-wrap:wrap;margin-bottom:12px}.ch-viewbar{order:3;flex-basis:100%;border-top:1px solid var(--ch-line);padding-top:2px}.ch-view-tabs{gap:8px;width:100%}.ch-view-tabs button{flex:1;justify-content:center;min-height:40px;padding:8px 10px 10px}
  .ch-link a,.ch-link-add{flex-direction:column;justify-content:center}
  .ch-hero{grid-template-columns:1fr;padding:16px 18px;gap:16px;margin-bottom:14px}.ch-hero h1{font-size:26px}.ch-subtitle{font-size:11px}.ch-day-summary{gap:0}.ch-day-summary div{flex:1;padding-left:14px}.ch-day-summary div:first-child{padding-left:0;border:0}.ch-day-summary dt{font-size:10px}.ch-day-summary dd{font-size:22px}
  .ch-utility{display:block;margin-bottom:12px}.ch-section-intro{display:none}.ch-search{max-width:none}.ch-search input{font-size:12px}.ch-search select{max-width:64px}
  .ch-shortcuts{padding:10px 10px 8px;margin-bottom:14px}.ch-section-head{gap:8px;margin-bottom:6px}.ch-section-label{font-size:11px}.ch-tabs{gap:0}.ch-tab{padding:5px 8px;font-size:12px;min-height:32px}
  .ch-link-grid{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:76px;overflow-x:auto;gap:4px;scrollbar-width:thin;overscroll-behavior-x:contain;padding-bottom:4px}.ch-link{padding:7px 3px}.ch-link-add{min-height:68px}.ch-link-mark{width:30px;height:30px}.ch-link-name{font-size:10px}.ch-link-controls button{width:32px;height:34px}
  .ch-card-head{padding:18px 16px 0;gap:8px}.ch-card-head h2{font-size:15px}.ch-card-badge{font-size:9px}.ch-card-body{padding:16px}.ch-taskform input{font-size:12px;padding:10px 8px}.ch-taskform select{max-width:60px;font-size:11px}.ch-taskform{gap:5px}.ch-taskform .ch-btn{padding:8px}
  .ch-task{grid-template-columns:20px minmax(0,1fr);gap:3px 9px;padding:12px 0}.ch-task-title{font-size:13px}.ch-check{grid-row:1}.ch-area{grid-column:2;grid-row:2;align-self:center}.ch-task-ops{grid-column:2;grid-row:2;justify-self:end}.ch-task-ops .ch-iconbtn{width:36px;height:34px}.ch-area{padding-right:112px}
  .ch-task-foot{font-size:10px}.ch-task-foot button{font-size:10px}.ch-timer-main{gap:20px}.ch-ring{width:132px;height:132px}.ch-timer-details{max-width:155px}.ch-focus-stats{font-size:10px}
  .ch-projects{grid-template-columns:1fr}.ch-project{padding:12px}.ch-footer{font-size:10px;padding:7px 9px}.ch-footer>svg{display:none}.ch-footer-sign{font-size:8px}
  .ch-note-meta{font-size:10px}.ch-note-card{padding:18px}.ch-note-content{font-size:14px}.ch-note-composer-head{padding:18px}.ch-note-composer-head h2{font-size:21px}.ch-home .ch-note-input{min-height:148px;font-size:14px;padding:13px}.ch-note-kicker{font-size:9px}.ch-note-card-top{margin-bottom:14px}
  .ch-modal-shade{padding:12px}.ch-modal{padding:20px;max-height:90vh}.ch-modal h2{font-size:17px}.ch-banner{flex-wrap:wrap}.ch-banner span{flex-basis:100%}
}
@media(prefers-reduced-motion:reduce){.ch-home *{transition:none!important;scroll-behavior:auto!important}}
`;
    function Icon({ name, size = 16, ...props }) {
      const paths = {
        home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
        image: 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM3 16l6-6 5 5 3-3 4 4M16 7h.01',
        note: 'M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M15 6l3-3 3 3-9 9-4 1 1-4Z',
        upload: 'M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5',
        external: 'M14 3h7v7M21 3l-10 10M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
        search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
        plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14m-6-6 6 6-6 6',
        settings: 'M4 7h16M4 17h16M8 4v6M16 14v6', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
        check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M6 18 18 6', edit: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5', trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
        play: 'm8 4 13 8-13 8Z', pause: 'M8 4v16M16 4v16', reset: 'M3 10a9 9 0 1 1 2 9M3 4v6h6', timer: 'M12 8v5l3 2M9 2h6M12 2v3M20 5l-2 2M20 13a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
        list: 'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1', leaf: 'M20 3C8 1 2 8 5 16s17 2 15-13ZM5 21l10-12',
        grip: 'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01', up: 'm6 15 6-6 6 6', down: 'm6 9 6 6 6-6',
        sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
        heart: 'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z', cup: 'M4 8h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 9h2a3 3 0 1 1 0 6h-2M7 2v3M12 2v3',
      };
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: name === 'grip' ? 3 : 1.65, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...props }, h('path', { d: paths[name] || paths.grid }));
    }
    const icon = (name, size) => h(Icon, { name, size });
    const dayKey = (time) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);
    function Modal({ title, close, children }) {
      const { t } = useLocale();
      const ref = useRef(null);
      useEffect(() => {
        const previous = document.activeElement;
        const el = ref.current;
        const focusable = () => [...el.querySelectorAll('input,select,textarea,button,a[href]')].filter((node) => !node.disabled && node.getClientRects().length > 0);
        (el.querySelector('input:not([type="file"]),select,textarea') || focusable()[0])?.focus({ preventScroll: true });
        const onKey = (event) => {
          if (event.key === 'Escape') { event.preventDefault(); close(); }
          if (event.key === 'Tab') {
            const nodes = focusable();
            const first = nodes[0], last = nodes.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        };
        el.addEventListener('keydown', onKey);
        return () => { el.removeEventListener('keydown', onKey); previous?.focus?.({ preventScroll: true }); };
      }, [close]);
      return h('div', { className: 'ch-modal-shade', onClick: (e) => { if (e.target === e.currentTarget) close(); } }, h('section', { className: 'ch-modal', role: 'dialog', 'aria-modal': true, 'aria-label': title, ref }, h('div', { className: 'ch-modal-head' }, h('h2', null, title), h('button', { type: 'button', className: 'ch-iconbtn', onClick: close, 'aria-label': t('closeDialog') }, icon('close'))), children));
    }
    function Editor({ model, state, run, close }) {
      const { t } = useLocale();
      const [error, setError] = useState('');
      const [saving, setSaving] = useState(false);
      const submit = async (e) => {
        e.preventDefault(); setSaving(true); setError('');
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          let action;
          if (model.type === 'settings') action = { action: 'settings.update', settings: { name: data.name.trim(), focusMinutes: Number(data.focusMinutes), breakMinutes: Number(data.breakMinutes), dailyGoal: Number(data.dailyGoal), searchEngine: data.searchEngine } };
          else if (model.type === 'bookmark') action = { action: 'bookmark.save', ...(model.value?.id ? { id: model.value.id } : {}), ...data, title: data.title.trim(), url: data.url.trim() };
          else if (model.type === 'task') action = { action: 'task.update', id: model.value.id, title: data.title.trim(), area: data.area };
          else action = { action: model.kind + '.delete', id: model.value.id };
          await run(action); close();
        } catch (err) { setError(err.name === 'AbortError' ? 'saveTimeout' : err.message); } finally { setSaving(false); }
      };
      const field = (label, name, value, options = {}) => h('label', { key: name }, label, h('input', { name, defaultValue: value, required: true, ...options }));
      const select = (label, name, value, options) => h('label', { key: name }, label, h('select', { name, defaultValue: value }, options.map((item) => h('option', { key: item, value: item }, displayLabel(item, t)))));
      let fields, title;
      if (model.type === 'settings') {
        const s = state.settings; title = t('settingsTitle');
        fields = [field(t('name'), 'name', s.name, { maxLength: 32 }), h('div', { className: 'ch-field-pair', key: 'durations' }, field(t('focusMinutes'), 'focusMinutes', s.focusMinutes, { type: 'number', min: 1, max: 120 }), field(t('breakMinutes'), 'breakMinutes', s.breakMinutes, { type: 'number', min: 1, max: 30 })), field(t('dailyGoal'), 'dailyGoal', s.dailyGoal, { type: 'number', min: 1, max: 16 }), select(t('defaultSearch'), 'searchEngine', s.searchEngine, ['google', 'bing', 'baidu']), h('p', { key: 'note' }, t('durationNote'))];
      } else if (model.type === 'bookmark') {
        const b = model.value || {}; title = b.id ? t('editBookmark') : t('addBookmark');
        fields = [field(t('bookmarkName'), 'title', b.title || '', { maxLength: 60, placeholder: t('bookmarkPlaceholder') }), field(t('url'), 'url', b.url || '', { type: 'url', placeholder: t('urlPlaceholder'), maxLength: 2048 }), h('div', { className: 'ch-field-pair', key: 'meta' }, select(t('category'), 'category', b.category || '常用', ['常用', ...AREAS]), field(t('mark'), 'mark', b.mark || '↗', { maxLength: 4 }))];
      } else if (model.type === 'task') { title = t('editTask'); fields = [field(t('taskTitle'), 'title', model.value.title, { maxLength: 160 }), select(t('category'), 'area', model.value.area, AREAS)]; }
      else { title = t(model.kind === 'task' ? 'deleteTask' : 'deleteBookmark'); fields = [h('p', { key: 'confirm' }, t('deletePrompt', { title: model.value.title }))]; }
      return h(Modal, { title, close }, h('form', { onSubmit: submit }, h('div', { className: 'ch-fields' }, fields), error && h('div', { role: 'alert', className: 'ch-modal-error' }, displayError(error, t)), h('div', { className: 'ch-modal-foot' }, h('button', { className: 'ch-btn', type: 'button', onClick: close, disabled: saving }, t('cancel')), h('button', { className: 'ch-btn ch-primary', type: 'submit', disabled: saving }, saving ? t('saving') : model.type === 'delete' ? t('confirmDelete') : t('save')))));
    }
    const DEFAULT_BACKGROUND = { type: 'ocean', url: '', dim: 24 };
    const BACKGROUNDS = ['ocean', 'forest', 'dusk', 'aurora'];
    const LOGOS = { 'github.com': 'github.png', 'javaarthur.github.io': 'ai-radar.svg', 'chat.aichanning.cn': 'ai-reports.svg', 'zz.aichanning.cn': 'trading-review.svg', 'docs.langchain.com': 'langgraph.png', 'chat.deepseek.com': 'deepseek.png', 'zhipin.com': 'boss.png', 'youmind.com': 'youmind.png' };
    const NOTES_DRAFT_KEY = 'chen-home:flomo-draft:v1';
    const isHttps = (value) => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
    const isWallpaperUrl = (value) => isHttps(value) || /^\/api\/chen-home\/wallpaper\?id=[a-f0-9]+$/.test(value);
    const backgroundUrl = (background) => background.type === 'custom' ? (isWallpaperUrl(background.url) ? background.url : '') : ['ocean', 'forest', 'dusk'].includes(background.type) ? `/api/chen-home/assets?name=${background.type}.jpg` : '';
    function BookmarkLogo({ bookmark }) {
      const [failed, setFailed] = useState(false);
      const host = new URL(bookmark.url).hostname.replace(/^www\./, '');
      const source = Object.hasOwn(LOGOS, host) ? `/api/chen-home/assets?name=${LOGOS[host]}` : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
      useEffect(() => setFailed(false), [source]);
      return h('span', { className: 'ch-link-mark', 'aria-hidden': true }, failed ? bookmark.mark : h('img', { src: source, alt: '', loading: 'lazy', referrerPolicy: 'no-referrer', draggable: false, onError: () => setFailed(true) }));
    }
    async function jsonRequest(path, action, signal) {
      const response = await fetch(path, { method: action ? 'POST' : 'GET', headers: action ? { 'Content-Type': 'application/json' } : undefined, body: action ? JSON.stringify(action) : undefined, credentials: 'same-origin', signal });
      const value = await response.json().catch(() => { const error = new Error('serviceUnavailable'); error.uncertain = true; throw error; });
      if (!response.ok) { const error = new Error(value.error || 'serviceUnavailable'); error.status = response.status; error.uncertain = response.status >= 500 || (response.status === 409 && /结果/.test(value.error || '') && /刷新|核对/.test(value.error || '')); throw error; }
      return value;
    }
    function BackgroundEditor({ state, run, close }) {
      const { t } = useLocale();
      const [background, setBackground] = useState(() => ({ ...(state.settings.background || DEFAULT_BACKGROUND) }));
      const [fileData, setFileData] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [reading, setReading] = useState(false), [imageError, setImageError] = useState(false);
      const uploadRef = useRef(null), reader = useRef(null), controller = useRef(null), mounted = useRef(true), savePending = useRef(false);
      const image = fileData && background.type === 'custom' ? fileData : backgroundUrl(background);
      useEffect(() => { setImageError(false); }, [image]);
      useEffect(() => { mounted.current = true; return () => { mounted.current = false; reader.current?.abort(); controller.current?.abort(); }; }, []);
      const pickFile = (event) => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        setError('');
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('backgroundFileType'); return; }
        if (file.size > 3 * 1024 * 1024) { setError('backgroundFileSize'); return; }
        reader.current?.abort();
        const next = new FileReader(); reader.current = next; setReading(true);
        next.onload = () => { if (mounted.current) { setFileData(String(next.result)); setBackground((previous) => ({ ...previous, type: 'custom', url: '' })); setReading(false); } };
        next.onerror = () => { if (mounted.current) { setError('backgroundFileError'); setReading(false); } };
        next.onabort = () => { if (mounted.current) setReading(false); };
        next.readAsDataURL(file);
      };
      const submit = async (event) => {
        event.preventDefault(); if (savePending.current || reading) return;
        if (background.type === 'custom' && !fileData && !isWallpaperUrl(background.url.trim())) { setError('backgroundHttps'); return; }
        savePending.current = true; setSaving(true); setError('');
        const nextController = new AbortController(); controller.current = nextController;
        const timeout = setTimeout(() => nextController.abort(), 30000);
        try {
          let url = background.type === 'custom' ? background.url.trim() : '';
          if (background.type === 'custom' && fileData) {
            const uploaded = await jsonRequest('/api/chen-home/wallpaper', { dataUrl: fileData }, nextController.signal);
            url = uploaded.url;
            if (!isWallpaperUrl(url)) throw new Error('backgroundFileError');
            if (mounted.current) { setFileData(''); setBackground((previous) => ({ ...previous, url })); }
          }
          await run({ action: 'settings.update', settings: { background: { ...background, url } } });
          if (mounted.current) close();
        } catch (err) { if (mounted.current) setError(err.name === 'AbortError' ? 'saveTimeout' : err.message); }
        finally { clearTimeout(timeout); savePending.current = false; if (mounted.current) setSaving(false); }
      };
      const safeClose = useCallback(() => { if (!savePending.current) close(); }, [close]);
      return h(Modal, { title: t('backgroundTitle'), close: safeClose }, h('form', { onSubmit: submit },
        h('div', { className: 'ch-fields' }, h('p', null, t('backgroundHint')),
          h('div', { className: 'ch-background-grid' }, BACKGROUNDS.map((type) => h('button', { key: type, type: 'button', className: `ch-background-choice${background.type === type ? ' ch-selected' : ''}`, 'aria-pressed': background.type === type, disabled: saving || reading, onClick: () => { setBackground((previous) => ({ ...previous, type })); setError(''); } }, h('span', { className: `ch-background-thumb${type === 'aurora' ? ' ch-aurora-art' : ''}`, style: type !== 'aurora' ? { backgroundImage: `url(${JSON.stringify(backgroundUrl({ type }))})` } : undefined }), h('span', { className: 'ch-background-name' }, t(type), background.type === type && icon('check', 14))))),
          h('label', null, t('backgroundUrl'), h('input', { type: 'url', placeholder: 'https://', value: background.type === 'custom' && !fileData && !background.url.startsWith('/api/') ? background.url : '', disabled: saving || reading, onChange: (event) => { setFileData(''); setBackground((previous) => ({ ...previous, type: 'custom', url: event.target.value })); setError(''); } })),
          h('div', { className: 'ch-background-upload' }, h('button', { type: 'button', className: 'ch-btn', disabled: saving || reading, onClick: () => uploadRef.current?.click() }, icon('upload', 14), t('backgroundUpload')), h('input', { className: 'ch-file-input', ref: uploadRef, type: 'file', accept: 'image/png,image/jpeg,image/webp', onChange: pickFile, tabIndex: -1, 'aria-label': t('backgroundUpload') }), h('small', null, fileData || background.url.startsWith('/api/') ? t('backgroundSelectedFile') : t('backgroundUploadHint'))),
          h('div', { className: `ch-background-preview${background.type === 'aurora' ? ' ch-aurora-art' : ''}`, style: { '--ch-preview-dim': background.dim / 100 }, 'aria-label': t('backgroundPreview') }, image && h('img', { src: image, alt: '', referrerPolicy: 'no-referrer', onError: () => setImageError(true), onLoad: () => setImageError(false) }), h('span', null, t(background.type))),
          imageError && h('p', { role: 'status', className: 'ch-background-note' }, t('backgroundLoadError')),
          h('label', null, t('backgroundDim'), h('div', { className: 'ch-background-range' }, h('input', { type: 'range', min: 0, max: 80, step: 1, value: background.dim, disabled: saving, onChange: (event) => setBackground((previous) => ({ ...previous, dim: Number(event.target.value) })), 'aria-label': t('backgroundDim') }), h('output', null, background.dim + '%'))), h('p', { className: 'ch-background-note' }, t('backgroundDimHint'))),
        error && h('div', { role: 'alert', className: 'ch-modal-error' }, displayError(error, t)),
        h('div', { className: 'ch-modal-foot' }, h('button', { className: 'ch-btn', type: 'button', onClick: close, disabled: saving }, t('cancel')), h('button', { className: 'ch-btn ch-primary', type: 'submit', disabled: saving || reading }, t(saving ? 'saving' : 'backgroundApply')))));
    }
    function noteContent(content) {
      // Flomo mixes Markdown with a few HTML formatting tags. Render only known
      // formatting as React nodes; external HTML is never inserted into the DOM.
      const text = content.replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
        .replace(/<mark>([\s\S]*?)<\/mark>/gi, '==$1==')
        .replace(/<li(?:\s[^>]*)?>/gi, '• ').replace(/<\/li>/gi, '\n')
        .replace(/<\/?(?:p|div|ul|ol)(?:\s[^>]*)?>/gi, '\n')
        .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity])
        .replace(/\\([.()\[\]])/g, '$1').replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n').trim();
      return text.split(/(\*\*[^*]+\*\*|==[^=]+==|<u>[\s\S]*?<\/u>)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) return h('strong', { key: index }, part.slice(2, -2));
        if (part.startsWith('==') && part.endsWith('==')) return h('mark', { key: index }, part.slice(2, -2));
        if (part.startsWith('<u>') && part.endsWith('</u>')) return h('u', { key: index }, part.slice(3, -4));
        return part;
      });
    }
    function NoteCard({ note, request, updateNote, filterTag }) {
      const { t, active } = useLocale();
      const [expanded, setExpanded] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState('');
      const full = async () => {
        if (loading) return;
        if (!note.contentTruncated) { setExpanded(!expanded); return; }
        setLoading(true); setError('');
        try { const result = await request({ action: 'get', id: note.id }); updateNote(result.note); setExpanded(true); }
        catch (err) { setError(err.name === 'AbortError' ? 'connectTimeout' : err.message); }
        finally { setLoading(false); }
      };
      const date = new Date(note.createdAt), validDate = Number.isFinite(date.getTime());
      const images = (note.files || []).filter((file) => /^image(?:\/|$)/.test(file.type) && isHttps(file.url)).slice(0, 9);
      return h('article', { className: 'ch-note-card', 'data-note-id': note.id },
        h('div', { className: 'ch-note-card-top' }, h('time', { dateTime: validDate ? date.toISOString() : undefined }, validDate ? new Intl.DateTimeFormat(active.startsWith('zh') ? 'zh-CN' : 'en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date) : ''), isHttps(note.url) && h('a', { href: note.url, target: '_blank', rel: 'noopener noreferrer' }, t('notesOriginal'), icon('external', 11))),
        h('p', { className: 'ch-note-content' + (!expanded && note.content.length > 700 ? ' ch-note-clamped' : '') }, noteContent(note.content)),
        (note.contentTruncated || note.content.length > 700) && h('button', { type: 'button', className: 'ch-note-more', disabled: loading, onClick: full }, t(loading ? 'notesReading' : expanded ? 'notesCollapse' : 'notesReadFull')),
        error && h('p', { role: 'alert', className: 'ch-note-feedback' }, displayError(error, t)),
        images.length > 0 && h('div', { className: 'ch-note-images' }, images.map((file, index) => h('a', { key: file.url + index, href: file.url, target: '_blank', rel: 'noopener noreferrer' }, h('img', { src: file.url, alt: t('noteImage'), loading: 'lazy', referrerPolicy: 'no-referrer' })))),
        note.tags?.length > 0 && h('div', { className: 'ch-note-tags' }, note.tags.map((tag) => h('button', { type: 'button', className: 'ch-note-tag', key: tag, onClick: () => filterTag(tag), 'aria-label': t('notesTag', { tag }) }, '#' + tag.replace(/^#/, '')))));
    }
    function Notes({ composerRef }) {
      const { t, active } = useLocale();
      const [draft, setDraft] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(NOTES_DRAFT_KEY) || 'null'); return { content: typeof saved?.content === 'string' ? saved.content : '', requestId: typeof saved?.requestId === 'string' ? saved.requestId : crypto.randomUUID(), uncertain: saved?.uncertain === true, uncertainAfter: Number.isFinite(saved?.uncertainAfter) ? saved.uncertainAfter : 0 }; } catch { return { content: '', requestId: crypto.randomUUID() }; } });
      const [draftStored, setDraftStored] = useState(true), [notes, setNotes] = useState([]), [configured, setConfigured] = useState(null), [loading, setLoading] = useState(true), [loadingMore, setLoadingMore] = useState(false), [hasMore, setHasMore] = useState(false), [nextBefore, setNextBefore] = useState(null), [syncedAt, setSyncedAt] = useState(null), [paginationLimited, setPaginationLimited] = useState(false);
      const [searchText, setSearchText] = useState(''), [filters, setFilters] = useState({ keywords: '', tag: '' }), [error, setError] = useState(''), [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(draft.uncertain ? 'noteUnknown' : ''), [saved, setSaved] = useState(false), [uncertain, setUncertain] = useState(Boolean(draft.uncertain)), [checkedUnknown, setCheckedUnknown] = useState(false), [connecting, setConnecting] = useState(false), [connectionError, setConnectionError] = useState('');
      const mounted = useRef(true), controllers = useRef(new Set()), listGeneration = useRef(0), savePending = useRef(false), loadMorePending = useRef(false), connectPending = useRef(false), tokenRef = useRef(null), uncertainRef = useRef(Boolean(draft.uncertain)), uncertainAfter = useRef(draft.uncertainAfter || 0);
      useEffect(() => { try { if (draft.content) localStorage.setItem(NOTES_DRAFT_KEY, JSON.stringify(draft)); else localStorage.removeItem(NOTES_DRAFT_KEY); setDraftStored(true); } catch { setDraftStored(false); } }, [draft]);
      useEffect(() => { mounted.current = true; return () => { mounted.current = false; for (const controller of controllers.current) controller.abort(); if (tokenRef.current) tokenRef.current.value = ''; }; }, []);
      const request = useCallback(async (action) => {
        const controller = new AbortController(); controllers.current.add(controller); const timeout = setTimeout(() => controller.abort(), 30000);
        try { return await jsonRequest('/api/chen-home/notes', action, controller.signal); }
        finally { clearTimeout(timeout); controllers.current.delete(controller); }
      }, []);
      const load = useCallback(async (append = false, before = null) => {
        if (append && loadMorePending.current) return;
        if (append) loadMorePending.current = true;
        const generation = append ? listGeneration.current : ++listGeneration.current;
        const began = Date.now();
        if (append) setLoadingMore(true); else setLoading(true);
        setError('');
        try {
          const value = await request({ action: 'list', ...(filters.keywords ? { keywords: filters.keywords } : {}), ...(filters.tag ? { tag: filters.tag } : {}), ...(append && before ? { before } : {}) });
          if (!mounted.current || generation !== listGeneration.current) return;
          setConfigured(value.configured); setHasMore(Boolean(value.hasMore && value.nextBefore)); setNextBefore(value.nextBefore); setSyncedAt(value.syncedAt); setPaginationLimited((previous) => Boolean(value.paginationLimited || (append && previous)));
          setNotes((previous) => [...new Map([...(append ? previous : []), ...(value.notes || [])].map((note) => [note.id, note])).values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          if (!append && uncertainRef.current && began >= uncertainAfter.current && !filters.keywords && !filters.tag) setCheckedUnknown(true);
        } catch (err) { if (mounted.current && generation === listGeneration.current) { setError(err.name === 'AbortError' ? 'connectTimeout' : err.message); if (err.status === 401 || err.status === 403) setConfigured(false); } }
        finally { if (append) loadMorePending.current = false; if (mounted.current && generation === listGeneration.current) { setLoading(false); setLoadingMore(false); } }
      }, [request, filters]);
      useEffect(() => { void load(); }, [load]);
      const refresh = () => { if (uncertainRef.current && (filters.keywords || filters.tag)) { setSearchText(''); setFilters({ keywords: '', tag: '' }); } else void load(); };
      const connect = async (event) => {
        event.preventDefault(); const token = tokenRef.current?.value.trim(); if (!token || connectPending.current) return;
        connectPending.current = true; setConnecting(true); setConnectionError('');
        try { await request({ action: 'configure', token }); if (tokenRef.current) tokenRef.current.value = ''; if (mounted.current) { setConfigured(true); await load(); } }
        catch (err) { if (mounted.current) setConnectionError(err.name === 'AbortError' ? 'connectTimeout' : err.message); }
        finally { connectPending.current = false; if (mounted.current) setConnecting(false); }
      };
      const save = async (event) => {
        event.preventDefault(); if (!draft.content.trim() || savePending.current || uncertainRef.current || !configured) return;
        savePending.current = true; setSaving(true); setSaveError(''); setSaved(false);
        // Persist the lock before sending: a reload can interrupt even an in-flight request.
        const pendingDraft = { ...draft, uncertain: true, uncertainAfter: Date.now() };
        try { localStorage.setItem(NOTES_DRAFT_KEY, JSON.stringify(pendingDraft)); setDraftStored(true); }
        catch { setDraftStored(false); setSaveError('noteStorageUnavailable'); savePending.current = false; setSaving(false); return; }
        setDraft(pendingDraft);
        try {
          const value = await request({ action: 'create', content: draft.content.trim(), requestId: draft.requestId });
          if (!value.note?.id) { const err = new Error('noteUnknown'); err.uncertain = true; throw err; }
          if (!mounted.current) return;
          listGeneration.current++; setLoading(false); setLoadingMore(false);
          setDraft({ content: '', requestId: crypto.randomUUID() }); setSaved(true);
          setNotes((previous) => [value.note, ...previous.filter((note) => note.id !== value.note.id)].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          if (filters.keywords || filters.tag) { setSearchText(''); setFilters({ keywords: '', tag: '' }); }
        } catch (err) {
          if (!mounted.current) return;
          if (err.name === 'AbortError' || !err.status || err.uncertain) { uncertainRef.current = true; uncertainAfter.current = Date.now(); setDraft((previous) => ({ ...previous, uncertain: true, uncertainAfter: uncertainAfter.current })); setUncertain(true); setCheckedUnknown(false); setSaveError('noteUnknown'); }
          else { setDraft((previous) => ({ ...previous, uncertain: false, uncertainAfter: 0 })); setSaveError(err.message); if (err.status === 401 || err.status === 403) setConfigured(false); }
        } finally { savePending.current = false; if (mounted.current) setSaving(false); }
      };
      const updateDraft = (event) => { const content = event.target.value; setDraft((previous) => ({ content, requestId: content === previous.content ? previous.requestId : crypto.randomUUID() })); setSaved(false); setSaveError(''); };
      const updateNote = (note) => { if (mounted.current) setNotes((previous) => previous.map((item) => item.id === note.id ? note : item)); };
      const filterTag = (tag) => { setFilters((previous) => ({ ...previous, tag })); };
      const groups = useMemo(() => { const result = new Map(); for (const note of notes) { const date = new Date(note.createdAt); const key = Number.isFinite(date.getTime()) ? dayKey(date) : ''; if (!result.has(key)) result.set(key, []); result.get(key).push(note); } return [...result]; }, [notes]);
      const groupLabel = (key, note) => key === dayKey(Date.now()) ? t('notesToday') : key === dayKey(Date.now() - 86400000) ? t('notesYesterday') : key ? new Intl.DateTimeFormat(active.startsWith('zh') ? 'zh-CN' : 'en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(note.createdAt)) : t('notesAll');
      const emptyHeading = filters.keywords || filters.tag ? 'notesNoResults' : 'notesEmpty';
      return h('section', { className: 'ch-notes-layout', 'aria-label': t('notesTab') },
        h('aside', { className: 'ch-note-composer' }, h('div', { className: 'ch-note-composer-head' }, h('span', { className: 'ch-note-kicker' }, icon('note', 13), t('notesKicker')), h('h2', null, t('notesHeading')), h('p', null, t('notesSubtitle'))),
          h('form', { className: 'ch-note-form', onSubmit: save }, h('textarea', { ref: composerRef, className: 'ch-note-input', value: draft.content, onChange: updateDraft, placeholder: t('notePlaceholder'), 'aria-label': t('noteContent'), disabled: saving || uncertain, maxLength: 30000 }), h('div', { className: 'ch-note-meta' }, h('span', null, t(draftStored ? 'noteDraft' : 'noteDraftMemory')), h('span', null, t('noteCharacters', { count: draft.content.length }))),
            saveError && h('div', { className: 'ch-note-feedback', role: 'alert' }, displayError(saveError, t), uncertain && h('div', null, h('button', { type: 'button', className: 'ch-btn', onClick: refresh, disabled: loading }, icon('reset', 13), t('notesRefresh')), checkedUnknown && h(React.Fragment, null, h('p', null, t('noteCheckHint')), h('button', { type: 'button', className: 'ch-btn', onClick: () => { uncertainRef.current = false; setDraft((previous) => ({ ...previous, uncertain: false, uncertainAfter: 0 })); setUncertain(false); setCheckedUnknown(false); setSaveError(''); } }, t('noteCheckAgain'))))),
            saved && h('p', { className: 'ch-note-feedback ch-note-success', role: 'status' }, t('noteSaved')),
            h('button', { type: 'submit', className: 'ch-btn ch-primary ch-note-save', disabled: saving || uncertain || !configured || !draft.content.trim() }, icon(saving ? 'timer' : 'plus', 15), t(saving ? 'noteSaving' : 'noteSave'))),
          configured === false && h('form', { className: 'ch-flomo-connect', onSubmit: connect }, h('p', null, t('flomoConnectHint')), h('label', null, t('flomoToken'), h('input', { ref: tokenRef, type: 'password', autoComplete: 'off', required: true, disabled: connecting, 'aria-label': t('flomoToken') })), h('small', null, t('flomoTokenHint')), connectionError && h('div', { className: 'ch-note-feedback', role: 'alert' }, displayError(connectionError, t)), h('button', { type: 'submit', className: 'ch-btn', disabled: connecting }, t(connecting ? 'flomoConnecting' : 'flomoConnect')))),
        h('div', { className: 'ch-notes-main' },
          h('div', { className: 'ch-notes-toolbar' }, h('form', { className: 'ch-notes-search', role: 'search', onSubmit: (event) => { event.preventDefault(); setFilters((previous) => ({ ...previous, keywords: searchText.trim() })); } }, icon('search', 17), h('input', { value: searchText, onChange: (event) => setSearchText(event.target.value), placeholder: t('notesSearchPlaceholder'), 'aria-label': t('notesSearch'), maxLength: 200 }), h('button', { className: 'ch-btn', type: 'submit', 'aria-label': t('notesSearch') }, icon('arrow', 14))), h('button', { className: 'ch-btn', type: 'button', onClick: refresh, disabled: loading, 'aria-label': t('notesRefresh'), title: t('notesRefresh') }, icon('reset', 14))),
          h('div', { className: 'ch-notes-summary' }, h('strong', null, filters.tag ? h('button', { className: 'ch-note-tag', type: 'button', onClick: () => setFilters((previous) => ({ ...previous, tag: '' })), 'aria-label': t('notesClear') }, '#' + filters.tag.replace(/^#/, ''), ' ×') : t('notesAll')), h('span', null, t('notesCount', { count: notes.length }), syncedAt ? ' · ' + t('notesSynced', { time: new Intl.DateTimeFormat(active.startsWith('zh') ? 'zh-CN' : 'en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(syncedAt)) }) : '')),
          error && h('div', { className: 'ch-note-feedback ch-notes-error', role: 'alert' }, displayError(error, t), h('div', null, h('button', { className: 'ch-btn', type: 'button', onClick: refresh }, t('notesRefresh')))),
          loading && !notes.length ? h('div', { className: 'ch-notes-empty', role: 'status' }, icon('timer', 22), t('notesLoading')) : !notes.length && error ? null : !notes.length ? h('div', { className: 'ch-notes-empty' }, icon('note', 26), h('strong', null, t(configured === false ? 'flomoConnect' : emptyHeading)), h('p', null, t(configured === false ? 'flomoConnectHint' : filters.keywords || filters.tag ? 'notesNoResultsHint' : 'notesEmptyHint')), (filters.keywords || filters.tag) && h('button', { className: 'ch-btn', type: 'button', onClick: () => { setSearchText(''); setFilters({ keywords: '', tag: '' }); } }, t('notesClear'))) : h('div', { className: 'ch-notes-timeline', 'aria-busy': loading }, groups.map(([key, items]) => h('section', { key, className: 'ch-notes-day' }, h('h3', { className: 'ch-notes-day-heading' }, groupLabel(key, items[0])), items.map((note) => h(NoteCard, { key: note.id, note, request, updateNote, filterTag }))))),
          paginationLimited && h('p', { className: 'ch-note-feedback ch-notes-error', role: 'status' }, t('notesPaginationLimit')),
          notes.length > 0 && h('div', { className: 'ch-notes-pagination' }, hasMore ? h('button', { className: 'ch-btn', type: 'button', disabled: loading || loadingMore, onClick: () => void load(true, nextBefore) }, icon('down', 14), t(loadingMore ? 'notesLoading' : 'notesLoadMore')) : h('p', null, paginationLimited ? t('notesCount', { count: notes.length }) : t('notesEnd')))));
    }
    const NotesView = React.memo(Notes);
    function Home({ ctx }) {
      const { t, active } = useLocale();
      const [state, setState] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
      const [now, setNow] = useState(Date.now()), [edit, setEdit] = useState(false), [modal, setModal] = useState(null);
      const [view, setView] = useState('work'), [recordFocus, setRecordFocus] = useState(0);
      const composerRef = useRef(null), focusCardRef = useRef(null), taskInputRef = useRef(null), scrollRef = useRef(null), viewScroll = useRef({}), pendingScroll = useRef(null), handledRecordFocus = useRef(0);
      const switchView = (next) => {
        if (next === view) return;
        const root = scrollRef.current;
        if (root) {
          viewScroll.current[view] = root.scrollTop;
          pendingScroll.current = viewScroll.current[next] ?? root.scrollTop;
        }
        setView(next);
      };
      useLayoutEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        // Restore only our own scroll area; never scroll a Harness ancestor.
        if (pendingScroll.current !== null) { root.scrollTop = pendingScroll.current; pendingScroll.current = null; }
        const input = composerRef.current;
        if (view !== 'notes' || recordFocus === handledRecordFocus.current || !input) return;
        handledRecordFocus.current = recordFocus;
        input.focus({ preventScroll: true });
        const field = input.getBoundingClientRect(), bounds = root.getBoundingClientRect();
        root.scrollTop += field.top - bounds.top - Math.max(16, (root.clientHeight - field.height) / 2);
      }, [recordFocus, view]);
      const [taskTitle, setTaskTitle] = useState(''), [taskArea, setTaskArea] = useState('学习'), [showDone, setShowDone] = useState(false);
      const [category, setCategory] = useState('全部'), [query, setQuery] = useState(''), [selectedTask, setSelectedTask] = useState('');
      const [drag, setDrag] = useState(null), [drop, setDrop] = useState(null), [quote, setQuote] = useState(Math.floor(Date.now() / 86400000) % QUOTES.length);
      const mounted = useRef(true), pending = useRef(0), queue = useRef(Promise.resolve()), completing = useRef(null), controllers = useRef(new Set());
      const closeModal = useCallback(() => setModal(null), []);
      const request = useCallback(async (action) => {
        const controller = new AbortController(); controllers.current.add(controller);
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch('/api/chen-home', { method: action ? 'POST' : 'GET', headers: action ? { 'Content-Type': 'application/json' } : undefined, body: action ? JSON.stringify(action) : undefined, credentials: 'same-origin', signal: controller.signal });
          const value = await response.json().catch(() => ({ error: '服务暂时不可用，请重试。' }));
          if (!response.ok) throw new Error(value.error || `请求失败 (${response.status})`);
          if (mounted.current) setState((previous) => !previous || value.revision >= previous.revision ? value : previous);
          return value;
        } finally { clearTimeout(timeout); controllers.current.delete(controller); }
      }, []);
      const refresh = useCallback(() => request().then(() => { if (mounted.current) setError(''); }).catch((err) => { if (mounted.current) setError(err.name === 'AbortError' ? '连接超时，请稍后重试。' : err.message); }), [request]);
      const run = useCallback((action) => {
        pending.current++; setBusy(true);
        const work = queue.current.then(() => request(action));
        queue.current = work.catch(() => {});
        return work.then((value) => { if (mounted.current) setError(''); return value; }).catch((err) => { if (mounted.current) { setError(err.name === 'AbortError' ? '保存超时，请刷新检查后重试。' : err.message); void request().catch(() => {}); } throw err; }).finally(() => { pending.current--; if (mounted.current) setBusy(pending.current > 0); });
      }, [request]);
      const act = (action) => { void run(action).catch(() => {}); };
      useEffect(() => {
        mounted.current = true; void refresh();
        const tick = setInterval(() => setNow(Date.now()), 1000);
        const poll = setInterval(() => { if (!pending.current && !document.hidden) void refresh(); }, 15000);
        const visible = () => { if (!document.hidden && !pending.current) void refresh(); };
        document.addEventListener('visibilitychange', visible);
        return () => { mounted.current = false; clearInterval(tick); clearInterval(poll); document.removeEventListener('visibilitychange', visible); for (const controller of controllers.current) controller.abort(); };
      }, [refresh]);
      useEffect(() => {
        const timer = state?.timer;
        if (timer?.status === 'running' && timer.endsAt <= now && completing.current !== timer.id) {
          completing.current = timer.id;
          // A concurrent poll or another tab may already have settled this timer; get is idempotent.
          void run({ action: 'get' }).catch(() => { completing.current = null; });
        }
      }, [state?.timer, now, run]);
      const beginDrag = (event, kind, id) => {
        if (busy) { event.preventDefault(); return; }
        event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-chen-home', JSON.stringify({ kind, id })); setDrag({ kind, id });
      };
      const dropOn = (event, kind, id) => {
        event.preventDefault(); setDrop(null); setDrag(null);
        if (busy || !edit) return;
        let source; try { source = JSON.parse(event.dataTransfer.getData('application/x-chen-home')); } catch { return; }
        if (source.kind !== kind || source.id === id) return;
        if (kind === 'card') {
          const order = [...state.layout], from = order.indexOf(source.id), to = order.indexOf(id);
          if (from < 0 || to < 0) return;
          order.splice(from, 1); order.splice(to, 0, source.id); act({ action: 'layout.set', order, expectedRevision: state.revision });
        } else { const toIndex = state.bookmarks.findIndex((b) => b.id === id); if (toIndex >= 0) act({ action: 'bookmark.move', id: source.id, toIndex, expectedRevision: state.revision }); }
      };
      const dropProps = (kind, id) => ({ onDragOver: (e) => { if (edit && drag?.kind === kind) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDrop(id); } }, onDrop: (e) => dropOn(e, kind, id), onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrop(null); } });
      const move = (kind, id, direction) => {
        const list = kind === 'card' ? state.layout : state.bookmarks.map((b) => b.id), index = list.indexOf(id), next = index + direction;
        if (next < 0 || next >= list.length) return;
        if (kind === 'card') { const order = [...list]; order.splice(index, 1); order.splice(next, 0, id); act({ action: 'layout.set', order, expectedRevision: state.revision }); }
        else act({ action: 'bookmark.move', id, toIndex: next, expectedRevision: state.revision });
      };
      const ib = (name, label, onClick, extra = {}) => h('button', { type: 'button', className: 'ch-iconbtn', 'aria-label': label, title: label, onClick, disabled: busy, ...extra }, icon(name, 14));
      const draft = (prompt) => ctx.uiWorkspace.startSession(undefined, { prompt, whenDraftExists: 'append' });
      const addTask = async (e) => { e.preventDefault(); if (!taskTitle.trim()) return; try { await run({ action: 'task.add', title: taskTitle.trim(), area: taskArea }); setTaskTitle(''); } catch { /* error is displayed by run */ } };
      const search = (e) => {
        e.preventDefault(); if (!query.trim()) return;
        const roots = { google: 'https://www.google.com/search?q=', bing: 'https://www.bing.com/search?q=', baidu: 'https://www.baidu.com/s?wd=' };
        window.open(roots[state.settings.searchEngine] + encodeURIComponent(query.trim()), '_blank', 'noopener,noreferrer');
      };
      const background = state?.settings.background || DEFAULT_BACKGROUND, photo = backgroundUrl(background);
      const shell = (...children) => h('div', { ref: scrollRef, className: 'ch-home' + (photo ? ' ch-photo' : ''), 'data-testid': 'chen-home', 'data-background': background.type, style: photo ? { backgroundImage: `linear-gradient(color-mix(in srgb,var(--ch-bg) ${background.dim}%,transparent),color-mix(in srgb,var(--ch-bg) ${background.dim}%,transparent)),url(${JSON.stringify(photo)})` } : undefined }, h('style', null, css), h('div', { className: 'ch-sky' }), ...children);
      if (!state) return shell(h('div', { className: 'ch-loading', 'aria-busy': !error }, h('div', { className: 'ch-loading-panel' }, icon(error ? 'reset' : 'home', 26), error ? h(React.Fragment, null, h('p', { role: 'alert' }, displayError(error, t)), h('button', { className: 'ch-btn', onClick: refresh }, t('reconnect'))) : h('p', { role: 'status' }, t('loading')))));
      const time = new Date(now), hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23' }).format(time));
      const greeting = hour < 6 ? t('lateNight') : hour < 11 ? t('morning') : hour < 14 ? t('noon') : hour < 18 ? t('afternoon') : t('evening');
      const done = state.tasks.filter((t) => t.done).length, tasks = state.tasks.filter((t) => showDone || !t.done);
      const todayLog = state.focusLog.filter((entry) => dayKey(entry.completedAt) === dayKey(now));
      const minutes = todayLog.reduce((total, entry) => total + entry.minutes, 0);
      const timer = state.timer, remaining = Math.max(0, timer.status === 'running' ? timer.endsAt - now : timer.remainingMs), seconds = Math.ceil(remaining / 1000);
      const timerText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      const weekday = (new Date(time.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })).getDay() + 6) % 7;
      const card = (id, symbol, badge, body) => h('section', { key: id, ref: id === 'focus' ? focusCardRef : undefined, 'data-card': id, className: `ch-card${drop === id ? ' ch-drop' : ''}${drag?.id === id ? ' ch-dragging' : ''}`, ...dropProps('card', id) },
        edit && h('div', { className: 'ch-dragbar' }, h('button', { type: 'button', className: 'ch-handle', draggable: !busy, onDragStart: (e) => beginDrag(e, 'card', id), onDragEnd: () => { setDrag(null); setDrop(null); }, 'aria-label': t('dragCard', { title: t(TITLES[id]) }) }, icon('grip', 13), t('dragSort')), h('div', null, ib('up', t('moveEarlier', { title: t(TITLES[id]) }), () => move('card', id, -1), { disabled: busy || state.layout.indexOf(id) === 0 }), ib('down', t('moveLater', { title: t(TITLES[id]) }), () => move('card', id, 1), { disabled: busy || state.layout.indexOf(id) === state.layout.length - 1 }))),
        h('div', { className: 'ch-card-head' }, h('span', { className: 'ch-card-symbol' }, icon(symbol)), h('h2', null, t(TITLES[id])), h('span', { className: 'ch-card-badge' }, badge)), h('div', { className: 'ch-card-body' }, body));
      const cards = {
        tasks: card('tasks', 'list', `${done} / ${state.tasks.length}`, h(React.Fragment, null,
          h('form', { className: 'ch-taskform', onSubmit: addTask }, h('input', { ref: taskInputRef, value: taskTitle, onChange: (e) => setTaskTitle(e.target.value), placeholder: t('taskPlaceholder'), 'aria-label': t('newTask'), maxLength: 160, required: true, disabled: busy }), h('select', { value: taskArea, onChange: (e) => setTaskArea(e.target.value), 'aria-label': t('taskCategory'), disabled: busy }, AREAS.map((a) => h('option', { key: a, value: a }, displayLabel(a, t)))), h('button', { type: 'submit', className: 'ch-btn ch-primary', disabled: busy || !taskTitle.trim(), 'aria-label': t('addTask') }, icon('plus', 16))),
          tasks.length ? h('ul', { className: 'ch-tasklist' }, tasks.map((task) => h('li', { className: 'ch-task' + (task.done ? ' ch-done' : ''), key: task.id }, h('input', { type: 'checkbox', className: 'ch-check', checked: task.done, disabled: busy, onChange: () => act({ action: 'task.update', id: task.id, done: !task.done }), 'aria-label': t(task.done ? 'restoreTask' : 'completeTask', { title: task.title }) }), h('span', { className: 'ch-task-title' }, task.title), h('span', { className: 'ch-area' }, displayLabel(task.area, t)), h('div', { className: 'ch-task-ops' }, !task.done && ib('play', t('focusTask', { title: task.title }), () => { if (timer.status === 'running' || timer.status === 'paused') { setError('请先结束或重置当前计时，再切换专注任务。'); return; } setSelectedTask(task.id); void (async () => { if (timer.mode !== 'focus') await run({ action: 'timer.mode', mode: 'focus' }); await run({ action: 'timer.start', taskId: task.id }); })().catch(() => {}); }), ib('edit', t('editTaskLabel', { title: task.title }), () => setModal({ type: 'task', value: task })), ib('trash', t('deleteTaskLabel', { title: task.title }), () => setModal({ type: 'delete', kind: 'task', value: task })))))) : h('div', { className: 'ch-empty' }, h('strong', null, done ? t('doneTasksHeading') : t('emptyTasksHeading')), done ? '休息一下，再决定下一步。' : '选一件值得做的小事，从这里开始。', !done && h('div', { className: 'ch-suggestions' }, [['跑通一个 Agent 小实验', '学习'], ['打磨一个面试案例', '求职'], ['散步 20 分钟', '生活']].map(([title, area]) => h('button', { key: title, type: 'button', onClick: () => { setTaskTitle(title); setTaskArea(area); taskInputRef.current?.focus({ preventScroll: true }); } }, '+ ' + title)))),
          h('div', { className: 'ch-task-foot' }, h('span', null, state.tasks.length ? t('tasksRemaining', { count: state.tasks.length - done }) : '小步推进，也是在前进'), h('button', { type: 'button', onClick: () => setShowDone(!showDone) }, showDone ? t('hideCompleted') : t('completedCount', { count: done }))),
          state.tasks.length > 0 && h('div', { className: 'ch-progress', style: { marginTop: 10 } }, h('span', { style: { width: `${done / state.tasks.length * 100}%` } })) )),
        focus: card('focus', 'timer', t('pomodoro'), h(React.Fragment, null,
          h('div', { className: 'ch-timer-top' }, ['focus', 'break'].map((mode) => h('button', { key: mode, type: 'button', className: timer.mode === mode ? 'ch-selected' : '', disabled: busy || timer.status === 'running' || timer.status === 'paused', onClick: () => act({ action: 'timer.mode', mode }) }, mode === 'focus' ? t('focus') : t('break')))),
          h('div', { className: 'ch-timer-main' }, h('div', { className: 'ch-ring', style: { '--ch-progress': `${Math.max(0, Math.min(100, (1 - remaining / timer.durationMs) * 100))}%` } }, h('div', { className: 'ch-ring-inner' }, h('span', { className: 'ch-countdown', 'aria-label': t('remainingTime', { time: timerText }) }, timerText), h('span', { className: 'ch-timer-status', role: 'status' }, { idle: t('timerIdle'), running: timer.mode === 'focus' ? t('timerFocus') : t('timerBreak'), paused: t('timerPaused'), completed: timer.mode === 'focus' ? t('timerComplete') : t('breakComplete') }[timer.status]))), h('div', { className: 'ch-timer-details' }, h('select', { value: timer.status === 'running' || timer.status === 'paused' ? timer.taskId || '' : state.tasks.some((t) => t.id === selectedTask && !t.done) ? selectedTask : '', disabled: busy || timer.mode === 'break' || timer.status === 'running' || timer.status === 'paused', onChange: (e) => setSelectedTask(e.target.value), 'aria-label': t('selectTask') }, h('option', { value: '' }, t('freeFocus')), state.tasks.filter((t) => !t.done || t.id === timer.taskId).map((t) => h('option', { key: t.id, value: t.id }, t.title))), h('p', null, timer.mode === 'focus' ? '关掉多余的标签页，把这一刻留给眼前的事。' : '站起来，看看远处，让大脑也透口气。'))),
          h('div', { className: 'ch-timer-actions' }, h('button', { type: 'button', className: 'ch-btn ch-primary', disabled: busy, onClick: () => act(timer.status === 'running' ? { action: 'timer.pause' } : { action: 'timer.start', ...(timer.status !== 'paused' ? { taskId: state.tasks.some((t) => t.id === selectedTask && !t.done) ? selectedTask : null } : {}) }) }, icon(timer.status === 'running' ? 'pause' : 'play', 14), timer.status === 'running' ? t('pause') : timer.status === 'paused' ? t('resume') : timer.status === 'completed' ? t('anotherRound') : timer.mode === 'focus' ? t('startFocus') : t('startBreak')), h('button', { type: 'button', className: 'ch-btn', 'aria-label': t('resetTimer'), title: t('resetHint'), disabled: busy || timer.status === 'idle', onClick: () => act({ action: 'timer.reset' }) }, icon('reset', 14))),
          h('div', { className: 'ch-focus-stats' }, h('span', null, t('todayPrefix'), h('b', null, todayLog.length), ' / ', state.settings.dailyGoal, t('sessionsSuffix')), h('span', null, t('focusedPrefix'), h('b', null, minutes), t('minutesSuffix'))) )),
        projects: card('projects', 'grid', t('yourPath'), h(React.Fragment, null, h('div', { className: 'ch-projects' }, PROJECTS.map(([mark, title, subtitle, id, prompt]) => h('button', { key: id, type: 'button', className: 'ch-project', onClick: () => draft(prompt) }, h('span', { className: 'ch-project-mark' }, mark), h('span', null, h('strong', null, title), h('small', null, subtitle))))), h('p', { className: 'ch-hint' }, t('projectHint')))),
        rhythm: card('rhythm', 'leaf', t('lifeMatters'), h(React.Fragment, null, h('div', { className: 'ch-rhythm-list' }, [['sun', 'moveBody', '散步、拉伸，给身体一点时间', '散步或拉伸 20 分钟'], ['heart', 'familyTime', '工作有进展，陪伴也别缺席', '留一段不看手机的陪伴时间'], ['cup', 'windDown', '记下一点收获，安心结束一天', '写下今天的一个收获']].map(([symbol, title, text, task]) => h('div', { key: title, className: 'ch-rhythm' }, h('span', { className: 'ch-rhythm-icon' }, icon(symbol, 15)), h('div', null, h('strong', null, t(title)), h('small', null, text)), ib('plus', t('addTaskLabel', { title: task }), () => act({ action: 'task.add', title: task, area: '生活' }))))), h('div', { className: 'ch-week', 'aria-label': t('weekDay', { day: weekday + 1 }) }, Array.from({ length: 7 }, (_, i) => h('span', { key: i, className: i < weekday ? 'ch-past' : i === weekday ? 'ch-today' : '' })), h('small', null, t('weekLabel'))))),
      };
      const navigation = h('nav', { className: 'ch-viewbar', 'aria-label': t('workspace') }, h('div', { className: 'ch-view-tabs' }, [['work', 'workTab', 'grid'], ['notes', 'notesTab', 'note']].map(([value, label, symbol]) => h('button', { key: value, type: 'button', className: view === value ? 'ch-selected' : '', 'aria-pressed': view === value, onClick: () => { switchView(value); if (value === 'notes') setEdit(false); } }, icon(symbol, 14), t(label)))), h('span', { className: 'ch-view-hint' }, t(view === 'notes' ? 'notesSubtitle' : 'shortcutsHint')));
      return shell(h('div', { className: 'ch-wrap' },
        h('header', { className: 'ch-topbar' }, h('div', { className: 'ch-wordmark' }, h('span', { className: 'ch-brand-dot' }, icon('home', 17)), t('brand'), h('small', null, t('tagline'))), navigation, h('div', { className: 'ch-actions' }, h('button', { className: 'ch-btn ch-primary', onClick: () => { switchView('notes'); setEdit(false); setRecordFocus((value) => value + 1); } }, icon('note', 14), t('writeNote')), h('button', { className: 'ch-btn', onClick: () => setModal({ type: 'background' }), 'aria-label': t('changeBackground'), title: t('changeBackground') }, icon('image', 14), h('span', { className: 'ch-action-label' }, t('changeBackground'))), h('button', { className: 'ch-btn' + (edit ? ' ch-active' : ''), onClick: () => { switchView('work'); setEdit(!edit); setCategory('全部'); setDrag(null); setDrop(null); }, 'aria-pressed': edit, 'aria-label': t(edit ? 'finishLayout' : 'editLayout'), title: t(edit ? 'finishLayout' : 'editLayout') }, icon(edit ? 'check' : 'grid', 13), h('span', { className: 'ch-action-label' }, edit ? t('finishLayout') : t('editLayout'))), h('button', { className: 'ch-btn', onClick: () => setModal({ type: 'settings' }), 'aria-label': t('homeSettings') }, icon('settings', 14)))),
        error && h('div', { className: 'ch-banner ch-error', role: 'alert' }, h('span', null, displayError(error, t)), h('button', { className: 'ch-btn', onClick: refresh }, t('refresh')), ib('close', t('dismiss'), () => setError(''))),
        h('section', { className: 'ch-hero', hidden: view !== 'work' },
          h('div', { className: 'ch-greeting' },
            h('div', { className: 'ch-time' }, h('span', null, new Intl.DateTimeFormat(active.startsWith('zh') ? 'zh-CN' : 'en-US', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'long' }).format(time)), h('span', { className: 'ch-live-dot' }), h('span', null, new Intl.DateTimeFormat(active.startsWith('zh') ? 'zh-CN' : 'en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(time))),
            h('h1', null, greeting + t('greetingSeparator'), h('em', null, state.settings.name), t('greetingEnd')),
            h('p', { className: 'ch-subtitle' }, t(hour < 6 ? 'lateNightSubtitle' : 'daySubtitle'))),
          h('dl', { className: 'ch-day-summary', 'aria-label': t('todayOverview') },
            h('div', null, h('dt', null, t('pendingTasks')), h('dd', null, state.tasks.length - done, h('small', null, t('taskUnit')))),
            h('div', null, h('dt', null, t('todayFocus')), h('dd', null, todayLog.length, h('small', null, '/ ' + state.settings.dailyGoal))),
            h('div', null, h('dt', null, t(timer.status === 'running' ? (timer.mode === 'break' ? 'timerRest' : 'timerFocus') : timer.status === 'paused' ? 'timerPaused' : 'focus')), h('dd', null, h('button', { type: 'button', className: 'ch-summary-focus', onClick: () => { const root = scrollRef.current, card = focusCardRef.current; if (root && card) { root.scrollTop += card.getBoundingClientRect().top - root.getBoundingClientRect().top - 16; card.querySelector('.ch-timer-actions button')?.focus({ preventScroll: true }); } }, 'aria-label': t('goToTimer') }, timerText, icon('arrow', 14)))))),
        h('div', { className: 'ch-utility', hidden: view !== 'work' },
          h('form', { className: 'ch-search', onSubmit: search, role: 'search' }, icon('search', 17), h('input', { value: query, onChange: (e) => setQuery(e.target.value), placeholder: t('searchPlaceholder'), 'aria-label': t('searchContent') }), h('select', { value: state.settings.searchEngine, 'aria-label': t('searchEngine'), disabled: busy, onChange: (e) => act({ action: 'settings.update', settings: { searchEngine: e.target.value } }) }, [['google', t('google')], ['bing', t('bing')], ['baidu', t('baidu')]].map(([value, label]) => h('option', { key: value, value }, label))), h('button', { className: 'ch-btn ch-primary', type: 'submit', 'aria-label': t('search'), disabled: !query.trim() }, icon('arrow', 16)))),
        h('section', { className: 'ch-shortcuts', hidden: view !== 'work', 'aria-label': t('shortcuts') }, h('div', { className: 'ch-section-head' }, h('div', { className: 'ch-section-label' }, t('shortcutsHeading'), h('span', null, t('dailyDirection'))), h('div', { className: 'ch-tabs', 'aria-label': t('shortcutCategories') }, ['全部', '学习', '求职', '项目', '创作', '生活', '资讯'].map((cat) => h('button', { key: cat, className: 'ch-tab' + (cat === category ? ' ch-selected' : ''), 'aria-pressed': cat === category, disabled: edit && cat !== '全部', onClick: () => setCategory(cat) }, displayLabel(cat, t))))), h('div', { className: 'ch-link-grid' }, state.bookmarks.filter((b) => category === '全部' || b.category === category).map((b, index) => h('div', { key: b.id, 'data-bookmark': b.id, 'data-category': b.category, className: `ch-link${edit ? ' ch-edit-link' : ''}${drop === b.id ? ' ch-drop' : ''}${drag?.id === b.id ? ' ch-dragging' : ''}`, ...dropProps('bookmark', b.id) }, h('a', { href: b.url, target: '_blank', rel: 'noopener noreferrer', title: `${b.title} · ${new URL(b.url).hostname}`, draggable: edit && !busy, onClick: (e) => { if (edit) { e.preventDefault(); setModal({ type: 'bookmark', value: b }); } }, onDragStart: (e) => { if (edit) beginDrag(e, 'bookmark', b.id); else e.preventDefault(); }, onDragEnd: () => { setDrag(null); setDrop(null); } }, h(BookmarkLogo, { bookmark: b }), h('span', { className: 'ch-link-name' }, b.title)), edit && h('div', { className: 'ch-link-controls' }, ib('up', t('moveBookmarkEarlier', { title: b.title }), () => move('bookmark', b.id, -1), { disabled: busy || index === 0 }), ib('down', t('moveBookmarkLater', { title: b.title }), () => move('bookmark', b.id, 1), { disabled: busy || index === state.bookmarks.length - 1 }), ib('edit', t('editBookmarkLabel', { title: b.title }), () => setModal({ type: 'bookmark', value: b })), ib('trash', t('deleteBookmarkLabel', { title: b.title }), () => setModal({ type: 'delete', kind: 'bookmark', value: b }))))), h('button', { className: 'ch-link ch-link-add', onClick: () => setModal({ type: 'bookmark' }), disabled: busy }, icon('plus', 22), t('addLink')))),
        edit && h('div', { className: 'ch-edit-note' }, t('layoutHint')),
        h('div', { hidden: view !== 'work' }, h('main', { className: 'ch-grid', 'aria-label': t('workspace'), 'aria-busy': busy }, state.layout.map((id) => cards[id]))),
        h('div', { hidden: view !== 'notes', className: 'ch-notes-view' }, h(NotesView, { composerRef })),
        h('footer', null, h('div', { className: 'ch-footer' }, icon('leaf', 15), h('span', null, QUOTES[quote]), ib('reset', t('nextQuote'), () => setQuote((quote + 1) % QUOTES.length))), h('div', { className: 'ch-footer-sign' }, 'CHEN HOME · 每一天，都算数')),
        modal && (modal.type === 'background' ? h(BackgroundEditor, { state, run, close: closeModal }) : h(Editor, { key: modal.type + (modal.value?.id || ''), model: modal, state, run, close: closeModal }))
      ));
    }
    return {
      inject: ['slots', 'uiWorkspace', 'locale'],
      apply(ctx) {
        for (const [locale, index] of [['zh', 0], ['en', 1]]) {
          ctx.effect(() => ctx.locale.register(NS, locale, Object.fromEntries(Object.entries(MESSAGES).map(([key, text]) => [key, text[index]]))));
        }
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'chen-home', order: -25, label: ctx.locale.bind(NS)('brand') }, ({ size }) => h(Icon, { name: 'home', size })));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'chen-home' }, () => h(LocaleProvider, { ctx }, h(Home, { ctx }))));
      },
    };
  },
});
