<template>
  <div class="h-full flex flex-col items-center">
    <div class="h-[85%] w-[80%] flex items-center justify-center">
      <ProviderSelect
        v-model="currentProdiver"
        @update:model-value="onModelChange"
      />
    </div>
    <div class="h-[15%] w-full flex items-center justify-center">
      <MessageInputVision
        @create="createConversation"
        :disabled="currentProdiver === ''"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ProviderProps } from "src/types";
import ProviderSelect from "../components/ProviderSelect.vue";
import { Icon } from "@iconify/vue";
import { computed, onMounted, ref } from "vue";
import { db } from "../db";
import MessageInputVision from "../components/MessageInputVision.vue";
import { useRouter } from "vue-router";
import { useConversationStore } from "../stores/useConversationStore";
import { useProvidersStore } from "../stores/useProviderStore";
const providersStore = useProvidersStore();
const conversationsStore = useConversationStore();
// conversationsStore.selectedId = -1

const router = useRouter();
const input = ref("");
const currentProdiver = ref(""); // 选择的数据

// const providerItems = ref<ProviderProps[]>([]);

const onModelChange = () => {
  console.log("选择变化:", currentProdiver.value);
};

onMounted(async () => {
  // providerItems.value = await db.providers.toArray();
  await providersStore.initProvidersStore();
});

// 拆分从providerSelect组件中获取的provider信息
const modelInfo = computed(() => {
  const [providerId, selectedModel] = currentProdiver.value.split("/");
  return {
    providerId: parseInt(providerId),
    selectedModel,
  };
});

/**
 * 创建聊天
 * @param question 问题
 */
const createConversation = async (question: string, firstImagePath?: string) => {
  // console.log("🚀 ~ createConversation ~ question:", question);
  let copiedFirstImagePath: string | undefined;
  if (firstImagePath) {
    try {
      copiedFirstImagePath = await window.electronAPI.copyImageToUserDir(firstImagePath);
      console.log("🚀 ~ createConversation ~ copiedImagePath:", copiedFirstImagePath)
    } catch (error) {
      console.log("🚀 ~ createConversation ~ error:", error);
    }
  }

  const { providerId, selectedModel } = modelInfo.value;
  const currentData = new Date().toISOString();
  // 创建新对话
  const conversationId = await conversationsStore.createConversation({
    title: question,
    providerId,
    selectedModel,
    createdAt: currentData,
    updatedAt: currentData,
  });
  // 创建新messages
  const newMessageId = await db.messages.add({
    content: question,
    type: "question",
    conversationId,
    createdAt: currentData,
    updatedAt: currentData,
    ...(copiedFirstImagePath && { firstImagePath: copiedFirstImagePath }),
  });
  router.push(`/conversation/${conversationId}?init=${newMessageId}`);
};
</script>

<style></style>
