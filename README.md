node: v24.5.0

# 1. package 命令
npm run package
# 结果：生成可执行程序，但还不是安装包，直接双击就可以使用

`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run package`

win：
`$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"; npm run package`
或者：
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ && npm run package
# 2. make 命令
npm run make
# 结果：生成完整的安装包，需要安装完毕以后使用


# 3 发布
`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run publish`


# Version: 1.0.3

- 其它：修复在 1.0、1.2、1.4、0.8、0.6 等倍率点击缩放不生效的问题，改为基于 setZoomLevel 的离散缩放确保每次操作均有明显变化。

补充说明（细化变更）：
- 路由与导航
  - App.vue：router-link 统一改为基于 path 的跳转（/、/history、/settings），解决基于 name 的路由不匹配报错。
  - 侧边栏图标文字添加 select-none，避免误选文本影响体验。
- UI/UX 细节优化
  - 主界面UI的大幅修改 
  - Settings.vue：为 tab 标题、表单静态标签、折叠面板标题及静态字段名（如 DASHSCOPE_API_KEY、URL 等）统一添加 select-none；输入框等可交互组件保持可选中与输入。
  - 将“Font Size”改为“界面缩放”（中文）与“Interface Zoom”（英文），增强可理解性。
  - 新增缩放快捷键提示文案（settings.zoomShortcuts），提示 CmdOrCtrl +、-、0。
  - 根据反馈，移除可点击的缩放调节控件，设置页仅显示当前倍率与快捷键提示，缩放由菜单/快捷键触发。
- 界面缩放联动与持久化
  - 主进程菜单（menu.ts）：自定义 zoomIn / zoomOut / resetZoom，改用 setZoomLevel 离散缩放（底数约 1.2），确保每次操作均可见；缩放后读取实际生效的 zoomFactor，持久化到 config.fontSize，并通过 zoom-factor-changed 通知渲染进程。
  - IPC（services/ipcService.ts）：增强 set-zoom-factor 逻辑，量化到邻近的离散缩放级别；持久化 fontSize 并广播 zoom-factor-changed 事件。
  - 预加载（preload.ts）：暴露 onZoomFactorChanged 给渲染进程订阅；保留 getZoomFactor / setZoomFactor 以供需要时调用。
  - 类型（interface.d.ts）：为 onZoomFactorChanged 添加类型声明，保证 renderer 使用时类型安全。
  - 设置页（Settings.vue）：订阅主进程的 zoom-factor-changed，实时更新显示倍率与 currentConfig.fontSize；移除了对本地手动输入的 watch（因已取消交互控件）。
- 国际化
  - zh.ts / en.ts：更新 settings.fontSize 文案、新增 settings.zoomShortcuts 文案，满足中英文环境显示。
- 验证与稳定性
  - 多次打开渲染预览 http://localhost:5173/ 进行验证，浏览器端无报错；建议同步查看终端日志，确保无新增错误。
  - 缩放范围限定在 [-10, 10] 缩放级别（约 0.2× ~ 5×），步进为单级别（约 ×1.2）；确保在常见倍率（1.0、1.2、1.4、0.8、0.6 等）缩放动作均可生效。
- 后续可选优化
  - 可根据需求调整缩放步进与范围；扩展快捷键提示样式或增加 tooltip；或进一步在设置页添加只读显示的更多缩放信息。
