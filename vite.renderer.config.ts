import { defineConfig } from "vite";
 
// https://vitejs.dev/config
export default defineConfig(async () => {

  /* eslint-disable */
  // 这里的代码 ESLint 都不检测
  //@ts-ignore
  const vue = (await import("@vitejs/plugin-vue")).default;
  //@ts-ignore
  const tailwindcss = (await import("@tailwindcss/vite")).default;
  /* eslint-enable */
  return {
    plugins: [vue(), tailwindcss()],
    // 确保在生产构建中包含 vue-i18n 的消息编译器与全量安装
    define: {
      __VUE_I18N_FULL_INSTALL__: true,
      __VUE_I18N_LEGACY_API__: false,
      __INTLIFY_PROD_DEVTOOLS__: false,
      __INTLIFY_DROP_MESSAGE_COMPILER__: false,
    },
  };
});
