<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <el-tooltip placement="top" effect="dark">
          <template #content>
            <div>是否开启联网搜索，可能增加 Token 消耗。</div>
          </template>
          <span class="cursor-help">联网搜索</span>
        </el-tooltip>
      </div>
      <el-switch v-model="extraParams.enable_search" />
    </div>
    <div v-if="extraParams.enable_search && extraParams.search_options" class="ml-4 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <el-tooltip placement="top" effect="dark">
          <template #content>
            <div>强制搜索，模型每次都会发起联网搜索。</div>
          </template>
          <span class="cursor-help">强制搜索</span>
        </el-tooltip>
        <el-switch v-model="extraParams.search_options.forced_search" />
      </div>
      <div class="flex items-center justify-between">
        <el-tooltip placement="top" effect="dark">
          <template #content>
            <div>搜索策略：turbo 兼顾速度，max 更全面，agent 多轮检索。</div>
          </template>
          <span class="cursor-help">搜索策略</span>
        </el-tooltip>
        <el-select v-model="extraParams.search_options.search_strategy" class="!w-40" size="small">
          <el-option label="turbo" value="turbo" />
          <el-option label="max" value="max" />
          <el-option label="agent" value="agent" />
        </el-select>
      </div>
      <div class="flex items-center justify-between">
        <el-tooltip placement="top" effect="dark">
          <template #content>
            <div>开启垂域搜索，仅在启用联网搜索时生效。</div>
          </template>
          <span class="cursor-help">垂域搜索</span>
        </el-tooltip>
        <el-switch v-model="extraParams.search_options.enable_search_extension" />
      </div>
    </div>
    <div class="flex items-center justify-between">
      <el-tooltip placement="top" effect="dark">
        <template #content>
          <div class="max-w-xs">在创意写作或头脑风暴等需要多样性、趣味性或创造力的场景中，建议调高该值；<br>在技术文档或正式文本等强调一致性与术语准确性的场景中，建议调低该值。</div>
        </template>
        <span class="cursor-help">内容重复度</span>
      </el-tooltip>
      <div class="flex items-center gap-2">
        <div v-if="extraParams.enable_presence_penalty" class="w-32 mr-2">
          <el-slider
            v-model="extraParams.presence_penalty"
            :min="-2"
            :max="2"
            :step="0.1"
            size="small"
          />
        </div>
        <el-switch v-model="extraParams.enable_presence_penalty" />
      </div>
    </div>
    <div class="flex items-center justify-between">
      <el-tooltip placement="top" effect="dark">
        <template #content>
          <div>仅 qwen3-max-preview 且开启思考模式时可用。</div>
        </template>
        <span class="cursor-help">代码解释器</span>
      </el-tooltip>
      <el-switch v-model="extraParams.enable_code_interpreter" />
    </div>
    <div class="flex items-center justify-between">
      <el-tooltip placement="top" effect="dark">
        <template #content>
          <div>启用思考模式，对应 enable_thinking。</div>
        </template>
        <span class="cursor-help">思考模式</span>
      </el-tooltip>
      <el-switch v-model="extraParams.enable_thinking" />
    </div>
    <div v-if="extraParams.enable_thinking" class="ml-4 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <el-tooltip placement="top" effect="dark">
          <template #content>
            <div>思考预算 (Token)，决定思考深度。<br>512(快速) - 4096(深度)</div>
          </template>
          <span class="cursor-help">思考预算</span>
        </el-tooltip>
        <div class="w-40 mr-2">
          <el-slider
            v-model="extraParams.thinking_budget"
            :min="512"
            :max="4096"
            :step="512"
            :marks="thinkingBudgetMarks"
            size="small"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useChatSettingsStore } from "../stores/useChatSettingsStore";
import { storeToRefs } from "pinia";

const chatSettingsStore = useChatSettingsStore();
// Use storeToRefs to keep reactivity when destructuring if needed, 
// but direct access to store properties is also reactive in Vue 3 setup.
// However, in the original code: const { extraParams, thinkingBudgetMarks } = chatSettingsStore;
// extraParams is a reactive object inside the store, so it should be fine.
const { extraParams, thinkingBudgetMarks } = chatSettingsStore;
</script>

<style scoped>
/* Optional: Add any specific styles if needed, though Tailwind classes are used */
</style>
