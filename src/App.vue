<template>
  <div class="h-screen flex">
    <!-- 左侧窄栏：顶部聊天；底部依次：历史、设置 -->
    <aside class="w-[80px] h-full border-r border-gray-100 bg-gray-50 flex flex-col justify-between drag-region">
      <!-- 顶部图标栈：聊天 + 识图/生图/语音/视频，可在高度不足时滚动 -->
      <div ref="topStackRef"
        :class="['flex flex-col items-center pt-4 space-y-6 no-drag flex-1 min-h-0 overflow-auto', showScrollbar ? 'scrollbar-visible' : 'scrollbar-hidden']">
        <!-- 聊天 -->
        <router-link to="/"
          :class="['flex flex-col items-center justify-center mt-5', route.path === '/' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']">
          <Icon icon="fluent:chat-24-regular" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/' ? 'primary' : 'info'" size="small">{{
          $t('common.chat') }}</el-text>
        </router-link>
        <!-- 识图 -->
        <router-link to="/vision"
          :class="['flex flex-col items-center justify-center', route.path === '/vision' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']">
          <Icon icon="mdi:image-search-outline" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/vision' ? 'primary' : 'info'" size="small">{{
          $t('common.vision') }}</el-text>
        </router-link>
        <!-- 生图 -->
        <router-link to="/image"
          :class="['flex flex-col items-center justify-center', route.path === '/image' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']">
          <Icon icon="mdi:image-plus-outline" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/image' ? 'primary' : 'info'" size="small">{{
          $t('common.image') }}</el-text>
        </router-link>
        <!-- 语音 -->
        <router-link to="/voice"
          :class="['flex flex-col items-center justify-center', route.path === '/voice' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']">
          <Icon icon="mdi:microphone-outline" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/voice' ? 'primary' : 'info'" size="small">{{
          $t('common.voice') }}</el-text>
        </router-link>
        <!-- 视频 -->
        <router-link to="/video"
          :class="['flex flex-col items-center justify-center', route.path === '/video' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']">
          <Icon icon="mdi:video-outline" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/video' ? 'primary' : 'info'" size="small">{{
          $t('common.video') }}</el-text>
        </router-link>
      </div>
      <el-divider />
      <!-- 底部按钮区域：下载、历史、设置 -->
      <div class="p-4 no-drag flex flex-col items-center space-y-6">
        <!-- 下载 -->
        <router-link to="/download"
          :class="['flex flex-col items-center justify-center', route.path === '/download' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']">
          <Icon icon="mdi:download" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/download' ? 'primary' : 'info'" size="small">{{
          $t('common.download') }}</el-text>
        </router-link>
        <!-- 历史 -->
        <router-link to="/history"
          :class="['flex flex-col items-center justify-center', route.path === '/history' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']">
          <Icon icon="mdi:history" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/history' ? 'primary' : 'info'" size="small">{{
          $t('common.history') }}</el-text>
        </router-link>
        <!-- 设置 -->
        <router-link to="/settings"
          :class="['flex flex-col items-center justify-center', route.path === '/settings' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']">
          <Icon icon="radix-icons:gear" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/settings' ? 'primary' : 'info'" size="small">{{
          $t('common.settings') }}</el-text>
        </router-link>
      </div>
    </aside>

    <!-- 顶部可拖拽区域 -->
    <div class="fixed top-0 left-[80px] right-0 h-[28px] drag-region bg-transparent"></div>
    <!-- 主内容区域 -->
    <main class="flex-1 h-full overflow-hidden">
      <RouterView class="h-full" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { onBeforeMount, onMounted, onBeforeUnmount, ref } from "vue";
import { useConversationStore } from "./stores/useConversationStore";
import { useLogStore } from "./stores/useLogStore";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const conversationsStore = useConversationStore();
const logStore = useLogStore();

// 监听菜单事件（在浏览器预览中 window.electronAPI 不存在，使用可选链避免报错）
window.electronAPI?.onMenuNewConversation(() => {
  router.push("/");
});
window.electronAPI?.onMenuOpenSettings(() => {
  router.push("/settings");
});

onBeforeMount(async () => {
  // 读取 conversations
  conversationsStore.fetchConversations();
});

const topStackRef = ref<HTMLElement | null>(null);
const showScrollbar = ref(false);
function updateScrollState() {
  const el = topStackRef.value;
  if (!el) return;
  // 当需要滚动（内容高度大于容器高度）时显示滚动条
  showScrollbar.value = el.scrollHeight > el.clientHeight;
}
let ro: ResizeObserver | null = null;

onMounted(async () => {
  // 日志模块
  window.electronAPI?.onLogMessage(({ level, message }) => {
    logStore.addLog(level, message);
    switch (level) {
      case "info":
        console.info("[Main]", message);
        break;
      case "warn":
        console.warn("[Main]", message);
        break;
      case "error":
        console.error("[Main]", message);
        break;
      default:
        console.log("[Main]", message);
    }
  });

  // 右键菜单：删除会话
  window.electronAPI?.onDeleteConversation(async (id: number) => {
    await conversationsStore.deleteConversation(id);
  });
  // 观察尺寸变化，动态控制滚动条显示
  updateScrollState();
  ro = new ResizeObserver(() => updateScrollState());
  if (topStackRef.value) ro.observe(topStackRef.value);
  window.addEventListener('resize', updateScrollState);
});

onBeforeUnmount(() => {
  if (ro) ro.disconnect();
  window.removeEventListener('resize', updateScrollState);
});
</script>

<style scoped>
/* 默认隐藏滚动条，仅在 overflow 发生时显示（由类切换控制） */
.scrollbar-hidden {
  scrollbar-width: none;
  /* Firefox */
}

.scrollbar-hidden::-webkit-scrollbar {
  width: 0;
  height: 0;
  /* Chrome/Safari */
}

.scrollbar-visible {
  scrollbar-width: thin;
  /* Firefox */
}

.scrollbar-visible::-webkit-scrollbar {
  width: 6px;
  height: 6px;
  /* Chrome/Safari */
}

.scrollbar-visible::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
</style>
