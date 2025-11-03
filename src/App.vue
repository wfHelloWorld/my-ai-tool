<template>
  <div class="h-screen flex">
    <!-- 左侧窄栏：顶部新建图标、下方历史图标；左下角设置按钮 -->
    <aside class="w-[80px] h-full border-r border-gray-100 bg-gray-50 flex flex-col justify-between drag-region">
      <!-- 顶部图标栈 -->
      <div class="flex flex-col items-center pt-4 space-y-6 no-drag">
        <!-- 新建 -->
        <router-link
          to="/"
          :class="['flex flex-col items-center justify-center mt-5', route.path === '/' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']"
        >
          <Icon icon="fluent:chat-add-24-regular" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/' ? 'primary' : 'info'" size="small">{{ $t('common.newChat') }}</el-text>
        </router-link>
        <!-- 历史 -->
        <router-link
          to="/history"
          :class="['flex flex-col items-center justify-center', route.path === '/history' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']"
        >
          <Icon icon="mdi:history" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/history' ? 'primary' : 'info'" size="small">{{ $t('common.history') }}</el-text>
        </router-link>
      </div>
      <!-- 底部设置按钮 -->
      <div class="p-4 no-drag">
        <router-link
          to="/settings"
          :class="['flex flex-col items-center justify-center', route.path === '/settings' ? 'text-[var(--el-color-primary)]' : 'text-gray-500 hover:text-gray-800']"
        >
          <Icon icon="radix-icons:gear" width="24" height="24" />
          <el-text class="mx-1 select-none" :type="route.path === '/settings' ? 'primary' : 'info'" size="small">{{ $t('common.settings') }}</el-text>
        </router-link>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <main class="flex-1 h-full">
      <RouterView class="h-full" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { onBeforeMount, onMounted } from "vue";
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
});
</script>
