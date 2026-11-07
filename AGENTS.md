# Chen Home 开发约定

- 独立 DSH Cordis bundle。运行时集成先读 cordis-plugin-development，再 Inspect 公开接口。
- core.js 为任务、书签、布局、计时的唯一业务实现；index.js 提供 Host service / HTTP / Agent tool；client.js 是原生 React Slot UI。
- 持久化仅用本插件 storageDomain，不读取或迁移其他插件数据。前后端共享行为通过同一 service 实现。
- 随手记与 Flomo 强绑定：Flomo 是正式笔记的唯一来源。创建必须调用 Flomo 并取得成功回执后才能显示保存成功；列表、搜索、详情与刷新读取 Flomo，不建立独立笔记库、不在 Flomo 不可用时转存为本地正式笔记。本地仅允许未提交草稿和防重复提交回执；回执不能充当时间流的数据源。后续编辑、删除能力也必须作用于对应 Flomo 笔记。
- 颜色用 DSH 主题变量；样式限于 ch-* 类；禁止操作宿主 DOM。所有订阅和路由遵循 Context 生命周期。
- 运行 npm run check；安装只用 plugin_manager 的绝对项目路径。区分隔离环境回归与真实 DSH 页面验收，不把测试夹具当作宿主验收证据。
- 开发与验收优先后台、隔离执行，避免抢占用户正在使用的鼠标、键盘和桌面窗口。需要前台操作时不能沿用历史授权；无法静默验收的部分如实标注，不强行操作用户界面。
- 不自动提交或推送远端。不提交用户运行时数据、截图、凭据或 node_modules。
- 页面中文优先；metadata 保留 en/zh；timer 按绝对截止时间计算，不以 tick 次数累积。
