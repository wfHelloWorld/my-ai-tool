<template>
  <div class="h-full" ref="outerContainer">
    <el-splitter style="height: 100%">
      <!-- 左侧面板：MarkdownViewer -->
      <el-splitter-panel :min="300">
        <div class="h-full w-full">
          <el-scrollbar style="height: 100%">
            <div class="p-4">
              <MarkdownViewer :source="wanx21ImageEditMd" />
            </div>
          </el-scrollbar>
        </div>
      </el-splitter-panel>

      <el-splitter-panel v-model:size="rightPaneSize" :min="260" @update:size="onRightSizeUpdate">
        <el-splitter layout="vertical" style="height: 100%">
          <!-- 上方：图片选择与结果预览 -->
          <el-splitter-panel size="70%">
            <div class="h-full flex flex-col mb-[20px]">
              <div class="pt-5 shrink-0"></div>
              <div class="flex-1 overflow-y-auto px-[5%]">
                
                <!-- 参数与图片选择区 -->
                <div class="p-4 border rounded bg-gray-50 text-gray-800 space-y-3">
                  <div class="font-semibold">参数控制模块</div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-sm mb-1">功能模式</label>
                      <el-select v-model="functionMode" placeholder="选择功能" class="w-full">
                        <el-option label="指令编辑 (Instruction)" value="description_edit" />
                        <el-option label="全局风格化 (Style All)" value="stylization_all" />
                        <el-option label="局部风格化 (Style Local)" value="stylization_local" />
                        <el-option label="局部重绘 (Inpainting)" value="description_edit_with_mask" />
                        <el-option label="扩图 (Expand)" value="expand" />
                        <el-option label="图像超分 (Super Res)" value="super_resolution" />
                        <el-option label="去水印 (Remove Watermark)" value="remove_watermark" />
                        <el-option label="图像上色 (Colorization)" value="colorization" />
                        <el-option label="线稿生图 (Doodle)" value="doodle" />
                        <el-option label="参考卡通生图 (Cartoon)" value="control_cartoon_feature" />
                      </el-select>
                    </div>

                    <div>
                      <label class="block text-sm mb-1">生成数量 n</label>
                      <el-input-number v-model="params.n" :min="1" :max="4" class="w-full" />
                    </div>

                    <div>
                      <label class="block text-sm mb-1">seed（可选）</label>
                      <el-input v-model="seedInput" placeholder="留空随机" />
                    </div>

                    <div v-if="['stylization_all', 'description_edit'].includes(functionMode)">
                      <label class="block text-sm mb-1">修改幅度 (Strength)</label>
                      <el-slider v-model="params.strength" :min="0" :max="1" :step="0.01" show-input />
                    </div>

                    <div v-if="functionMode === 'super_resolution'">
                      <label class="block text-sm mb-1">放大倍数 (Upscale)</label>
                      <el-input-number v-model="params.upscale_factor" :min="1" :max="4" class="w-full" />
                    </div>

                    <div v-if="functionMode === 'expand'" class="col-span-2 grid grid-cols-2 gap-3 border p-2 rounded">
                      <div class="font-semibold col-span-2 text-xs text-gray-500">扩图比例 (1.0~2.0)</div>
                      <div>
                        <label class="block text-xs mb-1">上 (Top)</label>
                        <el-input-number v-model="params.top_scale" :min="1" :max="2" :step="0.1" size="small" />
                      </div>
                      <div>
                        <label class="block text-xs mb-1">下 (Bottom)</label>
                        <el-input-number v-model="params.bottom_scale" :min="1" :max="2" :step="0.1" size="small" />
                      </div>
                      <div>
                        <label class="block text-xs mb-1">左 (Left)</label>
                        <el-input-number v-model="params.left_scale" :min="1" :max="2" :step="0.1" size="small" />
                      </div>
                      <div>
                        <label class="block text-xs mb-1">右 (Right)</label>
                        <el-input-number v-model="params.right_scale" :min="1" :max="2" :step="0.1" size="small" />
                      </div>
                    </div>

                    <div class="col-span-2">
                       <el-checkbox v-model="params.watermark" label="添加水印" />
                    </div>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    {{ functionDesc }}
                  </div>

                  <div class="mt-4">
                    <div class="font-semibold mb-2">参考图片 (必需)</div>
                    <el-button type="primary" size="small" @click="triggerFileSelect">选择图片</el-button>
                    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleImageSelect" />
                    
                    <div v-if="previewUrl" class="relative inline-block mt-2">
                      <img :src="previewUrl" class="h-40 object-contain rounded border bg-gray-100" />
                      <button class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                        title="移除" @click="removeSelectedImage">×</button>
                    </div>
                    <div v-else class="h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 bg-gray-50 mt-2">
                      请选择一张图片作为基底
                    </div>
                  </div>

                  <div class="mt-4" v-if="functionMode === 'description_edit_with_mask'">
                    <div class="font-semibold mb-2">Mask 图片 (必需)</div>
                    <div class="text-xs text-gray-500 mb-2">白色区域为编辑区，黑色为保留区</div>
                    <el-button type="warning" size="small" @click="triggerMaskSelect">选择 Mask</el-button>
                    <input ref="maskInputRef" type="file" accept="image/*" class="hidden" @change="handleMaskSelect" />
                    
                    <div v-if="maskPreviewUrl" class="relative inline-block mt-2">
                      <img :src="maskPreviewUrl" class="h-40 object-contain rounded border bg-gray-100" />
                      <button class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                        title="移除" @click="removeMaskImage">×</button>
                    </div>
                    <div v-else class="h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 bg-gray-50 mt-2">
                      请选择 Mask 图片
                    </div>
                  </div>
                </div>

                <!-- 结果预览区 -->
                <div class="mt-6 p-4 border rounded bg-white space-y-4 shadow-sm">
                  <div>
                    <div class="font-semibold mb-2">生成结果预览</div>
                    <div v-if="genResultPaths.length === 0" class="text-gray-500 text-sm">暂无结果</div>
                    <div v-else class="flex flex-wrap gap-3">
                      <div v-for="(p, i) in genResultPaths" :key="`res-${i}`" class="group relative">
                        <img :src="toSafeFileUrl(p)" class="w-36 h-36 object-cover rounded border cursor-pointer" @click="openImage(p)" />
                      </div>
                    </div>
                    <div class="mt-3">
                      <el-button size="small" @click="openImagesDir">打开保存目录</el-button>
                    </div>
                  </div>
                  
                  <!-- 进度与日志 -->
                  <div>
                    <div class="font-semibold mb-2">进度</div>
                    <div v-if="isGenerating" class="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <el-icon class="is-loading"><i class="el-icon-loading"></i></el-icon>
                      <span>正在生成，请稍候…</span>
                    </div>
                    <div v-if="wanEditStore.tasks.length === 0" class="text-gray-500 text-sm">暂无进度</div>
                    <div v-else class="space-y-3 max-h-60 overflow-auto border rounded p-2 bg-gray-50">
                      <div v-for="t in wanEditStore.tasks" :key="t.clientId" class="space-y-1">
                        <div class="flex items-center justify-between text-sm text-gray-700">
                          <span class="font-medium truncate max-w-[60%]">任务：{{ t.name }}</span>
                          <span class="text-xs text-gray-500">{{ t.status === 'running' ? '进行中' : (t.status === 'completed' ? '完成' : '失败') }}</span>
                        </div>
                        <el-progress :percentage="t.percentage" :status="t.status === 'completed' ? 'success' : (t.status === 'failed' ? 'exception' : '')" />
                        <div v-if="t.lastError" class="text-xs text-red-500">{{ t.lastError }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-splitter-panel>
          
          <!-- 下方：输入框 -->
          <el-splitter-panel>
            <div class="h-full w-full flex items-center justify-center">
              <MessageInputChat 
                @create="createTask" 
                :disabled="false" 
                :placeholder="selectedImagePath ? '输入编辑指令...' : '请先选择图片'"
                :simpleMode="true" 
              />
            </div>
          </el-splitter-panel>
        </el-splitter>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, reactive, toRaw } from "vue";
import MessageInputChat from "../../components/MessageInputChat.vue";
import MarkdownViewer from "../../components/MarkdownViewer.vue";
import wanx21ImageEditMd from "../../common/md/imageGen/wanx2.1-imageedit.md?raw";
import { useWanxiang21ImageEditStatusStore } from "../../stores/useWanxiang21ImageEditStatusStore";

const wanEditStore = useWanxiang21ImageEditStatusStore();

const outerContainer = ref<HTMLElement | null>(null);
const rightPaneSize = ref("70%");
const getClampedPercent = (n: number) => Math.max(10, Math.min(90, Math.round(n)));
const getStoredPercentStr = () => {
  const raw = localStorage.getItem("homeRightPanePercent");
  const n = Number(raw);
  return Number.isFinite(n) ? `${getClampedPercent(n)}%` : "30%";
};
// 初始化右侧大小，与ImageGen保持一致的读取逻辑
rightPaneSize.value = getStoredPercentStr();

// 参数
const functionMode = ref("description_edit");
const params = reactive({
  n: 1,
  strength: 0.5,
  upscale_factor: 1,
  top_scale: 1.0,
  bottom_scale: 1.0,
  left_scale: 1.0,
  right_scale: 1.0,
  watermark: false,
});
const seedInput = ref<string>("");

const functionDesc = computed(() => {
  switch (functionMode.value) {
    case "description_edit": return "通过自然语言指令编辑图像";
    case "stylization_all": return "全局风格化：将参考图风格迁移到目标图";
    case "stylization_local": return "局部风格化：对局部区域进行风格迁移";
    case "description_edit_with_mask": return "局部重绘：针对Mask区域进行编辑";
    case "expand": return "扩图：向四周扩展图像内容";
    case "super_resolution": return "图像超分：提升分辨率和细节";
    case "remove_watermark": return "去水印：自动去除文字水印";
    case "colorization": return "图像上色：黑白图片转彩色";
    case "doodle": return "线稿生图：基于线稿生成图像";
    case "control_cartoon_feature": return "参考卡通形象生图";
    default: return "";
  }
});

// 图片选择
const selectedImagePath = ref<string>("");
const previewUrl = ref<string>("");
const fileInputRef = ref<HTMLInputElement | null>(null);

// Mask 图片选择
const maskImagePath = ref<string>("");
const maskPreviewUrl = ref<string>("");
const maskInputRef = ref<HTMLInputElement | null>(null);

// 结果
const genResultPaths = ref<string[]>([]);
const isGenerating = ref<boolean>(false);

import { compressImage, DEFAULT_MAX_IMAGE_SIZE } from "../../utils/imageCompression";

// 压缩与大小限制（<= 5MB，阿里云API限制通常为5-10MB，这里保守取5MB，或者使用默认7MB）
const MAX_SIZE = 7 * 1024 * 1024; // 5MB


function toSafeFileUrl(localPath: string) {
  if (!localPath) return "";
  // 使用三斜杠 /// 确保路径被解析为 pathname 而不是 host，从而保留大小写（这对 macOS/Linux 至关重要）
  return `safe-file:///${encodeURIComponent(localPath)}`;
}

const openImagesDir = async () => {
  try {
    await (window as any).electronAPI.openDownloadsDir();
  } catch (e) {
    console.error("[ImageEdit] openDownloadsDir error:", e);
  }
};

const openImage = (path: string) => {
  // TODO: 实现预览大图逻辑，这里暂时不做
};

const triggerFileSelect = () => {
  fileInputRef.value?.click();
};

const handleImageSelect = async (e: Event) => {
  try {
    const inputEl = e.target as HTMLInputElement;
    const files = inputEl.files;
    if (!files || files.length === 0) return;

    let file = files[0];
    if (file.size > MAX_SIZE) {
      try {
        file = await compressImage(file, { targetMaxBytes: MAX_SIZE });
        console.log("[ImageEdit] auto-compressed image:", { name: file.name, size: file.size });
      } catch (err) {
        console.warn("[ImageEdit] compress failed, using original:", err);
      }
    }

    // 保存到缓存目录
    const savedPath = await (window as any).electronAPI.ensureImageStored(file);
    selectedImagePath.value = savedPath;
    previewUrl.value = URL.createObjectURL(file);
    
    // reset input
    inputEl.value = "";
  } catch (err) {
    console.error("[ImageEdit] handleImageSelect error:", err);
  }
};

const removeSelectedImage = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
  selectedImagePath.value = "";
};

const triggerMaskSelect = () => {
  maskInputRef.value?.click();
};

const handleMaskSelect = async (e: Event) => {
  try {
    const inputEl = e.target as HTMLInputElement;
    const files = inputEl.files;
    if (!files || files.length === 0) return;

    let file = files[0];
    if (file.size > MAX_SIZE) {
      try {
        file = await compressImage(file, { targetMaxBytes: MAX_SIZE });
        console.log("[ImageEdit] auto-compressed mask:", { name: file.name, size: file.size });
      } catch (err) {
        console.warn("[ImageEdit] compress mask failed, using original:", err);
      }
    }

    // 保存到缓存目录
    const savedPath = await (window as any).electronAPI.ensureImageStored(file);
    maskImagePath.value = savedPath;
    maskPreviewUrl.value = URL.createObjectURL(file);
    
    // reset input
    inputEl.value = "";
  } catch (err) {
    console.error("[ImageEdit] handleMaskSelect error:", err);
  }
};

const removeMaskImage = () => {
  if (maskPreviewUrl.value) URL.revokeObjectURL(maskPreviewUrl.value);
  maskPreviewUrl.value = "";
  maskImagePath.value = "";
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
    await (window as any).electronAPI.updateConfig({ homeRightPanePercent: percent });
  } catch (e) { }
};

// 任务订阅
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  try {
    const cfg = await (window as any).electronAPI.getConfig();
    let p = cfg?.homeRightPanePercent ?? 30;
    p = getClampedPercent(p);
    const target = `${p}%`;
    if (rightPaneSize.value !== target) {
      rightPaneSize.value = target;
    }
  } catch (e) {
    rightPaneSize.value = "30%";
  }

  try {
    unsubscribe = (window as any).electronAPI.onWan21ImageEditProgress((info: any) => {
      try {
        wanEditStore.append(info);
      } catch (_) {}
    });
  } catch (_) {}
});

onUnmounted(() => {
  try {
    unsubscribe?.();
  } catch (_) {}
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  if (maskPreviewUrl.value) URL.revokeObjectURL(maskPreviewUrl.value);
});

/**
 * 发起任务
 */
const createTask = async (prompt: string) => {
  if (!selectedImagePath.value) {
    alert("请先选择一张参考图片");
    return;
  }
  if (functionMode.value === 'description_edit_with_mask' && !maskImagePath.value) {
    alert("请选择一张 Mask 图片");
    return;
  }

  let clientId: string | null = null;
  let taskName: string = "";

  try {
    console.log("[ImageEdit] prompt:", prompt);
    clientId = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    taskName = prompt.slice(0, 30) || '图像编辑任务';
    
    isGenerating.value = true;
    wanEditStore.beginTask(clientId, taskName);

    const cfg = await (window as any).electronAPI.getConfig();
    const apiKey = cfg?.DASHSCOPE_API_KEY;

    const imagePaths = [selectedImagePath.value];
    if (functionMode.value === 'description_edit_with_mask' && maskImagePath.value) {
      imagePaths.push(maskImagePath.value);
    }

    const payload = {
      prompt,
      imagePaths,
      functionMode: functionMode.value,
      n: params.n,
      seed: seedInput.value ? Number(seedInput.value) : undefined,
      
      strength: ['stylization_all', 'description_edit'].includes(functionMode.value) ? params.strength : undefined,
      upscale_factor: functionMode.value === 'super_resolution' ? params.upscale_factor : undefined,
      top_scale: functionMode.value === 'expand' ? params.top_scale : undefined,
      bottom_scale: functionMode.value === 'expand' ? params.bottom_scale : undefined,
      left_scale: functionMode.value === 'expand' ? params.left_scale : undefined,
      right_scale: functionMode.value === 'expand' ? params.right_scale : undefined,
      watermark: params.watermark,

      apiKey,
      createUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis",
      taskBaseUrl: "https://dashscope.aliyuncs.com/api/v1/tasks",
      clientId,
      name: taskName,
    };

    console.log("[ImageEdit] payload:", payload);

    const resultPaths = await (window as any).electronAPI.startWan21ImageEdit(payload);
    genResultPaths.value = resultPaths || [];
    
    if (clientId) wanEditStore.finish(clientId);
  } catch (err) {
    console.error("[ImageEdit] error:", err);
    if (clientId) {
      wanEditStore.append({ 
        stage: "error", 
        message: err instanceof Error ? err.message : String(err), 
        clientId 
      });
    }
  } finally {
    isGenerating.value = false;
  }
};
</script>
