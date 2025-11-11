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
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"; npm run make

## Windows 打包（make）指令与注意事项

- 标准打包（生成 Zip 与 Squirrel 安装包）：
  `$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/" ; npm run make`

- 仅构建 Zip（便于快速验证打包）：
  `$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/" ; npm run make -- --targets=@electron-forge/maker-zip --verbose`

- 仅构建 Squirrel 安装包（Windows 安装包）：
  `$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/" ; npm run make -- --targets=@electron-forge/maker-squirrel --verbose`

### 预备条件（Windows）
- Node.js 版本建议使用 v24.5.0（通过 nvm-windows 管理更稳妥）。
- 依赖安装时不要使用 `--omit=optional`，避免漏装 Windows 平台的原生可选依赖。
- 建议先执行：`$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/" ; npm install`
- 路径注意：Squirrel.Windows（安装包构建）对非 ASCII 路径兼容性较差，建议将项目放在不含中文/空格的路径（如 `E:\work\electron-forge\my-new-app`），否则 `rcedit.exe` 可能报错 `Fatal error: Unable to load file`。

### 常见故障与处理
- 如果报错 `Cannot find module @rollup/rollup-win32-x64-msvc` 或 `Cannot find native binding`：
  1) 删除 `node_modules` 与 `package-lock.json`，然后重新执行：
     `$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/" ; npm install`
  2) 若仍失败，手动安装对应的 Windows 平台二进制包（版本与当前依赖一致）：
     `npm i -D @rollup/rollup-win32-x64-msvc@4.52.5 lightningcss-win32-x64-msvc@1.30.2 @tailwindcss/oxide-win32-x64-msvc@4.1.16`

### 构建产物位置
- Zip：`out/make/zip/win32/x64/`
- Squirrel：`out/make/squirrel.windows/x64/`
  - 示例：`Vchat-1.0.3 Setup.exe`、`my_ai_tool-1.0.3-full.nupkg`、`RELEASES`

# Windows 发布（publish）到 GitHub Releases 指南
确保你已经在 GitHub 上创建了仓库，并准备了发布令牌（`GH_TOKEN` 或 `GITHUB_TOKEN`，权限至少含 `repo`、`workflow`）。在项目目录 `my-new-app` 内执行以下步骤。

## 必备环境变量（其一或其二）
- `GITHUB_OWNER`：GitHub 用户或组织名
- `GITHUB_REPO`：仓库名
- `GH_TOKEN` 或 `GITHUB_TOKEN`：个人访问令牌（PAT），至少 `repo`、`workflow` 权限
- forge.config.ts 已内置 GitHub Publisher，会从环境变量读取上述配置。

## 方法一：直接在 PowerShell 设置后发布（最简单）
将以下四条命令替换为你的实际值后执行：

```
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:GITHUB_OWNER = "你的owner"
$env:GITHUB_REPO = "你的repo"
$env:GH_TOKEN = "你的token"  # 或使用 GITHUB_TOKEN
npm run publish -- --verbose
```

## 方法二：从 .env 加载后发布（推荐）
先在 `.env` 文件中写入如下键值：
```
GITHUB_OWNER=你的owner
GITHUB_REPO=你的repo
GH_TOKEN=你的token   # 或使用 GITHUB_TOKEN
```
然后在 PowerShell 执行（注意不要复制 ``` 分隔符）：
```
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$envFile = "$PWD/.env"
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^[ \t]*#') { return }
  if ($_ -match '^[ \t]*$') { return }
  if ($_ -match '^[ \t]*([^=]+)[ \t]*=[ \t]*(.*)$') {
    $name = $matches[1].Trim();
    $value = $matches[2]
    if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length-2) }
    if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length-2) }
    Set-Item -Path ("Env:{0}" -f $name) -Value $value
    # 或： [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}
npm run publish -- --verbose
```

## 可选：版本号升级（避免已有 tag 冲突）
如果之前已发布过当前版本（如 v1.0.4），建议先升级版本：
```
npm version patch -m "release: v%s"
git push --follow-tags
```
然后再执行发布命令。

## 发布前验证（可选）
检查关键变量是否已生效：
```
echo $env:GITHUB_OWNER
echo $env:GITHUB_REPO
echo $env:GH_TOKEN   # 或 echo $env:GITHUB_TOKEN
```
若为空，说明 .env 未正确加载或变量名不匹配。

## 常见错误与处理
- 401 Unauthorized：令牌无效或权限不足。请重新生成 PAT（至少含 repo、workflow 权限），更新 .env。
- 404 Not Found：owner/repo 不匹配，或令牌无权访问私有仓库。请检查 GITHUB_OWNER / GITHUB_REPO 与 GitHub 实际仓库一致。
- Release already exists：同版本 tag 已存在不可覆盖。请先执行版本号升级再发布。
- 网络/代理问题：必要时确保 PowerShell 走代理或使用国内镜像；不建议禁用 TLS 校验。

提示：以上环境变量设置为“进程级”，只在当前 PowerShell 会话有效；不修改系统/用户永久环境变量，更安全。

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
