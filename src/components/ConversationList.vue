<template>
  <div
    class="item border-gray-300 border-t cursor-pointer  p-2"
    :class="{
      'bg-gray-200 hover:bg-gray-300': conversationsStore.selectedId === item.id,
      'bg-white hover:bg-gray-200': conversationsStore.selectedId !== item.id,
    }"
    v-for="item in conversationsStore.items"
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
import { ConversationPorps } from "src/types";
import { useRouter } from "vue-router";
import { useConversationStore } from "../stores/useConversationStore";
const conversationsStore = useConversationStore();

const router = useRouter();

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
