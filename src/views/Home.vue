<template>
  <div class="h-full" ref="outerContainer">
    <el-splitter style="height: 100%">
      <el-splitter-panel :min="300">
        <div class="h-full w-[90%] pl-[10%] flex items-center justify-center">
          <ProviderSelect v-model="currentProdiver" @update:model-value="onModelChange" />
        </div>
      </el-splitter-panel>
      <el-splitter-panel v-model:size="rightPaneSize" :min="260" @update:size="onRightSizeUpdate">
        <el-splitter layout="vertical" style="height: 100%">
          <el-splitter-panel size="70%">
            <div class="h-full flex flex-col">
              <div class="pt-5 shrink-0"></div>
              <div class="flex-1 overflow-y-auto px-[5%]">
                <ConversationList />
              </div>
            </div>
          </el-splitter-panel>
          <el-splitter-panel>
            <div class="h-full w-full flex items-center justify-center">
              <MessageInputChat @create="createConversation" :disabled="currentProdiver === ''" />
            </div>
          </el-splitter-panel>
        </el-splitter>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script lang="ts" setup>
import { ProviderProps } from "src/types";
import ProviderSelect from "../components/ProviderSelect.vue";
import { computed, onMounted, ref } from "vue";
import { db } from "../db";
import MessageInputChat from "../components/MessageInputChat.vue";
import ConversationList from "../components/ConversationList.vue";
import { useRouter } from "vue-router";
import { useConversationStore } from "../stores/useConversationStore";
import { useProvidersStore } from "../stores/useProviderStore";
const providersStore = useProvidersStore();
const conversationsStore = useConversationStore();
// conversationsStore.selectedId = -1

const router = useRouter();
const input = ref("");
const currentProdiver = ref(""); // 选择的数据
const outerContainer = ref<HTMLElement | null>(null);
const rightPaneSize = ref<string>("30%");

// const providerItems = ref<ProviderProps[]>([]);

const onModelChange = () => {
  console.log("选择变化:", currentProdiver.value);
};

onMounted(async () => {
  // providerItems.value = await db.providers.toArray();
  await providersStore.initProvidersStore();
  try {
    const cfg = await window.electronAPI.getConfig();
    let p = cfg?.homeRightPanePercent ?? 30;
    p = Math.max(10, Math.min(90, p));
    rightPaneSize.value = `${p}%`;
  } catch (e) {
    rightPaneSize.value = "30%";
  }
});

const onRightSizeUpdate = async (val: string | number) => {
  try {
    let percent: number;
    if (typeof val === "string" && val.endsWith("%")) {
      percent = Math.max(0, Math.min(100, parseFloat(val)));
    } else {
      const w = outerContainer.value?.clientWidth ?? 0;
      percent = w > 0 ? Math.round((Number(val) / w) * 100) : 30;
    }
    percent = Math.max(10, Math.min(90, percent));
    rightPaneSize.value = `${percent}%`;
    await window.electronAPI.updateConfig({ homeRightPanePercent: percent });
  } catch (e) {
    // ignore
  }
};

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
