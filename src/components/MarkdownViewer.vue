<template>
  <div class="markdown-wrapper" @click="handleClick">
    <div v-if="headings.length" class="toc-sticky">
      <div
        class="toc-hover-area"
        @mouseenter="tocOpen = true"
        @mouseleave="tocOpen = false"
      >
        <div class="toc-toggle">
          <span class="toc-toggle-label">目录</span>
          <span class="toc-toggle-arrow" :class="{ 'is-open': tocOpen }">›</span>
        </div>
        <div v-if="tocOpen" class="toc-panel">
          <div class="toc-title">目录</div>
          <ul class="toc-list">
            <li
              v-for="h in headings"
              :key="h.id"
              :class="['toc-item', `toc-level-${h.level}`, { 'is-active': h.id === activeHeadingId }]"
            >
              <button type="button" class="toc-link" @click.stop="scrollToHeading(h.id)">
                {{ h.text }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div
      ref="contentRef"
      class="prose prose-slate prose-headings:my-2 prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none max-w-none"
    >
      <vue-markdown :source="normalizedSource" :plugins="plugins" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, nextTick, computed, onUnmounted } from "vue";
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
import aliyunKeyImgUrl from "../common/img/key-doc/iShot_2026-02-16_17.11.01.png";
import aliyunLoginImgUrl from "../common/img/key-doc/iShot_2026-02-16_15.25.30.png";

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

const plugins = [MarkdownItAnchor, markdownItHighlightjs, markdownItCopyButton];

const props = defineProps<{
  source: string;
}>();

const imageAssetMap: Record<string, string> = {
// 由 Settings页面的[密钥说明] 调用
  "../common/img/key-doc/iShot_2026-02-16_17.11.01.png": aliyunKeyImgUrl,
  "../common/img/key-doc/iShot_2026-02-16_15.25.30.png": aliyunLoginImgUrl,
};

const normalizeSource = (raw: string): string =>
  raw.replace(/!\[([^\]]*)]\(([^)]+)\)/g, (match, alt, src) => {
    const mapped = imageAssetMap[src];
    if (!mapped) return match;
    return `![${alt}](${mapped})`;
  });

const normalizedSource = computed(() => normalizeSource(props.source));

const contentRef = ref<HTMLElement | null>(null);

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

const headings = ref<HeadingItem[]>([]);
const tocOpen = ref(false);
const activeHeadingId = ref<string | null>(null);
let scrollContainer: HTMLElement | Window | null = null;

const updateActiveHeading = () => {
  const root = contentRef.value;
  if (!root || !headings.value.length) return;
  const offset = 120;
  let currentId: string | null = null;
  for (const h of headings.value) {
    const el = root.querySelector<HTMLElement>(`#${h.id}`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top <= offset) {
      currentId = h.id;
    } else {
      break;
    }
  }
  if (!currentId) {
    currentId = headings.value[0].id;
  }
  activeHeadingId.value = currentId;
};

const handleScroll = () => {
  updateActiveHeading();
};

const removeScrollListener = () => {
  if (!scrollContainer) return;
  if (scrollContainer instanceof Window) {
    scrollContainer.removeEventListener("scroll", handleScroll);
  } else {
    scrollContainer.removeEventListener("scroll", handleScroll);
  }
  scrollContainer = null;
};

const setupScrollListener = () => {
  removeScrollListener();
  const root = contentRef.value;
  if (!root) return;
  const container = root.closest<HTMLElement>(".el-scrollbar__wrap");
  if (container) {
    scrollContainer = container;
    container.addEventListener("scroll", handleScroll, { passive: true });
  } else {
    scrollContainer = window;
    window.addEventListener("scroll", handleScroll, { passive: true });
  }
};

const buildHeadings = () => {
  const root = contentRef.value;
  if (!root) return;
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")
  );
  const list: HeadingItem[] = [];
  const usedIds = new Set<string>();
  elements.forEach((el, index) => {
    const text = el.textContent ? el.textContent.trim() : "";
    if (!text) return;
    const base = text
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-\u4e00-\u9fa5]/g, "");
    let candidate = base || `heading-${index + 1}`;
    if (/^[-\d]/.test(candidate)) {
      candidate = `h-${candidate}`;
    }
    let suffix = 1;
    while (usedIds.has(candidate)) {
      candidate = `${base || "heading"}-${suffix++}`;
    }
    const id = candidate;
    el.id = id;
    usedIds.add(id);
    const level = Number(el.tagName.substring(1)) || 1;
    list.push({ id, text, level });
  });
  headings.value = list;
};

const scrollToHeading = (id: string) => {
  const root = contentRef.value;
  if (!root) return;
  const target = root.querySelector<HTMLElement>(`#${id}`);
  if (!target) return;
  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });
};

onMounted(async () => {
  await nextTick();
  buildHeadings();
  updateActiveHeading();
  setupScrollListener();
});

watch(
  () => props.source,
  async () => {
    await nextTick();
    buildHeadings();
    updateActiveHeading();
    setupScrollListener();
  }
);

onUnmounted(() => {
  removeScrollListener();
});

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

.markdown-wrapper {
  position: relative;
  overflow: visible;
}

.toc-sticky {
  position: sticky;
  top: 0;
  z-index: 30;
  pointer-events: none;
}

.toc-hover-area {
  position: relative;
  pointer-events: auto;
}

.toc-toggle {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  z-index: 30;
  pointer-events: auto;
}

.toc-toggle-arrow {
  display: inline-block;
  transition: transform 0.2s ease;
}

.toc-toggle-arrow.is-open {
  transform: rotate(90deg);
}

.toc-panel {
  position: absolute;
  top: 2.1rem;
  right: 0.5rem;
  width: 220px;
  max-height: 60vh;
  overflow: auto;
  background-color: rgba(255, 255, 255, 0.96);
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 0.5rem 0.75rem 0.6rem;
  font-size: 0.8rem;
  z-index: 29;
  pointer-events: auto;
}

.toc-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #111827;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-item {
  margin: 0.12rem 0;
}

.toc-link {
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  color: #374151;
  font-size: 0.78rem;
}

.toc-link:hover {
  background-color: #e5e7eb;
}

.toc-item.is-active .toc-link {
  background-color: #e5e7eb;
  color: #111827;
  font-weight: 600;
}

.toc-level-1 .toc-link {
  font-weight: 600;
  padding-left: 2px;
}

.toc-level-2 .toc-link {
  padding-left: 12px;
}

.toc-level-3 .toc-link {
  padding-left: 20px;
}

.toc-level-4 .toc-link,
.toc-level-5 .toc-link,
.toc-level-6 .toc-link {
  padding-left: 28px;
  font-size: 0.76rem;
}
</style>
