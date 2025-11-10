import { defineStore } from "pinia";
import { ProviderProps } from "../types";
import { db, initProviders } from "../db";

export type ProviderType = ProviderProps["type"];

export interface providerStore {
  items: ProviderProps[];
}
export const useProvidersStore = defineStore("provider", {
  state: (): providerStore => {
    return {
      items: [],
    };
  },
  getters: {
    // 分类 getters（保留原有 items，不复制状态）
    chats: (state) => state.items.filter((p) => p.type === "chat"),
    visions: (state) => state.items.filter((p) => p.type === "vision"),
    imageGens: (state) => state.items.filter((p) => p.type === "imageGen"),
    audios: (state) => state.items.filter((p) => p.type === "audio"),
    videos: (state) => state.items.filter((p) => p.type === "video"),
    groupedByType: (state) => ({
      chat: state.items.filter((p) => p.type === "chat"),
      vision: state.items.filter((p) => p.type === "vision"),
      imageGen: state.items.filter((p) => p.type === "imageGen"),
      audio: state.items.filter((p) => p.type === "audio"),
      video: state.items.filter((p) => p.type === "video"),
    }),
  },
  actions: {
    async initProvidersStore() {
      // 如果 Providers无数据,读取testData初始化 Providers
      await initProviders();
      this.items = await db.providers.toArray();
    },

    async createProvider(provider: Omit<ProviderProps, "id">) {
      const providerId = db.providers.add(provider);
      return providerId;
    },
    async updateProvider(provider: ProviderProps) {
      return await db.providers.update(provider.id, provider);
    },
    /**
     * 删除
     * @param id id
     * @returns 返回 undefined 删除成功
     */
    async deleteProvider(id: number) {
      return await db.providers.delete(id);
    },
  },
});
