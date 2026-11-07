# Chen Home

C哥的 DSH 个人工作台，版本 **0.2.2**。独立包 `chen-home-dsh`，侧栏入口 **Chen Home**；与原有主页并存，可单独迭代。

版本资产、远端校验与安装边界见[0.2.2 发布记录](docs/release-20261108.md)；截图与设计说明见[UI 验收说明](docs/ui-polish-review.md)。私有仓库的 Release 资产需要仓库访问权限。

围绕学习、求职、作品积累与日常生活设计。照片背景、真实网站图标、Flomo 随手记、任务与番茄钟放在同一页；支持宿主深浅色和中英文，窄屏折叠为单列。

## 使用

- **记一笔**：顶部按钮直接定位笔记输入框。输入正文和 `#标签`，点击“保存到 Flomo”后才写入。未提交草稿保存在当前设备，切换页面后可以继续写。
- **笔记时间流**：按日期倒序显示自己的 Flomo 笔记，支持关键词搜索、点击标签筛选、刷新、加载更早的笔记、展开全文和打开 Flomo 原文。图片按需加载。工作台与笔记页分别保留滚动位置；普通标签切换不会自动抢输入焦点，只有“记一笔”主动定位输入框。滚动到边界时不会继续带动外层页面。
- **换背景**：顶部按钮提供海岸、森林、暮色、极光渐变，也可以填 HTTPS 图片网址或上传本地 PNG/JPG/WebP（最大 3 MiB）。遮罩范围 0–80%，预览后点“使用这个背景”。上传图片保存在当前 DSH profile，本地图片引用不会把大段数据塞进每次计时同步。
- **搜索与快捷入口**：支持 Google / Bing / 百度。内置入口使用网站 Logo；个人研报与复盘入口使用独立绘制的识别图标。新增网址自动获取 favicon，失败时退回文字标记。
- **待办**：添加、分类、勾选完成、编辑、删除。没有自动跨日清空；已完成待办可以展开恢复。建议按钮只填入输入框，提交后才保存。
- **番茄钟**：顶部今日摘要显示当前计时，点击可直接定位专注卡片。默认专注 25 分钟、休息 5 分钟，每日目标 4 个。支持关联待办、暂停、继续、重置。到期显示完成，不自动开始下一轮；重置不计入完成次数。
- **布局**：点击“调整布局”，拖动卡片手柄或快捷方式；也有前移/后移按钮。拖动改变排序，快捷方式在此模式下点击可编辑。
- **项目与生活**：项目入口准备对话草稿，用户发送后执行；生活卡片加号添加对应待办；底部可换鼓励语。
- **首页设置**：称呼、专注/休息时长、每日目标、搜索引擎。正在运行或暂停的计时保留原时长。

日期和专注统计使用 `Asia/Shanghai`。工作台每 15 秒同步状态，切回页面时也同步。笔记按打开、搜索、刷新和翻页读取，不随计时器每秒请求。

## Flomo 连接与写入

连接地址固定为 `https://flomoapp.com/mcp`，使用官方 MCP SDK 的 Streamable HTTP。首次打开笔记时间流，在密码输入框配置自己的访问令牌。凭据通过 DSH Host 的 `credentials` 服务保存为 `CHEN_HOME_FLOMO_TOKEN`，每次操作重新解析；不会写入项目、普通设置、浏览器草稿或工具返回值。

页面和 `chen_home_notes` 工具共用 `chenHomeNotes` service。只开放读取、获取全文和创建；不提供更新或删除既有笔记。已有笔记仍以 Flomo 为来源，本地仅保存未提交草稿和有限的提交回执。

每次创建携带稳定 `requestId`：先保存 pending 回执，再调用 Flomo，成功后保存结果。相同 ID 和内容重试会返回已知结果；网络超时、重启或成功回执写盘失败会保留未知状态，并阻止自动重发。页面在发送前同步保存草稿的核对锁；本地锁保存失败时会明确提示，本次不发送。请求在途或结果未知时刷新页面也会保留同一 requestId 和编辑锁。遇到“结果尚不确定”，先刷新并到 Flomo 核对，再明确选择继续编辑，避免重复保存。最多保留 100 条回执，未知记录不会被自动淘汰。

Flomo 搜索单次最多返回 50 条，日期边界按天生效。页面每页显示最多 30 条并使用不透明游标；当单日密集记录超过接口可返回范围时，页面会提示使用关键词或标签缩小范围，不会声称已经完整读到所有笔记。

## 安装与迭代

原生 Cordis bundle，目标 DSH `0.2.2-rc.1`，无需单独启动网站。

```sh
npm install --ignore-scripts
npm run check
```

通过 DSH `plugin_manager` 使用本项目绝对路径执行 `install_bundle`。当前管理器对相同来源的已安装包可能返回 `already-installed`；先记录 `enabled` / `changed` 和真实页面状态，再依实际 `nextStep` 处理。若卸载因插件仍在使用或运行中映射限制被拒绝，保留已启用状态，不反复卸载、强制刷新或改写 profile 的生成配置，也不要移除其他插件。

以工具返回的 `application` / `nextStep` 判断激活状态。若返回 `restart-required`，安装完成不等于当前页面已加载新版；保留用户当前窗口，等待方便时重启 DSH。没有额外的 Vite 服务或自动 HMR 承诺。卸载插件不删除自己的数据域。

## 实现与数据边界

- `core.js`：工作台状态、动作校验、串行修改与计时结算。
- `flomo.js`：MCP 连接、分页、笔记读取、提交回执、凭据解析与生命周期。
- `media.js`：白名单静态素材与本地壁纸上传/读取；校验格式、大小和图片签名。
- `index.js`：认证 HTTP 路由、共享 Host services 和 Agent tools。
- `client.js`：React 原生 Slot 页面、主题样式、表单、拖动和数据同步。
- `assets/`：随包提供的照片、网站 favicon 和个人入口图标。
- `locale/`、`icon.svg`、`cordis.patch.yml`：本地化元数据、插件图标和 Loader 条目。
- `test/`：业务、网络边界、回执与 Host 契约回归。

三个独立 `storageDomain`：`chen_home`（工作台）、`chen_home_notes`（提交回执）、`chen_home_media`（最多 20 张去重本地壁纸）。旧版工作台读取时补充背景默认值，原任务、排序、计时与专注历史保留。工作台持久化成功后才发布新状态；拖动可以携带 revision 检查并发修改。

所有业务路由经过 DSH Connection 的认证检查，不另起服务器。外部笔记按受限格式转换成 React 文本节点，不直接插入 HTML；凭据与外部错误详情不会回显。没有将具体家庭日程、简历或财务信息嵌入默认页面。

计时基于绝对截止时间，到期只结算一次。页面未打开时不保证即时系统提醒，不会自动开始下一轮。

## Agent 操作

`chen_home` 先 `get` 读取 ID/revision，再修改任务、书签、布局、设置或计时。任务上限 200，书签上限 60，专注历史最近 1000 条。

```json
{"action":"task.add","title":"跑通一个 LangGraph 小实验","area":"学习"}
```

`chen_home_notes` 支持 `list`、`get`、`create`。只在用户明确要求保存具体内容时创建，未知结果不得换新 ID 自动重发；令牌只能在页面连接表单配置。

```json
{"action":"list","tag":"AI"}
```

## 素材与参考

交互参考 [qiaomu-home-dsh](https://github.com/joeseesun/qiaomu-home-dsh)、[Dashy](https://github.com/Lissy93/dashy) 和 Flomo 时间流；实现独立编写。GitHub、LangGraph、DeepSeek、BOSS直聘、YouMind 使用对应站点 favicon（Google s2 获取）；AI 趋势雷达使用站点原图标。AI 研报和交易复盘是本项目原创识别图标，不是第三方官方 Logo。

照片来源于 Unsplash 图片服务，随包提供以减少加载依赖：[海岸](https://images.unsplash.com/photo-1518837695005-2083093ee35b)、[森林](https://images.unsplash.com/photo-1441974231531-c6227db76b6e)、[暮色](https://images.unsplash.com/photo-1500530855697-b586d89ba3ee)。网站商标归各自权利人。

## 验证

`npm run check` 执行五个运行文件的语法检查及回归。54 项业务测试涵盖旧数据升级、并发/失败回滚、计时结算、Flomo 分页/空值/提交去重/中断、图片白名单与上传、Host 生命周期。

滚动回归使用生产 Client 组件和独立无头 Chromium；拦截全部请求，不连接用户浏览器或真实 Flomo。它在 1440、960、390px 三种宽度检查滚轮边界、记一笔定位、普通标签焦点、滚动位置和草稿保留。新增交互回归还覆盖任务失败恢复、计时/任务真实刷新、Flomo 请求在途刷新保护、手机计时直达、空/加载/错误态及弹窗焦点。配置以下依赖路径后，本轮完整检查为 **73 项通过、0 失败、0 跳过**（含两个浏览器父用例）：

```sh
CHEN_SCROLL_PLAYWRIGHT=/path/to/playwright/index.mjs \
CHEN_SCROLL_REACT_UMD_DIR=/path/to/node_modules \
CHEN_SCROLL_BROWSER=/path/to/chrome-headless-shell \
npm run check
```

React 目录需要 React 18 的 `react/umd/` 和 `react-dom/umd/`。浏览器路径可省略以使用 Playwright 已安装的浏览器；未设置前两个变量时，浏览器回归会明确跳过，不能视为滚动验收通过。

0.2.2 的 UI 精修、设计来源、截图测量与审核边界见[UI 验收说明](docs/ui-polish-review.md)。当前与历史安装/宿主验收状态见[验证记录](VERIFICATION.md)。验收优先后台隔离，避免抢占正在使用的鼠标、键盘和窗口。
