<template>
  <el-select v-model="currentModel" placeholder="Select" @change="valuechange" filterable class="w-full">
    <template #label="{ label }">
      <span class="flex items-center space-x-2">
        <Icon v-if="avatar" :icon="avatar" width="24" height="24" />
        <span>{{ label }}</span>
      </span>
    </template>
    <el-option v-for="item in providers" :key="item.id" :label="item.title" :value="`${item.id}/${item.name}`">
      <template #default>
        <span class="flex items-center space-x-2">
          <Icon :icon="item.avatar as string" width="24" height="24" />
          <!-- <img :src="item.avatar" alt="icon" class="w-4 h-4" /> -->
          <span>{{ item.title }}</span>
        </span>
      </template>
    </el-option>
  </el-select>
</template>

<script lang="ts" setup>
import { ProviderProps } from "../types";
import { Icon } from "@iconify/vue";
import { computed, watch, onMounted } from "vue";
import { useProvidersStore } from "../stores/useProviderStore";
import { useRoute } from "vue-router";
const providersStore = useProvidersStore();
const route = useRoute();
// 根据当前路由在组件内使用 items 做一次独立筛选
const providers = computed(() => {
  const items = providersStore.items || [];
  const path = route.path;
  let targetType: ProviderProps["type"] = "chat";
  if (path.startsWith("/vision")) targetType = "vision";
  else if (path.startsWith("/image")) targetType = "imageGen";
  else if (path.startsWith("/voice")) targetType = "audio";
  else if (path.startsWith("/video")) targetType = "video";

  // 兼容旧数据：如果 type 缺失或不在允许范围内，按名称推断（默认 chat）
  const allowed: ProviderProps["type"][] = ["chat", "vision", "imageGen", "audio", "video"];
  const normalize = (p: ProviderProps): ProviderProps["type"] => {
    const t = (p as any).type as ProviderProps["type"];
    if (t && allowed.includes(t)) return t;
    const name = (p.name || "").toLowerCase();
    if (name.includes("vl") || name.includes("vision")) return "vision";
    return "chat";
  };

  const filtered = items.filter((p) => normalize(p) === targetType);
  if (filtered.length === 0 && items.length > 0) {
    console.warn(
      `[ProviderSelect] Fallback: type=${targetType} 没有匹配项，暂时显示全部 items。请检查 providers 的 type 字段。`,
      items.map((i) => ({ id: i.id, name: i.name, type: (i as any).type }))
    );
    return items;
  }
  return filtered;
});

// 组件挂载时，若还未初始化，则主动初始化，确保打包版也能显示模型
onMounted(async () => {
  try {
    if (!providersStore.items || providersStore.items.length === 0) {
      await providersStore.initProvidersStore();
    }
  } catch (err) {
    console.warn("ProviderSelect init failed:", err);
  }
});

const valuechange = (val: string) => {
  console.log("选中值:", val);
};

/**
 * 输入框内的图标
 */
const avatar = computed(() => {
  if (!currentModel.value) return '';

  const parts = currentModel.value.split('/');
  if (parts.length === 0) return '';

  const idStr = parts[0];
  const id = Number(idStr);
  if (isNaN(id)) return '';

  const item = providers.value.find(i => i.id === id);
  return item?.avatar || '';
});


const currentModel = defineModel<string>(); // 父子组件数据传输(defineModel)

// 路由或 providers 列表变化时，保证选中项属于当前分类；否则默认选中第一个
watch(
  () => providers.value,
  (newItems) => {
    if (!newItems || newItems.length === 0) {
      currentModel.value = '';
      return;
    }

    const parts = currentModel.value?.split('/') ?? [];
    const idStr = parts[0];
    const currentId = idStr ? Number(idStr) : NaN;
    const exists = !isNaN(currentId) && newItems.some(i => i.id === currentId);

    if (!exists) {
      currentModel.value = `${newItems[0].id}/${newItems[0].name}`;
    }
  },
  { immediate: true }
);
</script>
