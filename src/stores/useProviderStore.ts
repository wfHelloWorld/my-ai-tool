import { defineStore } from "pinia";
import { ProviderProps } from "../types";
import { db, initProviders } from "../db";

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
