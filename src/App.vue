<template>
  <div class="h-screen flex">
    <!-- 左侧菜单栏 -->
    <aside class="w-[200px] h-full bg-white border-r border-gray-200 flex flex-col drag-region">
      <!-- 顶部功能菜单（可滚动） -->
      <el-menu :default-active="route.path" class="el-menu-vertical-demo flex-1 overflow-y-auto border-r-0 no-drag"
        :router="true">
        <el-menu-item index="/" class="mt-9">
          <el-icon>
            <Icon icon="fluent:chat-24-regular" />
          </el-icon>
          <span>{{ $t('common.chat') }}</span>
        </el-menu-item>

        <el-menu-item index="/vision">
          <el-icon>
            <Icon icon="mdi:image-search-outline" />
          </el-icon>
          <span>{{ $t('common.vision') }}</span>
        </el-menu-item>

        <el-sub-menu index="/image">
          <template #title>
            <el-icon>
              <Icon icon="mdi:image-plus-outline" />
            </el-icon>
            <span>{{ $t('common.image') }}</span>
          </template>
          <el-menu-item index="/image/wan2.5-preview">
            <span>wan2.5-i2i-preview</span>
          </el-menu-item>
          <el-menu-item index="/image/wanx2.1-edit">
            <span>wanx2.1-imageedit</span>
          </el-menu-item>
          <el-menu-item index="/image/wan2.6-image">
            <span>wan2.6-image</span>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/voice">
          <el-icon>
            <Icon icon="mdi:microphone-outline" />
          </el-icon>
          <span>{{ $t('common.voice') }}</span>
        </el-menu-item>

        <el-sub-menu index="/video">
          <template #title>
            <el-icon>
              <Icon icon="mdi:video-outline" />
            </el-icon>
            <span>{{ $t('common.video') }}</span>
          </template>
          <el-menu-item index="/video/wan2.6-i2v">
            <span>{{ $t('common.firstFrameGen') }}</span>
          </el-menu-item>
          <el-menu-item index="/video/wan2.2-kf2v-flash">
            <span>{{ $t('common.firstAndLastFrameGen') }}</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>

      <!-- 底部系统菜单（固定） -->
      <el-menu :default-active="route.path"
        class="el-menu-vertical-demo flex-shrink-0 border-r-0 border-t border-gray-100 no-drag" :router="true">
        <el-menu-item index="/download">
          <el-icon>
            <Icon icon="mdi:download" />
          </el-icon>
          <span>{{ $t('common.download') }}</span>
        </el-menu-item>

        <el-menu-item index="/history">
          <el-icon>
            <Icon icon="mdi:history" />
          </el-icon>
          <span>{{ $t('common.history') }}</span>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon>
            <Icon icon="radix-icons:gear" />
          </el-icon>
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

  <!-- 全局图片预览弹窗 -->
  <div v-if="previewVisible" class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center animate-fade-in"
    @click="closePreview">
    <!-- 关闭按钮 -->
    <button
      class="absolute top-5 right-5 text-white/80 hover:text-white transition-colors p-2 rounded-full bg-black/20 hover:bg-black/40 z-[10000]"
      @click.stop="closePreview">
      <Icon icon="mdi:close" width="32" height="32" />
    </button>

    <!-- 图片容器 -->
    <div class="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
      <img :src="previewImageSrc" class="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm" @click.stop
        alt="Preview" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import { useConversationStore } from "./stores/useConversationStore";
import { useLogStore } from "./stores/useLogStore";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const conversationsStore = useConversationStore();
const logStore = useLogStore();

// 图片预览状态
const previewVisible = ref(false);
const previewImageSrc = ref("");

const closePreview = () => {
  previewVisible.value = false;
  // 延迟清空 src 以避免闪烁，等待动画结束（如果有）
  setTimeout(() => {
    previewImageSrc.value = "";
  }, 200);
};

const handleGlobalClick = (event: MouseEvent) => {
  // 如果预览已打开，不处理（预览层的点击由预览层自己处理）
  if (previewVisible.value) return;

  const target = event.target as HTMLElement;
  // 查找是否点击了 img 标签
  if (target.tagName === "IMG") {
    const img = target as HTMLImageElement;
    // 忽略没有 src 的图片或特定的 class (如果需要)
    // 忽略 data url 且非常小的图片（可能是图标）? 暂时不限制
    if (img.src) {
      // 阻止默认行为（例如链接跳转）？用户可能不希望完全阻止，比如图片在一个链接里。
      // 但通常点击放大是最高优先级。
      // 如果图片在 button 里，可能也不应该触发？
      // 现在的需求是“点击img标签，会弹窗”，我就直接做这个。
      // 考虑到可能是在聊天界面，用户想看大图。

      previewImageSrc.value = img.src;
      previewVisible.value = true;
    }
  }
};

// 监听菜单事件
window.electronAPI?.onMenuNewConversation(() => {
  router.push("/");
});
window.electronAPI?.onMenuOpenSettings(() => {
  router.push("/settings");
});
// 右键菜单：删除会话
window.electronAPI?.onDeleteConversation(async (id: number) => {
  await conversationsStore.deleteConversation(id);
});
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

onMounted(() => {
  document.addEventListener("click", handleGlobalClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleGlobalClick);
});

onBeforeMount(async () => {
  conversationsStore.fetchConversations();
});
</script>

<style>
@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}
</style>
