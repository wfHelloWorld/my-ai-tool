import { defineStore } from "pinia";
import { Wan26I2VProgress } from "../providers/video/wan2.6-i2vProvider";

export interface TaskItem {
  id?: string;
  clientId: string;
  name: string;
  percentage: number;
  status: "running" | "success" | "failed" | "cancelled";
  progress?: string;
  logs: Wan26I2VProgress[];
  serverTaskId?: string;
  lastError: string | null;
  createdAt?: number;
}

interface LoadingStatusState {
  tasks: TaskItem[];
}

export const useWanxiang26VideoStatusStore = defineStore("wanxiang26VideoStatus", {
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
    append(info: Wan26I2VProgress & { clientId?: string; name?: string }) {
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
        case "uploading_audio": {
          if (info.percentage !== undefined) {
            task.percentage = 5 + info.percentage * 0.15;
          }
          if (info.message) {
            task.progress = info.message;
          } else if (info.percentage !== undefined) {
            task.progress = `音频上传中 ${info.percentage}%`;
          }
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
          const msg = (info as any).message || "Unknown error";
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
