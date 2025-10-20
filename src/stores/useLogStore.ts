// src/stores/useLogStore.ts
import { defineStore } from "pinia";

export interface LogItem {
  id: number; // 唯一id，方便渲染时用作key
  level: "info" | "warn" | "error" | string;
  message: string;
  timestamp: string; // ISO字符串或格式化时间
}

export const useLogStore = defineStore("log", {
  state: () => ({
    logs: [] as LogItem[],
    nextId: 1, // 用于生成唯一id
  }),

  actions: {
    addLog(level: LogItem["level"], message: string) {
      this.logs.push({
        id: this.nextId++,
        level,
        message,
        timestamp: new Date().toLocaleTimeString(),
      });
    },

    clearLogs() {
      this.logs = [];
      this.nextId = 1;
    },
  },

  getters: {
    // 按级别过滤日志示例
    infoLogs: (state) => state.logs.filter((log) => log.level === "info"),
    warnLogs: (state) => state.logs.filter((log) => log.level === "warn"),
    errorLogs: (state) => state.logs.filter((log) => log.level === "error"),
  },
});
