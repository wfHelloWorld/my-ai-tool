import { defineStore } from "pinia";
import { Wan26I2VProgress } from "../providers/video/wan2.6-i2vProvider";

interface TaskItem {
  clientId: string;
  name: string;
  percentage: number;
  status: "running" | "success" | "failed" | "cancelled";
  logs: Wan26I2VProgress[];
  serverTaskId?: string;
  lastError: string | null;
}

interface LoadingStatusState {
  tasks: TaskItem[];
}

export const useWanxiang26VideoStatusStore = defineStore("wanxiang26VideoStatus", {
  state: (): LoadingStatusState => ({
    tasks: [],
  }),

  actions: {
    beginTask(clientId: string, name: string) {
      if (this.tasks.find((t) => t.clientId === clientId)) return;
      
      const item: TaskItem = {
        clientId,
        name,
        percentage: 0,
        status: "running",
        logs: [],
        lastError: null,
      };
      this.tasks.unshift(item);
    },

    append(info: Wan26I2VProgress & { clientId?: string; name?: string }) {
      let task: TaskItem | undefined;
      if (info.clientId) {
        task = this.tasks.find((t) => t.clientId === info.clientId);
      }
      if (!task && 'taskId' in info && info.taskId) {
        task = this.tasks.find((t) => t.serverTaskId === info.taskId);
      }
      if (!task) {
        task = this.tasks.find((t) => t.status === "running");
      }

      if (!task) return;

      task.logs.push(info);

      if ('taskId' in info && info.taskId) {
        task.serverTaskId = info.taskId;
      }

      switch (info.stage) {
        case "prepared":
          task.percentage = Math.max(task.percentage, 5);
          break;
        case "uploading_audio":
          if (info.percentage !== undefined) {
             // 5% - 20%
             task.percentage = 5 + (info.percentage * 0.15);
          }
          break;
        case "created":
          task.percentage = Math.max(task.percentage, 25);
          break;
        case "poll":
          // poll 25% -> 85%
          task.percentage = Math.min(85, Math.max(task.percentage, task.percentage + 1));
          break;
        case "downloading":
          task.percentage = Math.max(task.percentage, 90);
          break;
        case "saved":
          task.percentage = 99;
          break;
        case "error":
        case "failed":
        case "timeout":
          task.status = "failed";
          task.lastError = ('message' in info ? info.message : "") || "Error";
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
