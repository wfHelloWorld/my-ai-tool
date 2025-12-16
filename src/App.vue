<template>
  <div class="h-screen flex">
    <!-- 左侧菜单栏 -->
    <aside class="w-[200px] h-full bg-white border-r border-gray-200 flex flex-col drag-region">
      <!-- 顶部功能菜单（可滚动） -->
      <el-menu
        :default-active="route.path"
        class="el-menu-vertical-demo flex-1 overflow-y-auto border-r-0 no-drag"
        :router="true"
      >
        <el-menu-item index="/" class="mt-9">
          <el-icon><Icon icon="fluent:chat-24-regular" /></el-icon>
          <span>{{ $t('common.chat') }}</span>
        </el-menu-item>
        
        <el-menu-item index="/vision">
          <el-icon><Icon icon="mdi:image-search-outline" /></el-icon>
          <span>{{ $t('common.vision') }}</span>
        </el-menu-item>

        <el-sub-menu index="/image">
          <template #title>
            <el-icon><Icon icon="mdi:image-plus-outline" /></el-icon>
            <span>{{ $t('common.image') }}</span>
          </template>
          <el-menu-item index="/image/wan2.5-preview">
            <span>wan2.5-i2i-preview</span>
          </el-menu-item>
          <el-menu-item index="/image/wanx2.1-edit">
            <span>wanx2.1-imageedit</span>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/voice">
          <el-icon><Icon icon="mdi:microphone-outline" /></el-icon>
          <span>{{ $t('common.voice') }}</span>
        </el-menu-item>

        <el-menu-item index="/video">
          <el-icon><Icon icon="mdi:video-outline" /></el-icon>
          <span>{{ $t('common.video') }}</span>
        </el-menu-item>
      </el-menu>

      <!-- 底部系统菜单（固定） -->
      <el-menu
        :default-active="route.path"
        class="el-menu-vertical-demo flex-shrink-0 border-r-0 border-t border-gray-100 no-drag"
        :router="true"
      >
        <el-menu-item index="/download">
          <el-icon><Icon icon="mdi:download" /></el-icon>
          <span>{{ $t('common.download') }}</span>
        </el-menu-item>

        <el-menu-item index="/history">
          <el-icon><Icon icon="mdi:history" /></el-icon>
          <span>{{ $t('common.history') }}</span>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon><Icon icon="radix-icons:gear" /></el-icon>
          <span>{{ $t('common.settings') }}</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 顶部可拖拽区域 -->
    <div class="fixed top-0 left-[200px] right-0 h-[28px] drag-region bg-transparent pointer-events-none"></div>
    
    <!-- 主内容区域 -->
    <main class="flex-1 h-full overflow-hidden">
      <RouterView class="h-full" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { onBeforeMount, onMounted, ref } from "vue";
import { useConversationStore } from "./stores/useConversationStore";
import { useLogStore } from "./stores/useLogStore";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const conversationsStore = useConversationStore();
const logStore = useLogStore();

// 监听菜单事件
window.electronAPI?.onMenuNewConversation(() => {
  router.push("/");
});
window.electronAPI?.onMenuOpenSettings(() => {
  router.push("/settings");
});

onBeforeMount(async () => {
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

<style scoped>
/* 移除之前的 scrollbar 样式，使用默认或 element-plus 样式 */
</style>
