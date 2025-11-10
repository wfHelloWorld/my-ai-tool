<template>
  <el-select
    v-model="currentModel"
    placeholder="Select"
    @change="valuechange"
    filterable
    class="w-full"
  >
    <template #label="{ label }">
      <span class="flex items-center space-x-2">
        <Icon
          v-if="avatar"
          :icon="avatar"
          width="24"
          height="24"
        />
        <span>{{ label }}</span>
      </span>
    </template>
    <el-option
      v-for="item in providers"
      :key="item.id"
      :label="item.title"
      :value="`${item.id}/${item.name}`"
    >
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
import { ProviderProps } from "src/types";
import { Icon } from "@iconify/vue";
import { computed, watch } from "vue";
import { useProvidersStore } from "../stores/useProviderStore";
import { useRoute } from "vue-router";
const providersStore = useProvidersStore();
const route = useRoute();

// 根据当前路由分类显示对应 providers
const providers = computed(() => {
  const path = route.path;
  if (path.startsWith("/vision")) return providersStore.visions;
  if (path.startsWith("/image")) return providersStore.imageGens;
  if (path.startsWith("/voice")) return providersStore.audios;
  if (path.startsWith("/video")) return providersStore.videos;
  // 默认聊天 (home界面)
  return providersStore.chats;
});

// const data = defineProps<{
//   items: ProviderProps[];
// }>();

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
