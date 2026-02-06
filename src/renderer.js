import "./index.css";
import { createApp } from "vue";
import App from "./App.vue";

// pinia
import { createPinia } from "pinia";

// element plus
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

// vue router
import { createRouter, createMemoryHistory } from "vue-router";
import Home from "./views/Home.vue";
// 路径修正：确认 Conversation.vue 存在于 ./views/ 目录
import Conversation from "./views/Conversation.vue";
import Settings from "./views/Settings.vue";
import History from "./views/History.vue";
import Vision from "./views/Vision.vue";
import ImageGen from "./views/ImageGen.vue";

import Wan26Image from "./views/imageGenPage/wan2.6-image.vue";
import Wan26I2V from "./views/videoPage/wan2.6-i2v.vue";
import Wan22Kf2vFlash from "./views/videoPage/wan2.2-kf2v-flash.vue";
import VideoEffectsFirst from "./views/videoPage/video-effects-first.vue";
import Voice from "./views/Voice.vue";
import Video from "./views/Video.vue";
import Download from "./views/Download.vue";
import { useConversationStore } from "./stores/useConversationStore";
import 'highlight.js/styles/1c-light.css'
import { i18n, initI18n } from "./i18n";
import { useI18nStore } from "./stores/useI18nStore";

// vue router
const routes = [
  { path: "/", component: Home },
  { path: "/conversation/:id", component: Conversation },
  { path: "/settings", component: Settings },
  { path: "/history", component: History },
  { path: "/vision", component: Vision },
  { path: "/image/wan2.5-preview", component: ImageGen },

  { path: "/image/wan2.6-image", component: Wan26Image },
  { path: "/video/wan2.6-i2v", component: Wan26I2V },
  { path: "/video/wan2.2-kf2v-flash", component: Wan22Kf2vFlash },
  { path: "/video/video-effects-first", component: VideoEffectsFirst },
  { path: "/voice", component: Voice },
  { path: "/video", component: Video },
  { path: "/download", component: Download },
];

const router = createRouter({
  history: createMemoryHistory(),
  routes, // 调用时的名称
});

// 路由守卫(笔记有记载)
router.beforeEach((to) => {
  // console.log("🚀 ~ to:", to)
  const conversationStore=useConversationStore()
  if (!to.path.startsWith("/conversation/")) {
    conversationStore.selectedId = -1;
  }
  
})

// pinia
const pinia = createPinia();

const app = createApp(App);
app.use(ElementPlus);
app.use(router);
app.use(pinia);
app.use(i18n);

const i18nStore = useI18nStore();
// 使用 store.t 覆盖模板中的 $t，使 Options API 与模板写法始终可用
// 说明：仍保留 vue-i18n 插件与 useI18n 组合式 API，此处仅将 $t 指向 store 翻译器
app.config.globalProperties.$t = (key) => i18nStore.t(key);

async function setupLocaleFromConfig() {
  try {
    const cfg = await window.electronAPI.getConfig();
    i18nStore.setLocale(cfg.language);
  } catch (err) {
    console.warn("getConfig failed", err);
  }
}

// 在挂载前并行初始化：
// - initI18n()：设置 vue-i18n 的语言（组合式 API t() 生效）
// - setupLocaleFromConfig()：设置 store 的语言（模板与 Options API 的 $t 生效）
Promise.all([initI18n(), setupLocaleFromConfig()])
  .catch((err) => console.warn("init locale failed", err))
  .finally(() => app.mount("#app"));

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite'
);
