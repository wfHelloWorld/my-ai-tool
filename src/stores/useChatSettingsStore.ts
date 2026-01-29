import { defineStore } from "pinia";
import { reactive, watch } from "vue";
import { ChatExtraParams, ChatSearchOptions } from "../types";

// Define a stricter type for the store state where search_options is required
interface ChatSettingsState extends ChatExtraParams {
  search_options: ChatSearchOptions;
}

export const useChatSettingsStore = defineStore("chatSettings", () => {
  const STORAGE_KEY = "chatExtraParams";

  const defaultParams: ChatSettingsState = {
    enable_search: false,
    enable_thinking: true,
    thinking_budget: 2048,
    search_options: {
      forced_search: false,
      search_strategy: "turbo",
      enable_search_extension: false,
    },
    presence_penalty: 1.5,
    enable_presence_penalty: false,
    enable_code_interpreter: false,
  };

  const loadFromStorage = (): ChatSettingsState => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with default params to ensure all fields exist
        return {
          ...defaultParams,
          ...parsed,
          search_options: {
            ...defaultParams.search_options,
            ...(parsed.search_options || {}),
          },
        };
      }
    } catch (e) {
      console.error("Failed to load chat settings from localStorage", e);
    }
    return JSON.parse(JSON.stringify(defaultParams));
  };

  const extraParams = reactive<ChatSettingsState>(loadFromStorage());

  watch(
    extraParams,
    (newVal) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
    },
    { deep: true }
  );

  const thinkingBudgetMarks = {
    512: "快速",
    2048: "标准",
    4096: "深度",
  };

  return {
    extraParams,
    thinkingBudgetMarks,
  };
});
