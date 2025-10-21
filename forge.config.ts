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
  },
  rebuildConfig: {},
  // 制作安装程序
  makers: [
    // windows 安装程序
    new MakerSquirrel({
      // 应用信息
      name: 'VChat',
      // authors: 'Viking Zhang',
      description: 'A chat application',
      // 安装程序配置
      setupIcon: './assets/icon.ico',  // Windows 安装图标
      // iconUrl: 'https://raw.githubusercontent.com/your-repo/vchat/main/assets/icon.ico', // 远程图标URL
      // 快捷方式设置
      setupExe: 'VChat-Setup.exe',  // 安装程序名称
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
      repository: {
        owner: process.env.GITHUB_OWNER || 'wfHelloWorld',
        name: process.env.GITHUB_REPO || 'my-ai-tool',
      },
      // 支持常见环境变量名：GITHUB_TOKEN 或 GH_TOKEN
      authToken: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
      draft: false, // 默认发布为草稿，安全,false 表示直接发布 不需要在 GitHub 上手动发布
      prerelease: false,
      tagPrefix: 'v',
    }),
  ],
};

export default config;
