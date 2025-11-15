<template>
  <div class="h-full" ref="outerContainer">
    <el-splitter style="height: 100%">
      <el-splitter-panel :min="360">
        <div class="h-full flex flex-col">
          <div
            class="w-[100%] h-[5%] bg-slate-50 border-b border-gray-300 flex items-center px-3 justify-between drag-region"
            v-if="conversation"
          >
            <h3 class="font-semibold text-gray-900 w-2/3 truncate">
              {{ conversation.title }}
            </h3>
            <span class="text-sm text-gray-500 truncate">
              {{ dayjs(conversation.updatedAt).format("YYYY-MM-DD") }}
            </span>
          </div>
          <div class="flex-1 overflow-y-auto px-[5%] pt-2" @scroll="handleScroll">
            <MessageList :messages="filteredMessages" ref="messageListRef" />
          </div>
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
              <MessageInputChat @create="sendNewMessage" v-model="inputValue" :disabled="messagesStore.isMessageLoading" />
            </div>
          </el-splitter-panel>
        </el-splitter>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script lang="ts" setup>
import {
  ConversationPorps,
  MessageProps,
  MessageStatus,
  MessageListInstance,
} from "../types";
import MessageList from "../components/MessageList.vue";
import MessageInputChat from "../components/MessageInputChat.vue";
import ConversationList from "../components/ConversationList.vue";
import { useRoute } from "vue-router";
import {
  ref,
  watch,
  onMounted,
  computed,
  nextTick,
  onBeforeUnmount,
} from "vue";
import { db } from "../db";
import dayjs from "dayjs";
import { useConversationStore } from "../stores/useConversationStore";
import { useMessageStore } from "../stores/useMessageStore";

// messageList 的内部 DOM 节点
const messageListRef = ref<MessageListInstance>();

const autoScrollEnabled = ref(true);

/**
 * 处理滚动事件
 */
const handleScroll = (event: Event) => {
  // console.log("scroll");
  const target = event.target as HTMLElement;
  const { scrollTop, scrollHeight, clientHeight } = target;
  // 如果用户向上滚动（不在底部），则停止自动滚动
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

  if (!isAtBottom) {
    autoScrollEnabled.value = false;
  } else {
    autoScrollEnabled.value = true;
  }
};

const inputValue = ref("");
const outerContainer = ref<HTMLElement | null>(null);
const getClampedPercent = (n: number) => Math.max(10, Math.min(90, Math.round(n)));
const getStoredPercentStr = () => {
  const raw = localStorage.getItem("homeRightPanePercent");
  const n = Number(raw);
  return Number.isFinite(n) ? `${getClampedPercent(n)}%` : "30%";
};
const rightPaneSize = ref<string>(getStoredPercentStr());
const conversationsStore = useConversationStore();
const messagesStore = useMessageStore();
/**
 * 组合的多组聊天信息,可以将上下文一起发送给大模型
 */
const sendedMessage = computed(() =>
  filteredMessages.value
    .filter((message) => message.status !== "loading")
    .map((message) => {
      return {
        role: message.type === "question" ? "user" : "assistant",
        content: message.content,
        ...(message.firstImagePath && {
          firstImagePath: message.firstImagePath,
        }),
        ...(message.lastImagePath && {
          lastImagePath: message.lastImagePath,
        }),
      };
    })
);

const sendNewMessage = async (question: string, firstImagePath?: string) => {
  let copiedFirstImagePath: string | undefined;
  let copiedLastImagePath: string | undefined;

  if (question) {
    // 如果有图片,拷贝图片
    if (firstImagePath) {
      try {
        copiedFirstImagePath =
          await window.electronAPI.copyImageToUserDir(firstImagePath);
      } catch (error) {
        console.log("🚀 ~ createConversation ~ error:", error);
      }
    }
    const data = new Date().toISOString();
    await messagesStore.createMessage({
      content: question,
      type: "question",
      conversationId: conversationId.value,
      createdAt: data,
      updatedAt: data,
      ...(copiedFirstImagePath && { firstImagePath: copiedFirstImagePath }),
      ...(copiedLastImagePath && { lastImagePath: copiedLastImagePath }),
    });
  }
  // 发送新消息时重新启用自动滚动
  autoScrollEnabled.value = true;
  await messageScrollToButtom();

  creatingInitialMessage();
};

const route = useRoute();
let conversationId = ref(parseInt(route.params.id as string));

// 当前对话信息
const conversation = computed(() =>
  conversationsStore.getConversationById(conversationId.value)
);

// messages 数据
const filteredMessages = computed(() => messagesStore.items);
let lastQuestion = computed(() =>
  messagesStore.getLastQuestion(conversationId.value)
);

// 初始化的情况,接收到一个 messageId
const initMessageId = parseInt(route.query.init as string);
// 同时也是进行下一步对话的方法
const creatingInitialMessage = async () => {
  const createdData: Omit<MessageProps, "id"> = {
    // Omit: ts辅助类型,去除MessageProps中的id属性
    content: "",
    conversationId: conversationId.value,
    type: "answer",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "loading",
  };

  // 创建一个回答的数据
  const newMessageId = await messagesStore.createMessage(createdData);

  // 获取供应商信息
  if (conversation) {
    const provider = await db.providers
      .where({ id: conversation.value?.providerId })
      .first();
    // 调用 start-chat接口,发起一次对话
    if (provider) {
      await window.electronAPI.startChat({
        messageId: newMessageId,
        providerName: provider.label,
        selectedModel: conversation.value?.selectedModel as string,
        messages: sendedMessage.value,
      });
    } else {
      // 找不到供应商，直接把错误写入该条消息并结束 loading
      await messagesStore.updateMessage(newMessageId, {
        content: "【错误】未找到所选供应商，请检查设置中的模型与供应商配置。",
        status: "finished",
        updatedAt: new Date().toISOString(),
      });
    }
  }
};

/**
 * 滚动到页面底部
 */
const messageScrollToButtom = async () => {
  // 如果自动滚动被禁用，则不执行滚动
  if (!autoScrollEnabled.value) {
    return;
  }

  await nextTick();
  if (messageListRef.value) {
    messageListRef.value.ref.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }


};

// 路由发生变化重新赋值(切换对话窗口的时候)
watch(
  () => route.params.id,
  async (newId: string) => {
    conversationId.value = parseInt(newId);
    // console.log("🚀 ~ conversationId:", conversationId.value);
    // 切换对话时重新启用自动滚动
    autoScrollEnabled.value = true;
    await messagesStore.fetchMessagesByConversation(conversationId.value);
    await messageScrollToButtom();
  }
);

onMounted(async () => {
  // messages 数据
  await messagesStore.fetchMessagesByConversation(conversationId.value);
  await messageScrollToButtom();

  // 如果是刚创建的对话
  if (initMessageId) {
    await creatingInitialMessage();
  }
  /**
   * 检测该值时候变化来判断是否执行滚动页面的操作
   */
  let currentMesageListHeight = 0;
  let streamContent = "";
  /**
   * 检测高度变化来自动滚动
   */
  const checkAndSrollToBottom = async () => {
    await nextTick();
    if (messageListRef.value) {
      const newHeight = messageListRef.value.ref.clientHeight;
      if (newHeight > currentMesageListHeight) {
        currentMesageListHeight = newHeight;
        await messageScrollToButtom();
        // console.log("滚动");
      }
    }
  };
  // 接受大模型返回数据,更新数据库
  window.electronAPI.onUpdateMessage(async (streamData) => {
    // console.log("🚀 ~ streamData:", streamData);
    const { messageId, data } = streamData;
    streamContent += data.result;
    const updateData = {
      content: streamContent,
      status: data.is_end ? "finished" : ("streaming" as MessageStatus),
      updatedAt: new Date().toISOString(),
    };

    // 响应服务器返回的数据,更新信息流
    await messagesStore.updateMessage(messageId, updateData);
    await checkAndSrollToBottom();

    if (data.is_end) {
      streamContent = "";
    }
  });
  try {
    const cfg = await window.electronAPI.getConfig();
    let p = cfg?.homeRightPanePercent ?? 30;
    p = getClampedPercent(p);
    const target = `${p}%`;
    if (rightPaneSize.value !== target) {
      rightPaneSize.value = target;
    }
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
    percent = getClampedPercent(percent);
    const target = `${percent}%`;
    if (rightPaneSize.value !== target) {
      rightPaneSize.value = target;
    }
    localStorage.setItem("homeRightPanePercent", String(percent));
    await window.electronAPI.updateConfig({ homeRightPanePercent: percent });
  } catch (e) {}
};
</script>

<style></style>
