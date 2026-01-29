import { defineStore } from "pinia";
import { Wan22Kf2vFlashProgress } from "../providers/video/wan2.2-kf2v-flashProvider";

export interface TaskItem {
  id?: string;
  clientId: string;
  name: string;
  percentage: number;
  status: "running" | "success" | "failed" | "cancelled";
  progress?: string;
  logs: Wan22Kf2vFlashProgress[];
  serverTaskId?: string;
  lastError: string | null;
  createdAt?: number;
}

interface LoadingStatusState {
  tasks: TaskItem[];
}

export const useWanxiang22Kf2vStatusStore = defineStore("wanxiang22Kf2vStatus", {
  state: (): LoadingStatusState => ({
    tasks: [],
  }),

  actions: {
    // 开始任务
    beginTask(clientId: string, name: string) {
      this.tasks.unshift({
        id: clientId,
        clientId,
        name,
        status: "running",
        progress: "排队中...",
        percentage: 0,
        logs: [],
        createdAt: Date.now(),
        lastError: null,
      });
    },

    // 追加进度/日志
    append(info: Wan22Kf2vFlashProgress & { clientId?: string; name?: string }) {
      let task: TaskItem | undefined;

      if (info.clientId) {
        task = this.tasks.find((t) => t.clientId === info.clientId);
      }
      if (!task && "taskId" in info && info.taskId) {
        task = this.tasks.find((t) => t.serverTaskId === info.taskId);
      }
      if (!task) {
        task = this.tasks.find((t) => t.status === "running");
      }
      if (!task) return;

      task.logs.push(info);

      if ("taskId" in info && info.taskId) {
        task.serverTaskId = info.taskId;
      }

      switch (info.stage) {
        case "prepared": {
          task.percentage = Math.max(task.percentage, 5);
          task.progress = info.message;
          break;
        }
        case "created": {
          task.percentage = Math.max(task.percentage, 25);
          task.progress = "任务已创建，等待执行...";
          break;
        }
        case "poll": {
          task.percentage = Math.min(85, Math.max(task.percentage, task.percentage + 1));
          task.progress = `生成中... ${info.status}`;
          break;
        }
        case "downloading": {
          task.percentage = Math.max(task.percentage, 90);
          task.progress = "下载结果中...";
          break;
        }
        case "saved": {
          task.percentage = 99;
          task.progress = "已保存到本地";
          break;
        }
        case "failed":
        case "error":
        case "timeout": {
          task.status = "failed";
          const msg = 'message' in info ? info.message : "Unknown error";
          task.lastError = msg;
          task.progress = "失败";
          break;
        }
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
