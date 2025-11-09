<template>
  <div class="h-full p-6">
    <el-text tag="h1" size="large">{{ i18nStore.t('common.voice') }}</el-text>
  </div>
</template>
<script setup lang="ts">
import { useI18nStore } from "../stores/useI18nStore";
const i18nStore = useI18nStore();
</script>