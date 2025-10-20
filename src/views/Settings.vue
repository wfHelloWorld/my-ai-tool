<template>
  <el-tabs v-model="activeName" class="demo-tabs p-4" @tab-click="handleClick">
    <el-tab-pane name="general">
      <template #label>
        <!-- 通用设置标签 -->
        <Icon icon="radix-icons:gear" width="15" height="15" class="pr-0.5" />
        {{ $t("settings.title") }}
      </template>

      <!-- 通用设置内容 -->
      <div>
        <div class="mb-6">
          <label class="block mb-1 font-medium">
            {{ $t("settings.language") }}
          </label>
          <el-radio-group v-model="currentConfig.language">
            <el-radio label="zh">中文</el-radio>
            <el-radio label="en">English</el-radio>
          </el-radio-group>
        </div>

        <div class="mb-6">
          <label class="block mb-1 font-medium">
            {{ $t("settings.fontSize") }}
          </label>
          <el-input-number
            v-model="currentConfig.fontSize"
            :min="10"
            :max="30"
          />
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
        {{ $t("settings.key") }}
      </template>

      <!-- 模型设置内容：折叠面板 -->
      <div class="demo-collapse p-4">
        <el-collapse v-model="activeNames" @change="handleChange">
          <el-collapse-item name="1">
            <template #title="{ isActive }">
              <div :class="['title-wrapper', { 'is-active': isActive }]">
                <el-icon>
                  <img src="../common/img/aLiYunBaiLian.svg" alt="" />
                </el-icon>
                阿里云百炼
              </div>
            </template>
            <div>
              DASHSCOPE_API_KEY:
              <el-input
                v-model="currentConfig.DASHSCOPE_API_KEY"
                placeholder="DASHSCOPE_API_KEY"
                show-password
              />
              URL:
              <el-input
                v-model="currentConfig.DASHSCOPE_URL"
                placeholder="URL"
              />
            </div>
          </el-collapse-item>
          <el-collapse-item name="2">
            <template #title="{ isActive }">
              <div :class="['title-wrapper', { 'is-active': isActive }]">
                <img src="../common/img/deepSeek.png" alt="" class="h-6" />
              </div>
            </template>
            <div>
              DEEPSEEK_API_KEY:
              <el-input
                v-model="currentConfig.DEEPSEEK_API_KEY"
                placeholder="DEEPSEEK_API_KEY"
                show-password
              />
              URL:
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

const i18nStore = useI18nStore();

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
  fontSize: 14,
});

// 页面加载时初始化配置
onMounted(async () => {
  try {
    const config = await window.electronAPI.getConfig();
    if (config) {
      Object.assign(currentConfig, config);
      setI18nLanguage(currentConfig.language);
      i18nStore.setLocale(currentConfig.language);
    }
  } catch (error) {
    console.error("获取配置失败:", error);
  }
});

// 监听配置变化，统一更新
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
  /* 你可以根据需要自定义折叠面板样式 */
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
