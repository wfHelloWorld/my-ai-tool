import { defineStore } from "pinia";
import { ProviderProps } from "../types";
import { db, initProviders } from "../db";
import { providers as defaultProviders } from "../testData";

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
  actions: {
    async initProvidersStore() {
      // 如果 Providers 无数据, 读取 testData 初始化 Providers，并补齐缺失 type
      await initProviders();
      this.items = await db.providers.toArray();
    },

    async createProvider(provider: Omit<ProviderProps, "id">) {
      const providerId = await db.providers.add(provider);
      // 直接更新内存
      this.items.push({ ...(provider as ProviderProps), id: providerId } as ProviderProps);
      return providerId;
    },
    
    async updateProvider(provider: ProviderProps) {
      await db.providers.update(provider.id, provider);
      const idx = this.items.findIndex((p) => p.id === provider.id);
      if (idx >= 0) this.items[idx] = provider;
      return provider.id;
    },

    /**
     * 删除
     * @param id id
     * @returns 返回 undefined 删除成功
     */
    async deleteProvider(id: number) {
      const res = await db.providers.delete(id);
      this.items = this.items.filter((p) => p.id !== id);
      return res;
    },
    async resetProviders() {
      await db.providers.clear();
      await db.providers.bulkAdd(defaultProviders);
      this.items = await db.providers.toArray();
    },
  },
});
