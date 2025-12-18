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
				<div class="flex-1 overflow-y-auto px-[5%] pb-4 text-sm text-gray-700 flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<el-tooltip placement="top" effect="dark">
								<template #content>
									<div>是否开启联网搜索，可能增加 Token 消耗。</div>
								</template>
								<span class="cursor-help">联网搜索</span>
							</el-tooltip>
						</div>
						<el-switch v-model="extraParams.enable_search" />
					</div>
					<div v-if="extraParams.enable_search" class="ml-4 flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<el-tooltip placement="top" effect="dark">
								<template #content>
									<div>强制搜索，模型每次都会发起联网搜索。</div>
								</template>
								<span class="cursor-help">强制搜索</span>
							</el-tooltip>
							<el-switch v-model="extraParams.search_options.forced_search" />
						</div>
						<div class="flex items-center justify-between">
							<el-tooltip placement="top" effect="dark">
								<template #content>
									<div>搜索策略：turbo 兼顾速度，max 更全面，agent 多轮检索。</div>
								</template>
								<span class="cursor-help">搜索策略</span>
							</el-tooltip>
							<el-select v-model="extraParams.search_options.search_strategy" class="!w-40" size="small">
								<el-option label="turbo" value="turbo" />
								<el-option label="max" value="max" />
								<el-option label="agent" value="agent" />
							</el-select>
						</div>
						<div class="flex items-center justify-between">
							<el-tooltip placement="top" effect="dark">
								<template #content>
									<div>开启垂域搜索，仅在启用联网搜索时生效。</div>
								</template>
								<span class="cursor-help">垂域搜索</span>
							</el-tooltip>
							<el-switch v-model="extraParams.search_options.enable_search_extension" />
						</div>
					</div>
					<div class="flex items-center justify-between">
						<el-tooltip placement="top" effect="dark">
							<template #content>
								<div class="max-w-xs">在创意写作或头脑风暴等需要多样性、趣味性或创造力的场景中，建议调高该值；<br>在技术文档或正式文本等强调一致性与术语准确性的场景中，建议调低该值。</div>
							</template>
							<span class="cursor-help">内容重复度</span>
						</el-tooltip>
						<div class="flex items-center gap-2">
							<el-input-number
								v-if="extraParams.enable_presence_penalty"
								v-model="extraParams.presence_penalty"
								:step="0.1"
								:min="-2"
								:max="2"
								class="!w-28"
								size="small"
							/>
							<el-switch v-model="extraParams.enable_presence_penalty" />
						</div>
					</div>
					<div class="flex items-center justify-between">
						<el-tooltip placement="top" effect="dark">
							<template #content>
								<div>仅 qwen3-max-preview 且开启思考模式时可用。</div>
							</template>
							<span class="cursor-help">代码解释器</span>
						</el-tooltip>
						<el-switch v-model="extraParams.enable_code_interpreter" />
					</div>
					<div class="flex items-center justify-between">
						<el-tooltip placement="top" effect="dark">
							<template #content>
								<div>启用思考模式，对应 enable_thinking。</div>
							</template>
							<span class="cursor-help">思考模式</span>
						</el-tooltip>
						<el-switch v-model="extraParams.enable_thinking" />
					</div>
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
import { computed, onMounted, ref, reactive, watch } from "vue";
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

const extraParams = reactive({
	enable_search: false,
	enable_thinking: true,
	search_options: {
		forced_search: false,
		search_strategy: "turbo",
		enable_search_extension: false,
	},
	presence_penalty: 1.5,
	enable_presence_penalty: false,
	enable_code_interpreter: false,
});

const EXTRA_KEY = "chatExtraParams";

onMounted(() => {
	try {
		const saved = localStorage.getItem(EXTRA_KEY);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (parsed && typeof parsed === "object") {
				Object.assign(extraParams, parsed);
			}
		}
	} catch (e) {}
});

watch(
	() => extraParams,
	(val) => {
		try {
			localStorage.setItem(EXTRA_KEY, JSON.stringify(val));
		} catch (e) {}
	},
	{ deep: true }
);

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
