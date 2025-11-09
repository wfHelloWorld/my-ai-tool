<template>
  <div class="h-full">
    <!-- 先复用 ConversationList，后续再细化样式与行为 -->
    <div class="h-full overflow-y-auto overflow-x-hidden p-4 mt-[28px]">
      <ConversationList />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ConversationList from "../components/ConversationList.vue";
</script>

<style scoped>
/* 暂无特别样式，后续根据需求调整 */
</style>