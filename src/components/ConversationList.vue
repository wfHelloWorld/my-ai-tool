<template>
  <div
    class="item border-gray-300 border-t cursor-pointer  p-2"
    :class="{
      'bg-gray-200 hover:bg-gray-300': conversationsStore.selectedId === item.id,
      'bg-white hover:bg-gray-200': conversationsStore.selectedId !== item.id,
    }"
    v-for="item in filteredItems"
    @contextmenu.prevent="openContextMenu(item.id)"
  >
    <a @click.prevent="goToConversation(item.id)">
      <div
        class="flex justify-between items-center text-sm leading-5 text-gray-500"
      >
        <span>{{ item.selectedModel }}</span>
        <!-- <span>{{ new Date(item.updatedAt).toLocaleString() }} </span> -->
        <span>{{ dayjs(item.updatedAt).format("YYYY-MM-DD") }} </span>
      </div>

      <h2 class="font-semibold leading-6 text-gray-900 truncate">
        {{ item.title }}
      </h2>
    </a>
  </div>
</template>

<script lang="ts" setup>
import dayjs from "dayjs";
import { ProviderProps } from "src/types";
import { useRouter, useRoute } from "vue-router";
import { computed } from "vue";
import { useConversationStore } from "../stores/useConversationStore";
import { useProvidersStore } from "../stores/useProviderStore";

const conversationsStore = useConversationStore();
const providersStore = useProvidersStore();

const router = useRouter();
const route = useRoute();

const props = defineProps<{ filterType?: ProviderProps["type"] }>();

// 兼容旧数据：当 provider.type 缺失或异常时进行归一化
const allowed: ProviderProps["type"][] = ["chat", "vision", "imageGen", "audio", "video"];
const normalizeType = (p?: ProviderProps | null): ProviderProps["type"] | undefined => {
  if (!p) return undefined;
  const t = (p as any).type as ProviderProps["type"] | undefined;
  if (t && allowed.includes(t)) return t;
  const name = (p.name || "").toLowerCase();
  if (name.includes("vl") || name.includes("vision")) return "vision";
  return "chat";
};

const currentType = computed<ProviderProps["type"] | undefined>(() => {
  // 优先使用外部传入的筛选类型，以避免依赖路由前缀
  if (props.filterType) return props.filterType;
  // 在对话页，根据选中会话的 provider.type 进行筛选
  if (route.path.startsWith("/conversation")) {
    const current = conversationsStore.items.find((c) => c.id === conversationsStore.selectedId);
    const provider = providersStore.items.find((p) => p.id === (current?.providerId as number));
    return normalizeType(provider);
  }
  return undefined;
});

const filteredItems = computed(() => {
  const t = currentType.value;
  if (!t) return conversationsStore.items;
  return conversationsStore.items.filter((c) => {
    const provider = providersStore.items.find((p) => p.id === (c.providerId as number));
    return normalizeType(provider) === t;
  });
});

const openContextMenu = (id: number) => {
  window.electronAPI.showContextMenu(id);
};

// query（查询参数）：用于传递额外参数给目标页面，页面可以通过路由对象读取这些参数。
// 例如，组件里可以通过 route.query.name 访问 "viking"。

// hash（锚点）：用于页面内定位到某个锚点或触发某些逻辑。
// 例如，页面 URL 末尾的 #foo，浏览器会尝试滚动到 id 为 foo 的元素。
const goToConversation = (id: number) => {
  conversationsStore.selectedId = id;
  router.push({
    path: `/conversation/${id}`,
    query: { name: "viking" },
    hash: "#foo",
  });
  // router.push("/conversation");
  // 或者传对象
  // router.push({ path: '/settings' });
};
</script>

<style></style>
