# Chen Home 0.2.2 UI 精修与验收

日期：2026-11-08（Asia/Shanghai）。负责人：home-builder，团队任务 task-2。代码基线为 main `5b90511`。本文保留实现验收时的事实；随后用户已授权发布，最新远端与资产状态以[发布记录](release-20261108.md)为准。实际宿主安装和验收由 Lead 统一完成。

## 设计依据与结果

Lead 从已安装的 `qiaomu-ui-learn-dsh@0.1.4` 参考库提供两份真实页面截图：

- [Quillmark dashboard](https://agent.kombai.com/kombai-inspiration-library/app-pages/dashboards/web/65/index.html)：借鉴安静的页面层级、问候与当天信息并列、克制分隔；没有复制原站指标或商业化横幅。
- [Fieldnote dashboard](https://agent.kombai.com/kombai-inspiration-library/app-pages/dashboards/web/7/index.html)：借鉴文字密度、整齐的对齐线、卡片留白与轻量导航；保留 Chen Home 的照片背景、个人路径和 Host 主题。

具体变化：工作台/笔记切换进入顶部工具栏；问候收紧为姓名、日期和真实待办/番茄/计时摘要；书签变为紧凑横向入口；任务和番茄钟提前进入桌面首屏，手机摘要一按直达专注按钮。笔记页不再保留工作台的问候、搜索和书签占位，直接进入编辑器与按日期分组的时间流。正文保持 14px、1.9 行高，层级、边界和间距通过同一组 Host 语义颜色适配深浅色。小屏分配单独的工具栏、书签横滚和任务操作布局。

`client.js` 的 CSS 从大段单行展开为按区域可读的规则；样式全部在 `ch-*`/`.ch-home` 范围内。未引入通用组件平台、依赖、私有 Host API、宿主 DOM 查询或新业务端点。原有项目按钮仍只准备对话草稿。

## 同条件前后测量

隔离浏览器加载真实 `client.js`，工作台请求由真实 `core.js` 在内存存储执行；使用同一组演示任务、相同视口和背景。所有 HTTP 请求拦截，不连接 Host profile 或 Flomo。每张图片顶部明确标识“隔离回归 / 真实生产组件 / 演示数据 / 非宿主验收”。

| 条件 | 修改前任务顶部 | 修改后任务顶部 | 提前 | 修改后计时卡顶部 | 横向溢出 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 桌面 1440×1000，浅/深 | 677.19px | 482.48px | 194.70px | 482.48px | 0px |
| 手机 390×844，浅/深 | 948.69px | 559.98px | 388.70px | 1013.30px | 0px |

手机专注卡按正常卡片顺序在任务之后；摘要计时按钮在首屏，点击只滚动本插件并将焦点交给专注按钮，避免长任务列表阻断入口。原始测量在 `artifacts/ui-before/measurements.json`、`artifacts/ui-after/measurements.json`。

| 截图 | 修改前工作台 | 修改后工作台 |
| --- | --- | --- |
| 桌面浅色 | [前](https://github.com/JavaArthur/chen-home-dsh/releases/download/v0.2.2/desktop-light-before.png) | [后](https://github.com/JavaArthur/chen-home-dsh/releases/download/v0.2.2/desktop-light-after.png) |
| 桌面深色 | [前](https://github.com/JavaArthur/chen-home-dsh/releases/download/v0.2.2/desktop-dark-before.png) | [后](https://github.com/JavaArthur/chen-home-dsh/releases/download/v0.2.2/desktop-dark-after.png) |
| 手机浅色 | [前](https://github.com/JavaArthur/chen-home-dsh/releases/download/v0.2.2/mobile-light-before.png) | [后](https://github.com/JavaArthur/chen-home-dsh/releases/download/v0.2.2/mobile-light-after.png) |
| 手机深色 | [前](https://github.com/JavaArthur/chen-home-dsh/releases/download/v0.2.2/mobile-dark-before.png) | [后](https://github.com/JavaArthur/chen-home-dsh/releases/download/v0.2.2/mobile-dark-after.png) |

上表的 8 张隔离演示截图作为私有 GitHub Release 附件提供（需要仓库访问权限），不进入插件包或源码树。它们不含真实用户数据；真实 Host 截图保留本机，不上传。笔记入口四象限截图仍为本机证据，位于 `artifacts/ui-after/*-notes.png`，不是发布网页链接。工作台前后采用相同初始滚动位置；历史笔记基线截图曾主动定位到编辑器，本次笔记截图采用正常标签切换后的顶部，展示新入口组织，不拿二者做像素位移统计。Lead 另已获取真实已装版本基线截图，不能用以上图片代替真实 Host 验收。

## 行为与完整检查

本轮 `npm run check`：**73 通过、0 失败、0 跳过**。包括 54 项既有业务测试、9 个既有滚动场景、8 个新增交互场景及两个父用例。没有删除旧测试、skip 旧用例或放宽已有断言。

- 既有 1440/960/390px 回归：中段可信滚轮移动 400px；上下边界不带动祖先；普通标签不重放“记一笔”焦点；草稿与各视图滚动位置保留；无横向溢出。
- 新增 375px 深浅色：任务进入首屏范围；计时摘要只滚自有容器，焦点落到专注动作。
- 通过生产 UI 添加、关联计时、推进时钟、暂停、真实 page.reload、完成任务；确认计时 ID 和剩余时间恢复。
- 模拟工作台写入失败：持久状态不变，输入保留；恢复后仅增加一条任务。
- Flomo 请求在途挂起时真实 page.reload：提交前已同步存好原 content/requestId 与 uncertain 时间，刷新后草稿/禁编辑/禁提交保留，默认读取时间流后仍须明确核对；不自动重试，create 次数保持 1。
- 已有草稿的本地锁写入抛 QuotaExceededError：明确提示本次尚未发送，create 次数为 0，原磁盘草稿和当前输入不变；恢复存储后模拟成功回执，仅发送 1 次并清空草稿。
- 初始加载、连接失败重连、空笔记、搜索无结果、读取错误分别可识别；读取失败不清空未提交草稿。
- 背景弹窗跳过隐藏上传输入，键盘焦点留在弹窗，Escape 返回触发按钮且不滚动外层页面。

Flomo 核对锁是审核中发现的旧边界修复：原版只在当前内存记住“未知”，刷新可丢失锁。现仅给本地未提交草稿增加兼容的 `uncertain` / `uncertainAfter` 元数据；成功收到 note.id 才清空，明确未写入错误才解除保护。`core.js`、`index.js`、`flomo.js`、`media.js` 和数据 schema 均未改变。Flomo 仍是正式笔记唯一来源。

独立工程审核最终 **5/5 通过、PASS**：真实 core 持久化失败回滚与重试、计时到期单次结算且不自动休息、未知结果后刷新、请求在途立即刷新、本地锁写入失败禁止发送及恢复。独立 UX 审核 **布局 37/37、笔记故障闭环 6/6、本地存储失败提示 3/3 全部通过**，无剩余 UX 阻断；并单独重跑既有 scroll.test.js **10/10（含父用例）、0 skip**，1440/960/390px 上下边界宿主 0 漂移。审核员目检 1440px 浅色工作台及 375px 深色笔记/故障态。以上仍是生产组件隔离测试；Lead 真实 Host 验收另计，不用隔离结果宣称 fresh Host generation。

以下审核证据为仅本机文件路径，不是网页链接：UX 布局（仅本机：`/Volumes/Storage/ai/80-outputs/project-upgrade-2026-11-08/reviews/ux/home-layout-probe-result.json`）、笔记闭环（仅本机：`/Volumes/Storage/ai/80-outputs/project-upgrade-2026-11-08/reviews/ux/home-notes-probe-result.json`）、存储失败 UI（仅本机：`/Volumes/Storage/ai/80-outputs/project-upgrade-2026-11-08/reviews/ux/home-storage-ui-probe-result.json`）、独立旧滚动回归（仅本机：`/Volumes/Storage/ai/80-outputs/project-upgrade-2026-11-08/reviews/ux/home-scroll-independent.tap`）。

## 真实 Host 当前 Client 验收

Lead 已在隔离 ego 窗口的真实 Host 验证：新顶部双标签、记录动作与摘要已呈现；1668×907 下任务/计时顶部为 452.49px，开始专注按钮底部 763.89px，均在首屏，横向溢出 0。普通笔记标签不聚焦编辑器，只有“记一笔”聚焦。计时摘要让插件内层滚动 0→363px，外层 y 仍为 0，焦点正确落到计时按钮；没有新增或更改真实任务/计时/Flomo 数据。当前 Host 截图（仅本机：`/Volumes/Storage/ai/80-outputs/project-upgrade-2026-11-08/references/chen-home-host-current.png`）由实现者复看确认新版布局。

实际 Flomo 时间流只读列表成功返回 30 条，loading=false、无连接表单/读取错误，未额外获取正文或写入。CDP 375×812 的真实 Host 移动视口中插件宽 370px、横向溢出 0，任务顶部 577.99px、计时摘要顶部 311.99px；摘要跳转内层 0→810px，外层 y 始终为 0，焦点落到计时动作。真实 Host 手机截图（仅本机：`/Volumes/Storage/ai/80-outputs/project-upgrade-2026-11-08/references/chen-home-host-mobile.png`）。Lead 已还原隔离浏览器视口并回到 Home 顶部。

官方 `plugin_manager` 安装调用回执为 `already-installed`、`enabled: true`、`changed: false`。Lead 保留现有链接，没有卸载或重启。当前 Host 已呈现并使用新版 Client；未验证 fresh Host generation，且本轮 Host 业务文件未改。不要把这一结果扩写为“重启后新代际已验”。

## 复现方式与局限

本机使用现成依赖，无安装动作：

```sh
CHEN_SCROLL_PLAYWRIGHT=/Volumes/Storage/ai/30-projects/channing-studio/node_modules/playwright/index.mjs \
CHEN_SCROLL_REACT_UMD_DIR=/Volumes/Storage/ai/31-dl-project/wormhole/wormhole-chat/node_modules \
CHEN_SCROLL_BROWSER=/Users/channing/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell \
npm run check
```

同环境运行 `node test/capture-ui.mjs ui-after` 重建四象限工作台/笔记截图。React 18.3.1 UMD、Playwright 1.64、Chromium headless shell 1248；所有测试在隔离浏览器完成。浏览器变量缺失会明确 skip，不能算完整验收通过。

已验真实 Host 当前 Client；未验证重启后的 fresh Host generation、真实 Flomo 写入、系统文件选择器或 Electron 原生拖动区域。浏览器禁用本地存储时草稿只留当前页，界面显示相应提示；无法持久化提交锁就不发送 Flomo，请先允许本地存储或复制草稿。跨刷新本地草稿恢复不保证。本轮没有操作系统鼠标键盘、抢窗口、重启或刷新用户前台，也没有修改其他插件/profile。
