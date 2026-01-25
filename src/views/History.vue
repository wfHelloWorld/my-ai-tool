<template>
  <div class="h-full flex flex-col">
    <!-- 顶部筛选条 -->
    <div class="px-4 pt-[28px] flex items-center gap-3 flex-none">
      <span class="text-sm text-gray-600">筛选类型</span>
      <el-select v-model="selectedType" placeholder="全部类型" style="width: 180px" clearable>
        <el-option label="全部" :value="''" />
        <el-option label="聊天 chat" value="chat" />
        <el-option label="识图 vision" value="vision" />
        <!-- <el-option label="生图 imageGen" value="imageGen" />
        <el-option label="音频 audio" value="audio" />
        <el-option label="视频 video" value="video" /> -->
      </el-select>
    </div>

    <!-- 列表区域 -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
      <div v-if="conversationsStore.items.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
        <el-icon size="64"><Icon icon="mdi:history" /></el-icon>
        <p class="mt-4">暂无历史记录</p>
      </div>
      <ConversationList v-else :filter-type="selectedType || undefined" />
    </div>
  </div>
  
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import ConversationList from "../components/ConversationList.vue";
import type { ProviderProps } from "../types";
import { useProvidersStore } from "../stores/useProviderStore";
import { useConversationStore } from "../stores/useConversationStore";

const selectedType = ref<ProviderProps["type"] | "">("");

const providersStore = useProvidersStore();
const conversationsStore = useConversationStore();

onMounted(async () => {
  try {
    if (!providersStore.items || providersStore.items.length === 0) {
      await providersStore.initProvidersStore();
    }
    if (!conversationsStore.items || conversationsStore.items.length === 0) {
      await conversationsStore.fetchConversations();
    }
  } catch (e) {}
});
</script>

<style scoped>
/* 暂无特别样式，后续根据需求调整 */
</style>