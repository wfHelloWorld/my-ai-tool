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
              <vue-markdown :source="message.content" :plugins="plugins" />
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
                <vue-markdown :source="message.content" :plugins="plugins" />
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
import VueMarkdown from "vue-markdown-render";
import MarkdownItAnchor from "markdown-it-anchor";
import markdownItHighlightjs from "markdown-it-highlightjs";
import 'highlight.js/styles/github.css';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import MarkdownIt from "markdown-it";

// Register languages with highlight.js
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('vue', xml); // Use XML for Vue files

/**
 * 下划线 "_" 表示是私有变量
 */
const _ref = ref<HTMLDivElement>();

// 暴露 DOM 节点,在外部的 conversation.vue中调用
defineExpose({
  ref: _ref,
});

// 自定义一键复制按钮(自定义一个plugins)
function markdownItCopyButton(md: MarkdownIt) {
  // 保存原始 fence 渲染函数
  const defaultFence = md.renderer.rules.fence!.bind(md.renderer.rules);

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const code = token.content;

    // 调用原始渲染函数，获取高亮后的代码块 HTML
    const highlightedCode = defaultFence(tokens, idx, options, env, self);

    // 在高亮代码块外层包裹复制按钮和容器
    return `
      <div class="code-block-wrapper" style="position: relative;">
        <button class="copy-btn" data-code="${encodeURIComponent(code)}">复制代码</button>
        ${highlightedCode}
      </div>
    `;
  };
}

const plugins = [
  MarkdownItAnchor,
  markdownItHighlightjs,
  markdownItCopyButton, // 自定义的复制按钮插件
];
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
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("copy-btn")) {
      const code = decodeURIComponent(target.getAttribute("data-code") || "");
      if (!code) return;

      navigator.clipboard.writeText(code).then(() => {
        target.textContent = "已复制";
        setTimeout(() => {
          target.textContent = "复制";
        }, 2000);
      });
    }
  });
});
</script>

<style>
.code-block-wrapper {
  position: relative;
  overflow: visible; /* 确保按钮不会被裁剪 */
}

.copy-btn {
  position: absolute;
  left: 0px;
  top: -1rem;
  padding: 1px 8px;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 10;
}
.copy-btn:hover {
  background-color: rgb(218, 255, 232);
}
</style>
