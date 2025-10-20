import { defineStore } from "pinia";
import { ConversationPorps } from "../types";
import { db } from "../db";

export interface conversationStore {
  items: ConversationPorps[];
  selectedId: number;
}

export const useConversationStore = defineStore("conversation", {
  // 初始值
  state: (): conversationStore => {
    return {
      items: [],
      selectedId: -1, // 初始值,未被选中
    };
  },
  actions: {
    /**
     * 从数据库异步获取所有会话数据，并更新状态中的 items
     */
    async fetchConversations() {
      this.items = await db.conversations
        .reverse() // 倒序
        .toArray();
    },

    /**
     * 创建新对话
     * @param createdData 新对话的数据,不携带id
     * @returns 新对话的id
     */
    async createConversation(createdData: Omit<ConversationPorps, "id">) {
      const newCId = await db.conversations.add(createdData);
      // const newCId = db.conversations.add({ ...createdData });
      this.items.unshift({ id: newCId, ...createdData });
      return newCId;
    },

    /**
     * 删除对话，同时删除该对话下的所有消息
     */
    async deleteConversation(conversationId: number) {
      // 删除会话
      await db.conversations.delete(conversationId);

      // 删除关联的消息（安全做法：先获取主键再批量删除）
      const messageIds = await db.messages
        .where({ conversationId })
        .primaryKeys();
      if (messageIds.length > 0) {
        await db.messages.bulkDelete(messageIds);
      }

      // 更新本地状态
      this.items = this.items.filter((item) => item.id !== conversationId);
      if (this.selectedId === conversationId) {
        this.selectedId = -1;
      }
    },
  },
  getters: {
    totalNumber: (state) => {
      state.items.length;
    },
    getConversationById: (state) => (id: number) => {
      return state.items.find((item) => item.id === id);
    },
  },
});
