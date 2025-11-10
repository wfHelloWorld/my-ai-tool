<template>
  <el-tabs v-model="activeName" class="demo-tabs p-4" @tab-click="handleClick">
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
  </el-tabs>
</template>

<script lang="ts" setup>
import { reactive, onMounted, watch, toRaw, ref } from "vue";
import { setI18nLanguage } from "../i18n/index";
import type { AppConfig } from "../types";
import { Icon } from "@iconify/vue";
import { useI18nStore } from "../stores/useI18nStore";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";

const i18nStore = useI18nStore();
const { t } = useI18n();

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

// 窗口缩放比例（通过 Electron 控制），默认 1
const zoom = ref(1);

// 图片缓存：目录路径与大小（字节）
const imagesDirPath = ref("");
const cacheSize = ref(0);

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
    // 初始化缓存信息
    await refreshCacheInfo();
  } catch (error) {
    console.error("获取配置失败:", error);
  }
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
.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 16px;
  font-weight: 600;
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
</style>
