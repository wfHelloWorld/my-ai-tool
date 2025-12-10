import { defineStore } from "pinia";
import type { Wan25PreviewProgress } from "../providers/imgGen/Wanxiang25PreviewProvider";

export interface TaskItem {
  clientId: string;
  serverTaskId?: string;
  name: string;
  percentage: number;
  status: "running" | "completed" | "failed" | "timeout";
  logs: Wan25PreviewProgress[];
  imagesSaved: number;
  totalImages?: number;
  lastError?: string | null;
}

export interface LoadingStatusState {
  tasks: TaskItem[];
}

export const useWanxiang25PreviewStatusStore = defineStore("wanxiang25PreviewStatus", {
  state: (): LoadingStatusState => ({
    tasks: [],
  }),

  actions: {
    beginTask(clientId: string, name: string) {
      const item: TaskItem = {
        clientId,
        name,
        percentage: 0,
        status: "running",
        logs: [],
        imagesSaved: 0,
        totalImages: undefined,
        lastError: null,
      };
      this.tasks.unshift(item);
    },

    append(info: Wan25PreviewProgress & { clientId?: string; name?: string }) {
      const byClient = info.clientId ? this.tasks.find((t) => t.clientId === info.clientId) : undefined;
      const byServer = 'taskId' in info && info.taskId ? this.tasks.find((t) => t.serverTaskId === info.taskId) : undefined;
      const task = byClient || byServer || this.tasks.find((t) => t.status === "running");
      if (!task) return;
      task.logs.push(info);

      if ('taskId' in info && info.taskId && !task.serverTaskId) {
        task.serverTaskId = info.taskId;
      }
      if (typeof info.name === "string" && info.name) {
        task.name = info.name;
      }

      switch (info.stage) {
        case "prepared": {
          task.totalImages = info.imageCount;
          task.percentage = Math.max(task.percentage, 10);
          break;
        }
        case "created": {
          task.percentage = Math.max(task.percentage, 20);
          break;
        }
        case "poll": {
          task.percentage = Math.min(60, Math.max(task.percentage, task.percentage + 1));
          break;
        }
        case "downloading": {
          task.percentage = Math.max(task.percentage, 70);
          break;
        }
        case "saved": {
          task.imagesSaved += 1;
          if (task.totalImages && task.totalImages > 0) {
            const base = 70;
            const extra = Math.round((task.imagesSaved / task.totalImages) * 30);
            task.percentage = Math.max(task.percentage, Math.min(100, base + extra));
          } else {
            task.percentage = Math.min(100, task.percentage + 5);
          }
          break;
        }
        case "failed": {
          task.status = "failed";
          task.lastError = info.message || "";
          task.percentage = Math.max(task.percentage, 100);
          break;
        }
        case "timeout": {
          task.status = "timeout";
          task.lastError = "任务超时";
          task.percentage = Math.max(task.percentage, 100);
          break;
        }
        case "error": {
          task.status = "failed";
          task.lastError = info.message || "";
          break;
        }
        default: {
          break;
        }
      }
    },

    finish(clientId?: string) {
      if (!clientId) return;
      const task = this.tasks.find((t) => t.clientId === clientId);
      if (!task) return;
      task.status = "completed";
      task.percentage = 100;
    },

    clear() {
      this.tasks = [];
    },
  },
});

