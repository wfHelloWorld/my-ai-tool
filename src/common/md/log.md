# Version: 1.0.8
- wan2.6-i2v视频模型集成(首图)
- wan2.2-kf2v-flash视频模型集成(首尾图)

# Version: 1.0.7 
- chat 的控制参数
- 图片预览
- 集成 wan2.6-image 模型

# Version：1.0.6 
- 对于win下的一些修复
- 修图功能
- ui调整
- 生成图片进程中有些许bug,重复请求的时候会出错
- 多进程
- 进度条
- 新图片编辑模型
- 菜单修改,图片生成模型的选择修改到菜单的子菜单中
- markdown模块改写
- 输入法的回车不会发送消息

# Version: 1.0.5 

- 生图进度与提示：主进程在任务创建、轮询、下载、保存、失败/超时等阶段推送进度事件；渲染层新增订阅并在 ImageGen.vue 右侧显示“进度”列表。
- UI 改动：在“生成结果预览”区加入“打开图片目录”按钮；选择图片改用 Element Plus 按钮触发隐藏文件选择器，样式统一。
- 保存目录调整：生成图片改为保存到系统“下载（Downloads）”目录（支持子目录名）；“打开图片目录”改为指向该路径。
- 图片数量与返回：上传上限从 2 张提升到 3 张；支持服务端返回多张结果，逐张下载保存并在页面展示缩略图。
- 传输稳定性：IPC 仅传递可克隆的原始数据（使用 toRaw 提取图片路径）；预加载暴露 `onWan25PreviewProgress` 接口并在 interface.d.ts 增加类型声明；避免“An object could not be cloned”。
- 体积限制：前端图片压缩上限从 10MB 调整为 7MB，超限自动压缩至不超过 7MB。
- 目录工具：新增获取“下载/images”路径的方法并用于打开目录；与 Provider 保存目录保持一致。
- 诊断修复：修复主进程空代码块导致的 Empty block statement 诊断错误，完善错误分支日志。
- URL 规范化：规范 `createUrl` 与 `taskBaseUrl` 的构建逻辑，避免重复与错误路径，提升调用稳定性。
- 开发日志：新增“开发日志”模块，记录详细的调试信息，方便排查问题。

本次会话更新汇总：
- 设置页样式修复：使用 `:deep(.el-tabs__content)` 穿透 Element Plus 内部结构；为日志面板的 `el-scrollbar` 与其 `__wrap` 设定 `height: 100%`，修复滚动问题。
- 文案国际化：在 `locales/zh.ts` 与 `locales/en.ts` 新增 `settings.versionLog`，并将 `Settings.vue` 标签替换为 `{{ $t("settings.versionLog") }}`，实现中英文切换。
- 类型安全增强：定义并导出 `Wan25PreviewProgress`；将 `Wanxiang25PreviewProvider.generate` 的回调参数由 `any` 改为强类型；为 `postJson/getJson` 增加更具体的返回类型；在 `preload.ts` 中为 `startWan25Preview` 与 `onWan25PreviewProgress` 引入严格类型；在 `interface.d.ts` 中将回调 `info` 类型替换为 `Wan25PreviewProgress`。
- 生图尺寸选择：将 `ImageGen.vue` 的尺寸输入改为下拉选择（`el-select`），统一值格式为 `宽*高`（如 `1280*1280`），与接口规范一致。
- 右栏默认宽度：确认右侧面板默认宽度为 `30%`，并说明最小宽度 `260px` 的约束与可选的强制策略。
- 会话列表筛选：`ConversationList` 支持 `filterType` 属性；`Home.vue` 传入 `chat`、`Vision.vue` 传入 `vision`；`Conversation.vue` 在未传入时自动根据当前会话的 `provider.type` 进行筛选。
- 历史页筛选：`History.vue` 顶部新增类型选择器（全部、chat、vision、imageGen、audio、video），联动 `ConversationList` 实现按类型过滤；初始化 Provider 与会话数据以保证展示正常。

# Version: 1.0.4
- 历史界面视口调整
- 新增固定顶部可拖拽区域(主要是针对macOS的窗口拖拽)
- 添加图片的预览的修改
- 改的太多懒得记录了


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
- 如果在 zip 构建时报错 `The property 'options.recursive' is no longer supported. Received true`：
  - 这是 Node.js v24 移除 `fs.rmdir({recursive})` 选项导致的 `cross-zip` 兼容性问题。
  - 已在本项目临时补丁为 `fs.rm({recursive, force})`；如仍报错，建议改用 Node v20 LTS 或将 zip 构建升级到兼容版本。

- 如果 Squirrel 安装包阶段报错 `Fatal error: Unable to load file` 且路径包含中文：
  - 将项目路径迁移到纯 ASCII 路径（如 `E:\work\electron-forge\my-new-app`）后再执行 `npm run make`。
