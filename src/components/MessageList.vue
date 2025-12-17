<template>
  <div class="message-list" ref="_ref" >
    <div
      class="message-item mb-3"
      v-for="message in messages"
      :key="message.id"
    >
      <!-- 问题向右对齐,回答向左对齐 -->
      <div
        class="flex"
        :class="{
          'justify-end': message.type === 'question',
          'justify-start': message.type === 'answer',
        }"
      >
        <div class="message">
          <div
            id="time"
            class="text-sm text-gray-500 mb-2"
            :class="{ 'text-right': message.type === 'question' }"
          >
            <!-- 问题的复制按钮 -->
            <span v-if="message.type === 'question'" class="mr-4">
              <el-button
                size="small"
                type="default"
                @click="copyMessageContent(message.content)"
              >
                <Icon icon="radix-icons:copy" width="15" height="15" />
              </el-button>
            </span>
            <!-- 时间戳 -->
            <!-- {{ message.createdAt }} -->
            <!-- {{ new Date(message.createdAt).toLocaleString() }} -->
            <span>
              {{ dayjs(message.createdAt).format("YYYY-MM-DD HH:mm:ss") }}
            </span>
            <!-- 回答的复制按钮 -->
            <span v-if="message.type === 'answer'" class="ml-4">
              <el-button
                size="small"
                type="default"
                @click="copyMessageContent(message.content)"
              >
                <Icon icon="radix-icons:copy" width="15" height="15" />
              </el-button>
            </span>
          </div>
          <div
            class="message-question bg-green-100 text-white rounded-md px-6 py-1"
            v-if="message.type === 'question'"
          >
            <!-- 图片预览 -->
            <img
              v-if="message.firstImagePath"
              :src="toSafeFileUrl(message.firstImagePath)"
              alt="messageImage"
              class="h-50 object-cover rounded block"
            />
            <img
              v-if="message.lastImagePath"
              :src="toSafeFileUrl(message.lastImagePath)"
              alt="messageImage"
              class="h-50 object-cover rounded block"
            />
            <div class="prose prose-slate prose-headings:my-2 prose-pre:p-0">
              <MarkdownViewer :source="message.content" />
            </div>
          </div>
          <!-- 加载中的处理 -->
          <div
            class="message-answer bg-gray-100 text-gray-700 rounded-md px-6 py-1"
            v-if="message.type === 'answer'"
          >
            <template v-if="message.status === 'loading'">
              <Icon
                icon="eos-icons:three-dots-loading"
                width="24"
                height="24"
              />
            </template>
            <template v-else>
              <!-- {{ message.content }} -->
              <div class="prose prose-slate prose-headings:my-2 prose-pre:p-0">
                <MarkdownViewer :source="message.content" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import { MessageProps } from "../types";
import dayjs from "dayjs";
import MarkdownViewer from "./MarkdownViewer.vue";
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";

/**
 * 下划线 "_" 表示是私有变量
 */
const _ref = ref<HTMLDivElement>();

// 暴露 DOM 节点,在外部的 conversation.vue中调用
defineExpose({
  ref: _ref,
});

defineProps<{ messages: MessageProps[] }>();

// 统一构造跨平台安全的图片地址（Windows/macOS 都适用）
function toSafeFileUrl(localPath: string) {
  if (!localPath) return "";
  // 在渲染进程侧进行一次编码，避免路径中的空格或中文导致 URL 解析异常
  return `safe-file://${encodeURIComponent(localPath)}`;
}

function copyMessageContent(content: string) {
  if (!content) return;
  navigator.clipboard
    .writeText(content)
    .then(() => {
      ElMessage.success("复制成功");
    })
    .catch((err) => {
      ElMessage.error("复制失败,error: ", err);
    });
}

onMounted(() => {
  // 移除全局监听，避免冲突或重复监听
});
</script>

<style>
/* 移除局部样式，改用 MarkdownViewer 组件内部样式 */
</style>
