# Home · 个人工作台

**Home**（包名 `dsh-home`）是一个 DSH（DeepSeek Harness）个人工作台插件：把待办、专注计时、Flomo 笔记时间流、常用快捷入口和壁纸放在同一页，作为每天的起点。安装后侧栏出现 **Home** 入口，与宿主自带主页并存。

> 目标 DSH 版本：`0.2.2` 系列（`engines.dsh: ">=0.2.2-rc.1 <0.3.0-0"`）。

## 功能

- **待办**：添加、分类、勾选完成、编辑、删除，可关联到专注计时。
- **专注计时**：番茄钟，支持专注/休息、暂停、继续、重置；按绝对截止时间结算，不随 tick 累积；含每日目标与专注历史。
- **Flomo 笔记时间流**：按日期倒序读取、搜索、按标签筛选、展开全文和打开原文；"记一笔"可直接写入 Flomo。Flomo 是笔记的唯一来源，本地仅保存未提交草稿与防重复提交回执。
- **快捷入口**：站点 Logo、分类筛选、拖动排序，内置 Google / Bing / 百度搜索。
- **壁纸**：内置海岸/森林/暮色/极光预设，自选 HTTPS 图片或上传本地图片，支持遮罩与自动轮换（关闭/每天/定时）。
- **主题与自适应**：跟随 DSH 深浅色与中英文，窄屏折叠为单列；颜色使用宿主主题变量。

## 配置 Flomo

Flomo 配置分两部分：

1. **插件配置（非敏感）**：在插件安装后，`dsh-home` 这一行的 `config` 支持
   - `flomo.enabled`（布尔，默认 `true`）：是否启用 Flomo 笔记功能。关闭后隐藏笔记入口、不注册笔记服务。
   - `flomo.endpoint`（字符串，默认 `https://flomoapp.com/mcp`）：Flomo MCP 地址。
2. **访问令牌（敏感）**：打开首页 **Home → 首页设置**（或"笔记时间流"页的"连接 Flomo"），粘贴自己的 Flomo 访问令牌。令牌由 DSH 凭据服务安全保存（引用名 `DSH_HOME_FLOMO_TOKEN`），每次操作重新解析，不写入配置、页面或工具返回。

## 安装

原生 Cordis bundle，无需单独启动网站。通过 DSH 插件管理器安装本仓库（或本地目录）：

```sh
npm install --ignore-scripts
npm run check
```

在 DSH 插件页使用绝对路径安装本目录。安装返回 `restart-required` 时，安装完成不代表当前页面已加载新版，重启 DSH 后生效。

## 数据边界

使用本插件自己的三个存储域（`dsh_home` / `dsh_home_notes` / `dsh_home_media`），不读取或迁移其他插件数据。卸载插件不删除自己的数据域。所有业务路由经过 DSH Connection 的认证，不另起服务器；外部笔记按受限格式转成 React 文本节点，不直接插入 HTML；凭据与外部错误详情不回显。

## 实现

- `core.js`：工作台状态、动作校验、串行修改、计时结算与在线／本地背景轮换。
- `online.js`：Unsplash 精选元数据与 Lorem Picsum 在线请求、超时、图片筛选与摄影师信息。
- `flomo.js`：MCP 连接、分页、笔记读取、提交回执与凭据解析。
- `media.js`：白名单静态素材与本地壁纸上传/读取。
- `index.js`：认证 HTTP 路由、共享 Host services、Agent tools 与插件 `Config`。
- `client.js`：React 原生 Slot 页面、主题样式、表单、拖动与数据同步。

## 验证

`npm run check` 运行语法检查与 Node 回归（当前 80 项通过、2 个可选浏览器用例在未配置 Playwright 时跳过）。真实 DSH 宿主页面（侧栏 Home、工作台渲染、插件配置）在隔离的 web profile 实例中验收。

## 素材与许可

交互参考 qiaomu-home-dsh、Dashy 与 Flomo 时间流，实现独立编写。内置照片来自 Unsplash；网站商标归各自权利人。代码以 MIT 许可发布。
