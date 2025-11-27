<template>
  <div class="h-full" ref="outerContainer">
    <el-splitter style="height: 100%">
      <el-splitter-panel :min="300">
        <div class="h-full w-[90%] pl-[10%] flex items-center justify-center">
          <ProviderSelect v-model="currentProdiver" @update:model-value="onModelChange" />
        </div>
      </el-splitter-panel>
      <el-splitter-panel v-model:size="rightPaneSize" :min="260" @update:size="onRightSizeUpdate">
        <el-splitter layout="vertical" style="height: 100%">
          <el-splitter-panel size="70%">
            <div class="h-full flex flex-col">
              <div class="pt-5 shrink-0"></div>
              <div class="flex-1 overflow-y-auto px-[5%]">
                <!-- 参数控制模块（占位） -->
                <div class="p-4 border rounded bg-gray-50 text-gray-800 space-y-3">
                  <div class="font-semibold">参数控制模块</div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-sm mb-1">数量 n</label>
                      <el-input-number v-model="params.n" :min="1" :max="4" />
                    </div>
                    <div>
                      <label class="block text-sm mb-1">seed（可选）</label>
                      <el-input v-model="seedInput" placeholder="留空随机" />
                    </div>
                    <div>
                      <label class="block text-sm mb-1">水印</label>
                      <el-switch v-model="params.watermark" />
                    </div>
                    <div>
                      <label class="block text-sm mb-1">尺寸（可选）</label>
                      <el-input v-model="params.size" placeholder="例如 1280x1280" />
                    </div>
                  </div>

                  <div class="mt-4">
                    <div class="font-semibold mb-2">选择图片（最多3张）</div>
                    <el-button type="primary" size="small" @click="triggerFileSelect">选择图片</el-button>
                    <input ref="fileInputRef" type="file" accept="image/*" multiple class="hidden" @change="handleMultiImageSelect" />
                    <div class="mt-2 flex flex-wrap gap-2">
                      <div v-for="(p, i) in previewUrls" :key="i" class="relative">
                        <img :src="p" class="w-16 h-16 object-cover rounded border" />
                        <button class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs"
                          title="移除" @click="removeSelectedImage(i)">×</button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 预览区：已选图片 + 生成结果 -->
                <div class="mt-6 p-4 border rounded bg-white space-y-4">
                  <div>
                    <div class="font-semibold mb-2">生成结果预览</div>
                    <div v-if="genResultPaths.length === 0" class="text-gray-500 text-sm">暂无结果</div>
                    <div v-else class="flex flex-wrap gap-3">
                      <img v-for="(p, i) in genResultPaths" :key="`res-${i}`" :src="toSafeFileUrl(p)"
                        class="w-36 h-36 object-cover rounded border" />
                    </div>
                    <div class="mt-3">
                      <el-button size="small" @click="openImagesDir">打开图片目录</el-button>
                    </div>
                  </div>
                  <div>
                    <div class="font-semibold mb-2">进度</div>
                    <div v-if="isGenerating" class="flex items-center gap-2 text-gray-600 text-sm">
                      <el-icon class="is-loading"><i class="el-icon-loading"></i></el-icon>
                      <span>正在生成，请稍候…</span>
                    </div>
                    <div v-if="progressLogs.length === 0 && !isGenerating" class="text-gray-500 text-sm">暂无进度</div>
                    <ul v-else class="space-y-1 text-sm text-gray-700 max-h-40 overflow-auto border rounded p-2 bg-gray-50">
                      <li v-for="(log, idx) in progressLogs" :key="idx">
                        <span class="mr-2">[{{ log.stage }}]</span>
                        <span v-if="log.message">{{ log.message }}</span>
                        <span v-else-if="log.stage==='created'">任务已创建：{{ log.taskId }}</span>
                        <span v-else-if="log.stage==='poll'">轮询第 {{ log.try }} 次，状态 {{ log.status }}</span>
                        <span v-else-if="log.stage==='downloading'">下载第 {{ log.index + 1 }} 张</span>
                        <span v-else-if="log.stage==='saved'">已保存第 {{ log.index + 1 }} 张：{{ log.path }}</span>
                        <span v-else-if="log.stage==='prepared'">已准备 {{ log.imageCount }} 张</span>
                        <span v-else-if="log.stage==='timeout'">任务超时</span>
                        <span v-else-if="log.stage==='failed'">失败：{{ log.message }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </el-splitter-panel>
          <el-splitter-panel>
            <div class="h-full w-full flex items-center justify-center">
              <MessageInputChat @create="createConversation" :disabled="currentProdiver === ''" :simpleMode="true" />
            </div>
          </el-splitter-panel>
        </el-splitter>
      </el-splitter-panel>
    </el-splitter>
  </div>

</template>

<script lang="ts" setup>
import { ProviderProps } from "src/types";
import ProviderSelect from "../components/ProviderSelect.vue";
import { computed, onMounted, ref, reactive, toRaw } from "vue";
import MessageInputChat from "../components/MessageInputChat.vue";
import ConversationList from "../components/ConversationList.vue";
import { useRouter } from "vue-router";
import { useConversationStore } from "../stores/useConversationStore";
import { useProvidersStore } from "../stores/useProviderStore";
const providersStore = useProvidersStore();
const conversationsStore = useConversationStore();
// conversationsStore.selectedId = -1

const router = useRouter();
const input = ref("");
const currentProdiver = ref("");
const outerContainer = ref<HTMLElement | null>(null);
const getClampedPercent = (n: number) => Math.max(10, Math.min(90, Math.round(n)));
const getStoredPercentStr = () => {
  const raw = localStorage.getItem("homeRightPanePercent");
  const n = Number(raw);
  return Number.isFinite(n) ? `${getClampedPercent(n)}%` : "30%";
};
const rightPaneSize = ref<string>(getStoredPercentStr());

// 参数控制（占位用，可绑定到请求）
const params = reactive({
  n: 1,
  seed: undefined as number | undefined,
  watermark: false,
  size: "",
});
const seedInput = ref<string>("");
const selectedImagePaths = ref<string[]>([]);
const previewUrls = ref<string[]>([]);
const genResultPaths = ref<string[]>([]);
const progressLogs = ref<any[]>([]);
const isGenerating = ref<boolean>(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

function toSafeFileUrl(localPath: string) {
  if (!localPath) return "";
  return `safe-file://${encodeURIComponent(localPath)}`;
}

const openImagesDir = async () => {
  try {
    await window.electronAPI.openImagesDir();
  } catch (e) {
    console.error("[ImageGen] openImagesDir error:", e);
  }
};

const triggerFileSelect = () => {
  fileInputRef.value?.click();
};

// 压缩与大小限制（<= 7MB），参考 MessageInputChat 的实现
const MAX_SIZE = 7 * 1024 * 1024; // 7MB
const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob failed"));
      }, "image/png");
    } catch (err) {
      reject(err);
    }
  });
};
const compressImage = async (
  file: File,
  opts: { maxDimension?: number; targetMaxBytes?: number; minDimension?: number } = {}
): Promise<File> => {
  const maxDimension = opts.maxDimension ?? 2048;
  const targetMaxBytes = opts.targetMaxBytes ?? MAX_SIZE;
  const minDimension = opts.minDimension ?? 512;

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  let scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);

  let blob = await canvasToPngBlob(canvas);

  while (blob.size > targetMaxBytes && Math.max(width, height) > minDimension) {
    const shrink = 0.85;
    const newW = Math.max(minDimension, Math.round(width * shrink));
    const newH = Math.max(minDimension, Math.round(height * shrink));

    const canvas2 = document.createElement("canvas");
    canvas2.width = newW;
    canvas2.height = newH;
    const ctx2 = canvas2.getContext("2d");
    if (!ctx2) throw new Error("Canvas 2D context unavailable (second stage)");
    ctx2.drawImage(canvas, 0, 0, width, height, 0, 0, newW, newH);

    canvas = canvas2;
    width = newW;
    height = newH;
    blob = await canvasToPngBlob(canvas);
  }

  const newName = file.name.replace(/\.[^.]+$/, "") + "-compressed.png";
  return new File([blob], newName, { type: "image/png" });
};

const handleMultiImageSelect = async (e: Event) => {
  try {
    const inputEl = e.target as HTMLInputElement;
    const files = Array.from(inputEl.files || []);
    console.log("[ImageGen] selected files:", files.map(f => ({ name: f.name, size: f.size })));
    // 最多保留2张（符合万相2.5预览的要求）
    const limited = files.slice(0, 3);
    // 先清空再添加（也可做追加，根据需求）
    selectedImagePaths.value = [];
    previewUrls.value.forEach(url => URL.revokeObjectURL(url));
    previewUrls.value = [];
    for (const f of limited) {
      let file = f;
      if (file.size > MAX_SIZE) {
        try {
          file = await compressImage(file, { targetMaxBytes: MAX_SIZE });
          console.log("[ImageGen] auto-compressed:", { name: file.name, size: file.size });
        } catch (err) {
          console.warn("[ImageGen] compress failed, using original:", err);
        }
      }
      // 优先走 Vision.vue 的思路：复制原生文件到缓存目录
      const nativePath = window.electronAPI.getFilePath(file);
      if (nativePath) {
        const copiedPath = await window.electronAPI.copyImageToUserDir(nativePath);
        selectedImagePaths.value.push(copiedPath);
      } else {
        // 无原生路径（例如压缩后新建的 File）：转 base64 保存到缓存目录
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const result = reader.result as string;
              const commaIndex = result.indexOf(",");
              resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
        const savedPath = await window.electronAPI.saveImageBlob(base64, file.name || `image-${Date.now()}.png`);
        selectedImagePaths.value.push(savedPath);
      }
      previewUrls.value.push(URL.createObjectURL(file));
    }
    console.log("[ImageGen] selectedImagePaths:", selectedImagePaths.value);
  } catch (err) {
    console.error("[ImageGen] handleMultiImageSelect error:", err);
  }
};

const removeSelectedImage = (index: number) => {
  try {
    const url = previewUrls.value[index];
    if (url) URL.revokeObjectURL(url);
    previewUrls.value.splice(index, 1);
    selectedImagePaths.value.splice(index, 1);
    console.log("[ImageGen] after remove, selectedImagePaths:", selectedImagePaths.value);
  } catch (err) {
    console.error("[ImageGen] removeSelectedImage error:", err);
  }
};

const onModelChange = () => {
  console.log("选择变化:", currentProdiver.value);
};

onMounted(async () => {
  // providerItems.value = await db.providers.toArray();
  await providersStore.initProvidersStore();
  try {
    const cfg = await window.electronAPI.getConfig();
    let p = cfg?.homeRightPanePercent ?? 30;
    p = getClampedPercent(p);
    const target = `${p}%`;
    if (rightPaneSize.value !== target) {
      rightPaneSize.value = target;
    }
  } catch (e) {
    rightPaneSize.value = "30%";
  }
});

// 拆分从providerSelect组件中获取的provider信息
const modelInfo = computed(() => {
  const [providerId, selectedModel] = currentProdiver.value.split("/");
  return {
    providerId: parseInt(providerId),
    selectedModel,
  };
});

/**
 * 生图请求（调用万相2.5预览 Provider）
 */
const createConversation = async (question: string) => {
  try {
    console.log("[ImageGen] prompt:", question);
    // 进度初始化与订阅
    progressLogs.value = [];
    isGenerating.value = true;
    window.electronAPI.onWan25PreviewProgress((info: any) => {
      try {
        progressLogs.value.push(info);
      } catch (_) {}
    });
    // 使用多图路径，不再使用 firstImagePath
    console.log("[ImageGen] imagePaths:", selectedImagePaths.value);

    // 获取 provider URL
    const { providerId } = modelInfo.value;
    const provider = providersStore.items.find((p) => p.id === providerId);
    const providerUrl = provider?.url || "";
    console.log("[ImageGen] provider:", provider);
    console.log("[ImageGen] baseUrl:", providerUrl);

    const getOrigin = (urlStr: string): string => {
      try {
        const u = new URL(urlStr);
        return u.origin;
      } catch {
        return urlStr || "https://dashscope.aliyuncs.com";
      }
    };
    const normalizeWanUrls = (u: string) => {
      const defaultOrigin = "https://dashscope.aliyuncs.com";
      const servicePath = "/api/v1/services/aigc/image2image/image-synthesis";
      const tasksPath = "/api/v1/tasks";
      if (!u) {
        return {
          createUrl: `${defaultOrigin}${servicePath}`,
          taskBaseUrl: `${defaultOrigin}${tasksPath}`,
        };
      }
      if (u.includes(servicePath)) {
        const origin = getOrigin(u);
        return {
          createUrl: u,
          taskBaseUrl: `${origin}${tasksPath}`,
        };
      }
      const base = u.replace(/\/compatible-mode\/v1\/?$/, "");
      const origin = getOrigin(base);
      return {
        createUrl: `${origin}${servicePath}`,
        taskBaseUrl: `${origin}${tasksPath}`,
      };
    };
    const { createUrl, taskBaseUrl } = normalizeWanUrls(providerUrl);
    console.log("[ImageGen] createUrl:", createUrl);
    console.log("[ImageGen] taskBaseUrl:", taskBaseUrl);

    const cfg = await window.electronAPI.getConfig();
    const apiKey = cfg?.DASHSCOPE_API_KEY;
    const maskedKey = apiKey ? `${String(apiKey).slice(0, 4)}***${String(apiKey).slice(-4)}` : "<missing>";
    console.log("[ImageGen] apiKey:", maskedKey);

    const rawPaths = toRaw(selectedImagePaths.value) as unknown as string[];
    const imagePaths = Array.isArray(rawPaths) ? [...rawPaths] : [];

    const payload: any = {
      prompt: String(question ?? ""),
      imagePaths,
      n: Number(params.n ?? 1),
      watermark: Boolean(params.watermark),
      apiKey: String(apiKey ?? ""),
      createUrl: String(createUrl),
      taskBaseUrl: String(taskBaseUrl),
    };
    if (seedInput.value) payload.seed = Number(seedInput.value);
    if (params.size) payload.size = String(params.size);
    console.log("[ImageGen] payload:", { ...payload, apiKey: maskedKey });

    const resultPaths = await window.electronAPI.startWan25Preview(payload);
    console.log("[ImageGen] result paths:", resultPaths);
    genResultPaths.value = resultPaths || [];
    isGenerating.value = false;
    if ((resultPaths || []).length > 0) {
      progressLogs.value.push({ stage: "completed", count: resultPaths.length });
    }
  } catch (err) {
    console.error("[ImageGen] error:", err);
    isGenerating.value = false;
    progressLogs.value.push({ stage: "error", message: err instanceof Error ? err.message : String(err) });
  }
};

const onRightSizeUpdate = async (val: string | number) => {
  try {
    let percent: number;
    if (typeof val === "string" && val.endsWith("%")) {
      percent = Math.max(0, Math.min(100, parseFloat(val)));
    } else {
      const w = outerContainer.value?.clientWidth ?? 0;
      percent = w > 0 ? Math.round((Number(val) / w) * 100) : 30;
    }
    percent = getClampedPercent(percent);
    const target = `${percent}%`;
    if (rightPaneSize.value !== target) {
      rightPaneSize.value = target;
    }
    localStorage.setItem("homeRightPanePercent", String(percent));
    await window.electronAPI.updateConfig({ homeRightPanePercent: percent });
  } catch (e) { }
};
</script>

<style></style>
