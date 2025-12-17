<template>
  <div class="prose prose-slate prose-headings:my-2 prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none max-w-none" @click="handleClick">
    <vue-markdown :source="source" :plugins="plugins" />
  </div>
</template>

<script lang="ts" setup>
import VueMarkdown from "vue-markdown-render";
import MarkdownItAnchor from "markdown-it-anchor";
import markdownItHighlightjs from "markdown-it-highlightjs";
import "highlight.js/styles/github.css";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import { ElMessage } from "element-plus";
import MarkdownIt from "markdown-it";

// 注册需要的代码高亮语言
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("vue", xml);

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

// Markdown 插件（锚点 + 代码高亮）
const plugins = [MarkdownItAnchor, markdownItHighlightjs, markdownItCopyButton];

defineProps<{
  source: string;
}>();

const handleClick = async (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  
  // 处理复制按钮点击
  if (target.classList.contains("copy-btn")) {
    const code = decodeURIComponent(target.getAttribute("data-code") || "");
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      target.textContent = "已复制";
      setTimeout(() => {
        target.textContent = "复制代码";
      }, 2000);
      ElMessage.success("复制成功");
    } catch (err) {
      console.error("Failed to copy code: ", err);
      ElMessage.error("复制失败");
    }
    return;
  }

  // 处理链接点击
  const link = target.closest("a");
  if (link && link.href) {
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(link.href);
      ElMessage.success("复制网址成功");
    } catch (err) {
      console.error("Failed to copy: ", err);
      ElMessage.error("复制失败");
    }
    return;
  }

  // 处理行内代码点击 (非代码块中的 code)
  const codeEl = target.closest("code");
  // 确保不是代码块(pre)内的 code，避免干扰代码块的选中和复制按钮
  if (codeEl && !codeEl.closest("pre")) {
    const text = codeEl.textContent || "";
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        ElMessage.success(`已复制: ${text}`);
      } catch (err) {
        console.error("Failed to copy inline code: ", err);
        ElMessage.error("复制失败");
      }
    }
  }
};
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

/* 覆盖 prose 的默认 code 样式，使其看起来更像一个可点击的“胶囊” */
.prose :where(code):not(:where(pre code)) {
  background-color: #f3f4f6;
  color: #1f2937;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e7eb;
}

.prose :where(code):not(:where(pre code)):hover {
  background-color: #e5e7eb;
  border-color: #d1d5db;
  color: #000;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* 增加代码块的浅灰色背景和圆角 */
.prose pre {
  background-color: #f8f9fa !important;
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}
</style>
