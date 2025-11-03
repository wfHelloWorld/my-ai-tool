import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel'; // win
import { MakerZIP } from '@electron-forge/maker-zip'; // win
import { MakerDeb } from '@electron-forge/maker-deb'; // linux
import { MakerRpm } from '@electron-forge/maker-rpm'; // linux
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { MakerDMG } from '@electron-forge/maker-dmg'; // mac
import dotenv from 'dotenv';
import { PublisherGithub } from '@electron-forge/publisher-github';
dotenv.config();

// 基础打包配置
const config: ForgeConfig = {
  // npm run package 使用的配置
  packagerConfig: {
    name: 'Vchat',
    asar: true, // 将源码打包成 asar 档案
    icon: './assets/icon.ico',
    // 开发者需完善：
    // - name：应用内部名称（建议与 package.json 的 productName 保持一致，便于生成资产命名一致）
    // - icon：应用图标（Windows 用 .ico，macOS 用 .icns 在 MakerDMG 中设置）
  },
  rebuildConfig: {},
  // 制作安装程序
  makers: [
    // windows 安装程序
    new MakerSquirrel({
      // 应用信息
      name: 'My-AI-Tools',
      // 开发者需完善：authors、description、iconUrl（远程图标地址，可选）
      // authors: 'Your Name or Company',
      description: 'A chat application',
      // 安装程序配置
      setupIcon: './assets/icon.ico',  // Windows 安装图标
      // iconUrl: 'https://raw.githubusercontent.com/<owner>/<repo>/main/assets/icon.ico', // 远程图标URL（可选）
      // 快捷方式设置
      setupExe: 'VChat-Setup.exe',  // 安装程序名称
      // 说明：Windows 自动更新使用 Squirrel.Windows，需要发布 .nupkg、RELEASES、.exe。
    }),
    // mac 安装程序
    new MakerDMG({
      icon: './assets/icon.icns',
      format: 'ULFO', // 兼容性更好
    }),
    // 压缩包,解压后直接可以运行(darwin: mac, win32: windows)
    new MakerZIP({}, ['darwin', 'win32']),// 生成的内容 和 run package 一样
    // RPM包 - 用于 RedHat 系列 适用于: Red Hat, CentOS, SUSE, Fedora
    // new MakerRpm({}),
    // DEB包 - 用于 Debian 系列 适用于: Ubuntu, Debian, Linux Mint
    // new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  // 添加 GitHub 发布配置：使用环境变量注入仓库与令牌
  publishers: [
    new PublisherGithub({
      // 开发者需完善的仓库信息（推荐在 .env 中设置 GITHUB_OWNER/GITHUB_REPO）：
      // - 仓库必须公开，update.electronjs.org 才能采集 feed
      repository: {
        owner: process.env.GITHUB_OWNER || 'wfHelloWorld', // GitHub 组织或用户名
        name: process.env.GITHUB_REPO || 'my-ai-tool',     // 仓库名
      },
      // 授权令牌（建议使用 GITHUB_TOKEN 或 GH_TOKEN，权限至少：repo、workflow）：
      authToken: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
      // 发布可见性：
      // - draft: true  -> 以草稿发布（需要到 GitHub 手工“Publish”后才公开）
      // - draft: false -> 直接公开发布（update.electronjs.org 可立即采集）
      draft: false, // 直接发布，不需要在 GitHub 上手动发布
      // 预发布标记：
      // - prerelease: true  -> 以“Pre-release”形式发布，适合测试版
      // - prerelease: false -> 正式版
      prerelease: false,
      // 标签前缀：最终 tag 形如 v1.0.0（配合语义化版本号，update 服务按标签生成 feed）
      tagPrefix: 'v',
    }),
  ],
};

export default config;
