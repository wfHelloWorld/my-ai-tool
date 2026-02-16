<template>
  <el-tabs v-model="activeName" class="demo-tabs p-4 h-full flex flex-col" @tab-click="handleClick">
    <el-tab-pane name="general">
      <template #label>
        <!-- 通用设置标签 -->
        <Icon icon="radix-icons:gear" width="15" height="15" class="pr-0.5" />
        <span class="select-none">{{ $t("settings.title") }}</span>
      </template>

      <!-- 通用设置内容 -->
      <div>
        <div class="mb-6">
          <label class="block mb-1 font-medium select-none">
            {{ $t("settings.language") }}
          </label>
          <el-radio-group v-model="currentConfig.language">
            <el-radio label="zh">中文</el-radio>
            <el-radio label="en">English</el-radio>
          </el-radio-group>
        </div>

        <div class="mb-6">
          <label class="block mb-1 font-medium select-none">
            {{ $t("settings.fontSize") }}
          </label>
          <!-- 显示当前缩放倍率，仅供查看 -->
          <div class="flex items-center gap-2">
            <el-text class="select-none" size="large">
              {{ (zoom * 100).toFixed(0) }}%
            </el-text>
            <el-text class="select-none" type="info" size="small">
              ×{{ zoom.toFixed(2) }}
            </el-text>
          </div>
          <div class="mt-2">
            <el-text class="mx-1 select-none" type="info" size="small">
              {{ $t("settings.zoomShortcuts") }}
            </el-text>
          </div>
        </div>

        <!-- 图片缓存：显示大小与清理按钮，并显示实际缓存目录路径 -->
        <div class="mb-6">
          <label class="block mb-1 font-medium select-none">
            {{ $t("settings.imageCache") }}
          </label>
          <div class="flex items-center gap-3">
            <el-text class="select-none" size="large">
              {{ formatBytes(cacheSize) }}
            </el-text>
            <el-button type="warning" @click="onClearCache">
              {{ $t("settings.clearCache") }}
            </el-button>
          </div>
          <div class="mt-2">
            <el-text class="mx-1 select-none" type="info" size="small">
              {{ $t("settings.cacheDir") }}：
              <el-link type="primary" :underline="true" @click="onOpenCacheDir">
                {{ imagesDirPath || $t("settings.unknown") }}
              </el-link>
            </el-text>
          </div>
        </div>

      </div>
    </el-tab-pane>

    <el-tab-pane name="keys">
      <template #label>
        <!-- 模型设置标签 -->
        <Icon
          icon="ant-design:key-outlined"
          width="15"
          height="15"
          class="pr-0.5"
        />
        <span class="select-none">{{ $t("settings.key") }}</span>
      </template>

      <!-- 模型设置内容：折叠面板 -->
      <div class="demo-collapse p-4">
        <el-collapse v-model="activeNames" @change="handleChange">
          <el-collapse-item name="1">
            <template #title="{ isActive }">
              <div :class="['title-wrapper select-none', { 'is-active': isActive }]">
                <el-icon>
                  <img src="../common/img/aLiYunBaiLian.svg" alt="" />
                </el-icon>
                阿里云百炼
              </div>
            </template>
            <div>
              <span class="select-none">DASHSCOPE_API_KEY:</span>
              <el-input
                v-model="currentConfig.DASHSCOPE_API_KEY"
                placeholder="DASHSCOPE_API_KEY"
                show-password
              />
              <span class="select-none">URL:</span>
              <el-input
                v-model="currentConfig.DASHSCOPE_URL"
                placeholder="URL"
              />
            </div>
          </el-collapse-item>
          <el-collapse-item name="2">
            <template #title="{ isActive }">
              <div :class="['title-wrapper select-none', { 'is-active': isActive }]">
                <img src="../common/img/deepSeek.png" alt="" class="h-6" />
              </div>
            </template>
            <div>
              <span class="select-none">DEEPSEEK_API_KEY:</span>
              <el-input
                v-model="currentConfig.DEEPSEEK_API_KEY"
                placeholder="DEEPSEEK_API_KEY"
                show-password
              />
              <span class="select-none">URL:</span>
              <el-input
                v-model="currentConfig.DEEPSEEK_URL"
                placeholder="URL"
              />
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-tab-pane>

    <!-- 密钥说明标签 -->
    <el-tab-pane name="key-doc">
      <template #label>
        <Icon icon="mdi:book-information-outline" width="15" height="15" class="pr-0.5" />
        <span class="select-none">{{ $t("settings.keyDoc") }}</span>
      </template>
      <div class="demo-collapse log-pane provider-pane">
        <el-scrollbar style="height: 100%">
          <MarkdownViewer :source="apiKeyGuideMd" />
        </el-scrollbar>
      </div>
    </el-tab-pane>

    <el-tab-pane name="provider-manage">
      <template #label>
        <Icon icon="mdi:database-cog-outline" width="15" height="15" class="pr-0.5" />
        <span class="select-none">{{ $t("settings.providerManageTab") }}</span>
      </template>
      <div class="demo-collapse log-pane provider-pane">
        <div class="flex items-center gap-2 mb-3">
          <el-button size="small" type="primary" @click="reloadProviders" :loading="loadingProviders">
            {{ $t("settings.providerRefresh") }}
          </el-button>
          <el-button
            size="small"
            type="success"
            @click="onAddProvider"
            :loading="addingProvider"
          >
            {{ $t("settings.providerAdd") }}
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="onResetProviders"
            :loading="resettingProviders"
          >
            {{ $t("settings.providerResetAll") }}
          </el-button>
        </div>
        <div class="mb-2 space-y-1">
          <div>
            <el-text type="info" size="small" class="select-none">
              {{ $t("settings.providerNote") }}
            </el-text>
          </div>
          <div class="flex items-center gap-2">
            <el-text type="info" size="small" class="select-none">
              {{ $t("settings.providerIconTip") }}
            </el-text>
            <el-link
              type="primary"
              :href="iconifyUrl"
              target="_blank"
              :underline="false"
            >
              https://iconify.design/
            </el-link>
          </div>
        </div>
        <el-table
          v-loading="loadingProviders"
          :data="editingProviders"
          size="small"
          border
          :style="{ width: providerTableWidth }"
        >
          <el-table-column
            fixed
            prop="id"
            :label="$t('settings.providerId')"
            align="center"
            width="60"
          />
          <el-table-column
            fixed
            prop="name"
            :label="$t('settings.providerName')"
            width="160"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <el-input v-model="row.name" size="small" />
            </template>
          </el-table-column>
          <el-table-column
            prop="avatar"
            :label="$t('settings.providerAvatar')"
            width="220"
          >
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <Icon
                  v-if="row.avatar"
                  :icon="row.avatar as string"
                  width="20"
                  height="20"
                />
                <el-select
                  v-model="row.avatar"
                  size="small"
                  class="w-full"
                  filterable
                  allow-create
                  default-first-option
                  :placeholder="$t('settings.providerAvatarPlaceholder')"
                >
                  <el-option
                    v-for="opt in builtinIconOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  >
                    <div class="flex items-center gap-2">
                      <Icon :icon="opt.value" width="18" height="18" />
                      <span>{{ opt.label }}</span>
                    </div>
                  </el-option>
                </el-select>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="title"
            :label="$t('settings.providerTitle')"
            width="220"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <el-input v-model="row.title" size="small" />
            </template>
          </el-table-column>
          <el-table-column
            prop="label"
            :label="$t('settings.providerLabel')"
            width="140"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <el-input v-model="row.label" size="small" />
            </template>
          </el-table-column>
          <el-table-column
            prop="type"
            :label="$t('settings.providerType')"
            width="120"
          >
            <template #default="{ row }">
              <el-select v-model="row.type" size="small" class="w-full">
                <el-option :label="$t('settings.providerTypeChat')" value="chat" />
                <el-option :label="$t('settings.providerTypeVision')" value="vision" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column
            prop="url"
            label="URL"
            min-width="260"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <el-input
                v-model="row.url"
                size="small"
                :placeholder="$t('settings.providerUrlPlaceholder')"
              />
            </template>
          </el-table-column>
          <el-table-column :label="$t('settings.providerActions')" width="160" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="onSaveProvider(row)"
                :loading="savingId === row.id"
              >
                {{ $t("settings.providerSave") }}
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="onDeleteProvider(row)"
                :loading="deletingId === row.id"
              >
                {{ $t("settings.providerDelete") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-tab-pane>

    <!-- 版本日志标签 -->
    <el-tab-pane name="log">
      <template #label>
        <Icon icon="ant-design:file-text-outlined" width="15" height="15" class="pr-0.5" />
        <span class="select-none">{{ $t("settings.versionLog") }}</span>
      </template>
      <div class="demo-collapse log-pane">
        <el-scrollbar style="height: 100%">
          <MarkdownViewer :source="logMd" />
        </el-scrollbar>
      </div>
    </el-tab-pane>

  </el-tabs>
</template>

<script lang="ts" setup>
import { reactive, onMounted, watch, toRaw, ref, onUnmounted } from "vue";
import { setI18nLanguage } from "../i18n/index";
import type { AppConfig, ProviderProps } from "../types";
import { Icon } from "@iconify/vue";
import { useI18nStore } from "../stores/useI18nStore";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import MarkdownViewer from "../components/MarkdownViewer.vue";
import logMdContent from "../common/md/log.md?raw";
import apiKeyGuideMdContent from "../common/md/api-key-guide.md?raw";
import { useProvidersStore } from "../stores/useProviderStore";

const i18nStore = useI18nStore();
const providersStore = useProvidersStore();
const { t } = useI18n();

const iconifyUrl = "https://iconify.design/";
const builtinIconOptions = [
  { label: "Basketball (bx:basketball)", value: "bx:basketball" },
  { label: "Beer (bx:beer)", value: "bx:beer" },
  { label: "Chat (mdi:chat-processing-outline)", value: "mdi:chat-processing-outline" },
  { label: "Robot (mdi:robot-outline)", value: "mdi:robot-outline" },
  { label: "Image (mdi:image-outline)", value: "mdi:image-outline" },
  { label: "Vision (mdi:eye-outline)", value: "mdi:eye-outline" },
] as const;

const activeName = ref("general");

// 折叠面板激活项，默认展开第一个
const activeNames = ref(["1"]);

const handleClick = (tab: any, event: Event) => {
  // console.log("切换标签页:", tab.paneName);
};

const handleChange = (val: string[] | string) => {
  // console.log("折叠面板变化，当前激活项:", val);
};

const currentConfig = reactive<AppConfig>({
  language: "zh",
  fontSize: 1,
});

const logMd = ref(logMdContent);
const apiKeyGuideMd = ref(apiKeyGuideMdContent);

// 窗口缩放比例（通过 Electron 控制），默认 1
const zoom = ref(1);

// 图片缓存：目录路径与大小（字节）
const imagesDirPath = ref("");
const cacheSize = ref(0);

const editingProviders = ref<ProviderProps[]>([]);
const providerTableWidth = ref("100%");
const loadingProviders = ref(false);
const resettingProviders = ref(false);
const addingProvider = ref(false);
const savingId = ref<number | null>(null);
const deletingId = ref<number | null>(null);

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`;
};

const refreshCacheInfo = async () => {
  try {
    imagesDirPath.value = await window.electronAPI.getImagesDirPath();
  } catch (e) {
    imagesDirPath.value = "";
  }
  try {
    cacheSize.value = await window.electronAPI.getImagesCacheSize();
  } catch (e) {
    cacheSize.value = 0;
  }
};

const loadProviders = async () => {
  loadingProviders.value = true;
  try {
    if (!providersStore.items || providersStore.items.length === 0) {
      await providersStore.initProvidersStore();
    }
    editingProviders.value = providersStore.items.map((p) => ({ ...p }));
  } catch (e) {
    console.error("加载模型列表失败:", e);
  } finally {
    loadingProviders.value = false;
  }
};

const reloadProviders = async () => {
  await loadProviders();
};

const handleProviderTableResize = () => {
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth || 0;
  const target = Math.max(viewportWidth - 250, 600);
  providerTableWidth.value = `${target}px`;
};

const onAddProvider = async () => {
  const base: Omit<ProviderProps, "id"> = {
    name: "",
    title: "",
    desc: "",
    avatar: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    label: "",
    type: "chat",
    url: "",
  };
  try {
    addingProvider.value = true;
    const newId = await providersStore.createProvider(base);
    editingProviders.value.push({ ...(base as ProviderProps), id: newId } as ProviderProps);
    ElMessage.success(t("settings.providerAddSuccess"));
  } catch (e) {
    console.error("新增模型失败:", e);
    ElMessage.error(t("settings.providerAddFailed"));
  } finally {
    addingProvider.value = false;
  }
};

const onResetProviders = async () => {
  if (!window.confirm("确定将所有模型恢复为默认配置？")) return;
  try {
    resettingProviders.value = true;
    await providersStore.resetProviders();
    editingProviders.value = providersStore.items.map((p) => ({ ...p }));
    ElMessage.success("已重置所有模型为默认配置");
  } catch (e) {
    console.error("重置模型失败:", e);
    ElMessage.error("重置模型失败");
  } finally {
    resettingProviders.value = false;
  }
};

const onSaveProvider = async (row: ProviderProps) => {
  try {
    if (row.type !== "chat" && row.type !== "vision") {
      ElMessage.error(t("settings.providerTypeLimit"));
      return;
    }
    savingId.value = row.id ?? null;
    if (!row.id) {
      const base: Omit<ProviderProps, "id"> = {
        name: row.name,
        title: row.title,
        desc: row.desc ?? "",
        avatar: row.avatar ?? "",
        createdAt: row.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        label: row.label,
        type: row.type,
        url: row.url,
      };
      const newId = await providersStore.createProvider(base);
      row.id = newId;
    } else {
      row.updatedAt = new Date().toISOString();
      await providersStore.updateProvider(row);
    }
    ElMessage.success(t("settings.providerSaveSuccess"));
  } catch (e) {
    console.error("保存模型失败:", e);
    ElMessage.error(t("settings.providerSaveFailed"));
  } finally {
    savingId.value = null;
  }
};

const onDeleteProvider = async (row: ProviderProps) => {
  if (!row.id) {
    ElMessage.error(t("settings.providerDeleteFailed"));
    return;
  }
  const name = row.title || row.name || String(row.id);
  const confirmText = t("settings.providerDeleteConfirm", { name });
  if (!window.confirm(confirmText)) return;
  try {
    deletingId.value = row.id;
    await providersStore.deleteProvider(row.id);
    editingProviders.value = editingProviders.value.filter((p) => p.id !== row.id);
    ElMessage.success(t("settings.providerDeleteSuccess"));
  } catch (e) {
    console.error("删除模型失败:", e);
    ElMessage.error(t("settings.providerDeleteFailed"));
  } finally {
    deletingId.value = null;
  }
};

const onClearCache = async () => {
  try {
    const result = await window.electronAPI.clearImagesCache();
    await refreshCacheInfo();
    ElMessage.success(t("settings.clearCacheSuccess", { count: result.removedFiles, size: formatBytes(result.freedBytes) }));
  } catch (e) {
    ElMessage.error(t("settings.clearCacheFailed"));
  }
};

const onOpenCacheDir = async () => {
  try {
    const res = await window.electronAPI.openImagesDir();
    if (!res || !res.success) {
      ElMessage.error(t("settings.openCacheDirFailed"));
    }
  } catch (e) {
    ElMessage.error(t("settings.openCacheDirFailed"));
  }
};

// 页面加载时初始化配置与缩放
onMounted(async () => {
  try {
    const config = await window.electronAPI.getConfig();
    if (config) {
      Object.assign(currentConfig, config);
      setI18nLanguage(currentConfig.language);
      i18nStore.setLocale(currentConfig.language);
    }
    // 获取当前缩放比例
    const z = await window.electronAPI.getZoomFactor();
    zoom.value = z ?? 1;
    // 订阅主进程缩放变化（菜单/快捷键触发）
    window.electronAPI.onZoomFactorChanged((factor: number) => {
      zoom.value = factor;
      currentConfig.fontSize = factor;
    });
    await refreshCacheInfo();
    await loadProviders();
    handleProviderTableResize();
    window.addEventListener("resize", handleProviderTableResize);
  } catch (error) {
    console.error("获取配置失败:", error);
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", handleProviderTableResize);
});

// 监听配置变化（语言等），统一更新
watch(
  currentConfig,
  async (newConfig) => {
    try {
      const plainConfig = JSON.parse(JSON.stringify(toRaw(newConfig)));
      await window.electronAPI.updateConfig(plainConfig);
      setI18nLanguage(newConfig.language);
      i18nStore.setLocale(newConfig.language);
    } catch (error) {
      console.error("更新配置失败:", error);
    }
  },
  { deep: true }
);
</script>

<style scoped>
.demo-tabs {
  /* 让整个 Tabs 组件占满父容器高度 */
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 允许子内容滚动 */
}

.demo-tabs > :deep(.el-tabs__content) {
  /* 让内容区撑满并为子项提供伸展空间 */
  flex: 1;
  min-height: 0; /* 允许内部滚动 */
  display: flex; /* 让 pane 可设置为 flex:1 */
  padding: 16px 24px;
  color: #6b778c;
  font-size: 16px;
  font-weight: 600;
}

/* 让每个 pane 也撑满内容区高度 */
.demo-tabs :deep(.el-tab-pane) {
  flex: 1;
  min-height: 0; /* 允许内部滚动 */
  display: flex;
  flex-direction: column;
}

.demo-collapse {
  /* 基础占位样式，避免空规则导致的 linter 警告 */
  margin: 0;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.title-wrapper.is-active {
  color: var(--el-color-primary);
}
/* 版本日志模块：限制高度并允许滚动 */
.log-pane {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 4px 8px 8px 0;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.provider-pane {
  overflow: auto;
}

/* 确保 el-scrollbar 及其内部 wrap 高度继承到 100% */
.log-pane :deep(.el-scrollbar),
.log-pane :deep(.el-scrollbar__wrap) {
  height: 100%;
}

/* 代码块横向内容溢出时允许横向滚动 */
/* 穿透到子组件中的代码块，允许横向滚动 */
.log-pane :deep(pre) {
  overflow-x: auto;
}

/* 版本日志内容长文本断行，避免横向溢出 */
/* 穿透到 Markdown 渲染内容，长文本断行避免横向溢出 */
.log-pane :deep(.prose) {
  word-break: break-word;
}
</style>
