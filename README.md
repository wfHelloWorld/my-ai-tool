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
