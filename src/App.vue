<template>
  <div class="flex items-center justify-between h-screen">
    <!-- 左边栏 -->
    <div class="w-[300px] bg-gray-100 h-full border-r border-gray-300">
      <!-- 对话框 -->
      <div class="h-[90%] overflow-y-auto">
        <ConversationList />
      </div>
      <!-- 左边栏底部按钮 -->
      <div class="h-[10%] flex justify-center items-center space-x-4 px-2">
        <router-link to="/">
          <el-button type="success" class="flex items-center">
            <Icon
              icon="radix-icons:chat-bubble"
              width="15"
              height="15"
              class="mr-2"
            />
            <!-- 新建聊天 -->
            <!-- {{ t("common.newChat") }} -->
            {{ $t("common.newChat") }}
          </el-button>
        </router-link>

        <router-link to="/settings">
          <el-button type="success" plain class="flex items-center">
            <Icon icon="radix-icons:gear" width="15" height="15" class="mr-2" />
            <!-- 应用设置 -->
            {{ $t('common.settings') }}
          </el-button>
        </router-link>
      </div>
    </div>
    <!-- 内容 -->
    <RouterView class="h-full flex-1" />
  </div>
</template>

<script setup lang="ts">
import ConversationList from "./components/ConversationList.vue";
import { Icon } from "@iconify/vue";
import { ref, onBeforeMount, onMounted } from "vue";
import { useConversationStore } from "./stores/useConversationStore";
import { useLogStore } from "./stores/useLogStore";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
const { t, locale } = useI18n();
const router = useRouter()


const conversationsStore = useConversationStore();
const logStore = useLogStore();

// 监听菜单事件
window.electronAPI.onMenuNewConversation(() => {
  router.push('/')
})
window.electronAPI.onMenuOpenSettings(() => {
  router.push('/settings')
})

onBeforeMount(async () => {
  // 读取 conversations
  conversationsStore.fetchConversations();
});

onMounted(async () => {
  // 日志模块
  window.electronAPI.onLogMessage(({ level, message }) => {
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
  window.electronAPI.onDeleteConversation(async (id: number) => {
    await conversationsStore.deleteConversation(id);
  });
});
</script>
