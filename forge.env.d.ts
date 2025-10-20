/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
// GitHub 发布所需环境变量类型声明
declare namespace NodeJS {
  interface ProcessEnv {
    GITHUB_TOKEN?: string;
    GH_TOKEN?: string; // 兼容另一常见变量名
    GITHUB_OWNER?: string;
    GITHUB_REPO?: string;
  }
}