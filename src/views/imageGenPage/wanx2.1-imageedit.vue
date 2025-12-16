<template>
  <div class="h-full" ref="outerContainer">
    <el-splitter style="height: 100%">
      <!-- 左侧面板：可以放置说明或简单的配置，移除 ProviderSelect -->
      <el-splitter-panel :min="200" :size="leftPaneSize">
        <div class="h-full w-full p-4 bg-gray-50 flex flex-col">
          <div class="text-lg font-bold mb-4 text-gray-700">通义万相-图像编辑 2.1</div>
          <div class="text-sm text-gray-500 mb-6">
            基于阿里云通义万相 2.1 模型，支持指令编辑、风格迁移等功能。请上传参考图并输入指令。
          </div>
          
          <div class="space-y-4">
             <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">功能模式 (Function)</label>
              <el-select v-model="functionMode" placeholder="选择功能" class="w-full">
                <el-option label="指令编辑 (Instruction)" value="instruction" />
                <el-option label="风格迁移 (Style Ref)" value="style_ref" />
                <el-option label="涂抹编辑 (Image Paint)" value="image_paint" />
                <el-option label="图像扩充 (Inpainting)" value="inpainting" />
              </el-select>
              <div class="text-xs text-gray-400 mt-1">
                {{ functionDesc }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">生成数量 (n)</label>
              <el-input-number v-model="params.n" :min="1" :max="4" class="w-full" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">随机种子 (Seed)</label>
              <el-input v-model="seedInput" placeholder="留空随机" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">尺寸 (Size)</label>
              <el-select v-model="params.size" placeholder="默认原图比例" class="w-full">
                <el-option label="默认 (保持比例)" value="" />
                <el-option
                  v-for="item in sizeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>
          </div>
        </div>
      </el-splitter-panel>

      <el-splitter-panel v-model:size="rightPaneSize" :min="300" @update:size="onRightSizeUpdate">
        <el-splitter layout="vertical" style="height: 100%">
          <!-- 上方：图片选择与结果预览 -->
          <el-splitter-panel size="70%">
            <div class="h-full flex flex-col mb-[20px]">
              <div class="pt-5 shrink-0"></div>
              <div class="flex-1 overflow-y-auto px-[5%]">
                
                <!-- 图片选择区 -->
                <div class="p-4 border rounded bg-white space-y-3 shadow-sm">
                  <div class="flex justify-between items-center">
                    <div class="font-semibold text-gray-700">参考图片 (必需)</div>
                    <el-button type="primary" size="small" @click="triggerFileSelect">选择图片</el-button>
                  </div>
                  <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleImageSelect" />
                  
                  <div v-if="previewUrl" class="relative inline-block mt-2">
                    <img :src="previewUrl" class="h-40 object-contain rounded border bg-gray-100" />
                    <button class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow"
                      title="移除" @click="removeSelectedImage">×</button>
                  </div>
                  <div v-else class="h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 bg-gray-50">
                    请选择一张图片作为基底
                  </div>
                </div>

                <!-- 结果预览区 -->
                <div class="mt-6 p-4 border rounded bg-white space-y-4 shadow-sm">
                  <div>
                    <div class="font-semibold mb-2 text-gray-700">生成结果</div>
                    <div v-if="genResultPaths.length === 0" class="text-gray-500 text-sm italic">暂无结果</div>
                    <div v-else class="flex flex-wrap gap-3">
                      <div v-for="(p, i) in genResultPaths" :key="`res-${i}`" class="group relative">
                        <img :src="toSafeFileUrl(p)" class="h-48 object-cover rounded border shadow-sm cursor-pointer" @click="openImage(p)" />
                      </div>
                    </div>
                    <div class="mt-3" v-if="genResultPaths.length > 0">
                      <el-button size="small" @click="openImagesDir">打开保存目录</el-button>
                    </div>
                  </div>
                  
                  <!-- 进度与日志 -->
                  <div v-if="wanEditStore.tasks.length > 0">
                    <div class="font-semibold mb-2 text-gray-700">任务进度</div>
                    <div class="space-y-3 max-h-60 overflow-auto border rounded p-3 bg-gray-50">
                      <div v-for="t in wanEditStore.tasks" :key="t.clientId" class="space-y-1">
                        <div class="flex items-center justify-between text-sm text-gray-700">
                          <span class="font-medium truncate max-w-[60%]">{{ t.name }}</span>
                          <span class="text-xs px-2 py-0.5 rounded" 
                            :class="{
                              'bg-blue-100 text-blue-700': t.status === 'running',
                              'bg-green-100 text-green-700': t.status === 'completed',
                              'bg-red-100 text-red-700': t.status === 'failed' || t.status === 'timeout'
                            }">
                            {{ t.status === 'running' ? '进行中' : (t.status === 'completed' ? '完成' : '失败') }}
                          </span>
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
            <div class="h-full w-full flex items-center justify-center bg-white border-t">
              <MessageInputChat 
                @create="createTask" 
                :disabled="isGenerating || !selectedImagePath" 
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
import { useWanxiang21ImageEditStatusStore } from "../../stores/useWanxiang21ImageEditStatusStore";

const wanEditStore = useWanxiang21ImageEditStatusStore();

const outerContainer = ref<HTMLElement | null>(null);
const leftPaneSize = ref("20%");
const rightPaneSize = ref("80%");

// 参数
const functionMode = ref("instruction");
const params = reactive({
  n: 1,
  size: "",
});
const seedInput = ref<string>("");

const sizeOptions: Array<{ value: string; label: string }> = [
  { value: "1024*1024", label: "1024*1024 (1:1)" },
  { value: "720*1280", label: "720*1280 (9:16)" },
  { value: "1280*720", label: "1280*720 (16:9)" },
];

const functionDesc = computed(() => {
  switch (functionMode.value) {
    case "instruction": return "通过自然语言指令编辑图像";
    case "style_ref": return "将参考图风格迁移到目标图";
    case "image_paint": return "涂抹编辑（需要Mask）";
    case "inpainting": return "图像扩充（需要Mask）";
    default: return "";
  }
});

// 图片选择
const selectedImagePath = ref<string>("");
const previewUrl = ref<string>("");
const fileInputRef = ref<HTMLInputElement | null>(null);

// 结果
const genResultPaths = ref<string[]>([]);
const isGenerating = ref<boolean>(false);

function toSafeFileUrl(localPath: string) {
  if (!localPath) return "";
  return `safe-file://${encodeURIComponent(localPath)}`;
}

const openImagesDir = async () => {
  try {
    await (window as any).electronAPI.openImagesDir();
  } catch (e) {
    console.error("[ImageEdit] openImagesDir error:", e);
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

    const file = files[0];
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

const onRightSizeUpdate = (val: string | number) => {
  // 简单的 size 更新逻辑，可选保存到 localStorage
};

// 任务订阅
let unsubscribe: (() => void) | null = null;

onMounted(() => {
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
});

/**
 * 发起任务
 */
const createTask = async (prompt: string) => {
  if (!selectedImagePath.value) {
    alert("请先选择一张参考图片");
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

    const payload = {
      prompt,
      imagePaths: [selectedImagePath.value],
      functionMode: functionMode.value,
      n: params.n,
      seed: seedInput.value ? Number(seedInput.value) : undefined,
      size: params.size || undefined,
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
