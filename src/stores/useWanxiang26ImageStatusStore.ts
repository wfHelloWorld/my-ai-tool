import { defineStore } from "pinia";
import { Wan26ImageProgress } from "../providers/imgGen/Wanxiang2.6ImageProvider";

interface TaskItem {
  clientId: string;
  name: string;
  percentage: number;
  status: "running" | "success" | "failed" | "cancelled";
  logs: Wan26ImageProgress[];
  serverTaskId?: string;
  imagesSaved: number;
  totalImages?: number;
  lastError: string | null;
}

interface LoadingStatusState {
  tasks: TaskItem[];
}

export const useWanxiang26ImageStatusStore = defineStore("wanxiang26ImageStatus", {
  state: (): LoadingStatusState => ({
    tasks: [],
  }),

  actions: {
    beginTask(clientId: string, name: string) {
      // 检查是否存在
      if (this.tasks.find((t) => t.clientId === clientId)) return;
      
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
      // 新任务插到最前
      this.tasks.unshift(item);
    },

    append(info: Wan26ImageProgress & { clientId?: string; name?: string }) {
      // 优先匹配 clientId
      let task: TaskItem | undefined;
      if (info.clientId) {
        task = this.tasks.find((t) => t.clientId === info.clientId);
      }
      // 其次匹配 taskId (如果服务端返回了 taskId)
      if (!task && 'taskId' in info && info.taskId) {
        task = this.tasks.find((t) => t.serverTaskId === info.taskId);
      }
      // 再次，找第一个 running 的任务 (fallback)
      if (!task) {
        task = this.tasks.find((t) => t.status === "running");
      }

      if (!task) return;

      // 记录日志
      task.logs.push(info);

      // 如果有 taskId，更新到 task
      if ('taskId' in info && info.taskId) {
        task.serverTaskId = info.taskId;
      }

      // 根据 stage 更新进度
      switch (info.stage) {
        case "prepared":
          task.totalImages = info.imageCount;
          task.percentage = Math.max(task.percentage, 10);
          break;
        case "created":
          task.percentage = Math.max(task.percentage, 20);
          break;
        case "poll":
          // poll 阶段缓慢增加，上限 80%
          task.percentage = Math.min(80, Math.max(task.percentage, task.percentage + 2));
          break;
        case "downloading":
          // 下载阶段 80% -> 90%
          task.percentage = Math.max(task.percentage, 85);
          break;
        case "saved":
          if (task.totalImages && task.totalImages > 0) {
            task.imagesSaved++;
            // 计算剩余 15% 的进度
            const downloadProgress = (task.imagesSaved / task.totalImages) * 15;
            task.percentage = Math.min(99, 85 + downloadProgress);
          }
          break;
        case "error":
          task.status = "failed";
          task.lastError = info.message || "Unknown error";
          break;
      }
    },

    finish(clientId: string, success: boolean, msg?: string) {
      const task = this.tasks.find((t) => t.clientId === clientId);
      if (task) {
        task.status = success ? "success" : "failed";
        task.percentage = success ? 100 : task.percentage;
        if (!success && msg) {
          task.lastError = msg;
        }
      }
    },

    clear() {
      this.tasks = [];
    }
  },
});
