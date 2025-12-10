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

# 3. 发布 Windows 发布（publish）到 GitHub Releases 指南
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
