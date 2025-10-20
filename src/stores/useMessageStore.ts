import { defineStore } from "pinia";
import { MessageProps } from "../types";
import { db } from "../db";

export interface messageStore {
  items: MessageProps[];
}

export const useMessageStore = defineStore("message", {
  state: (): messageStore => {
    return {
      items: [],
    };
  },
  actions: {
    async fetchMessagesByConversation(conversationId: number) {
      const messages = await db.messages.where({ conversationId }).toArray();
      this.items = messages;
    },
    async createMessage(createdData: Omit<MessageProps, "id">) {
      const newMessageId = await db.messages.add(createdData);
      this.items.push({ id: newMessageId, ...createdData });
      return newMessageId;
    },
    async updateMessage(messageId: number, updateData: Partial<MessageProps>) {
      await db.messages.update(messageId, updateData);
      // 更新 filteredMessages
      const index = this.items.findIndex((item) => item.id === messageId);
      if (index !== -1) {
        this.items[index] = {
          ...this.items[index],
          ...updateData,
        };
      }
    },
  },
  getters: {
    getLastQuestion: (state) => (conversationsId: number) => {
      return state.items.findLast(
        (item) =>
          item.conversationId === conversationsId && item.type === "question"
      );
    },
    isMessageLoading: (state) => {
      return state.items.some(
        (item) => item.status === "loading" || item.status === "streaming"
      );
    },
  },
});
