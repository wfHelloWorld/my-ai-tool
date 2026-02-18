<template>
  <div class="h-full" ref="outerContainer">
    <el-splitter style="height: 100%">
      <!-- 左侧面板：MarkdownViewer (可选) -->
      <el-splitter-panel :min="300">
        <div class="h-full w-full">
          <el-scrollbar style="height: 100%">
            <div class="p-4">
              <MarkdownViewer :source="wan26ImageMd" />
            </div>
          </el-scrollbar>
        </div>
      </el-splitter-panel>

      <el-splitter-panel v-model:size="rightPaneSize" :min="260" @update:size="onRightSizeUpdate">
        <el-splitter layout="vertical" style="height: 100%">
          <!-- 上方：参数、图片选择、结果 -->
          <el-splitter-panel size="70%">
            <div class="h-full flex flex-col mb-[20px]">
              <div class="pt-5 shrink-0"></div>
              <div class="flex-1 overflow-y-auto px-[5%]">
                
                <!-- 参数区 -->
                <div class="p-4 border rounded bg-gray-50 text-gray-800 space-y-3">
                  <div class="font-semibold">参数控制模块</div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-sm mb-1">生成数量</label>
                      <el-input-number v-model="params.n" :min="1" :max="4" class="w-full" />
                    </div>

                    <div>
                      <label class="block text-sm mb-1">分辨率 (Size)</label>
                      <el-select v-model="params.size" class="w-full">
                        <el-option label="默认 (不指定)" value="" />
                        <el-option label="1280*1280 (1:1)" value="1280*1280" />
                        <el-option label="1024*1024 (1:1)" value="1024*1024" />
                        <el-option label="800*1200 (2:3)" value="800*1200" />
                        <el-option label="1200*800 (3:2)" value="1200*800" />
                        <el-option label="960*1280 (3:4)" value="960*1280" />
                        <el-option label="1280*960 (4:3)" value="1280*960" />
                        <el-option label="720*1280 (9:16)" value="720*1280" />
                        <el-option label="1280*720 (16:9)" value="1280*720" />
                        <el-option label="1344*576 (21:9)" value="1344*576" />
                      </el-select>
                    </div>

                    <div>
                      <label class="block text-sm mb-1">随机种子 (Seed)</label>
                      <el-input v-model="seedInput" placeholder="留空随机" />
                    </div>

                    <div class="col-span-2 flex gap-4">
                      <el-checkbox v-model="params.watermark" label="添加水印" />
                      <el-checkbox v-if="!enable_interleave" v-model="params.prompt_extend" label="智能改写Prompt" />
                    </div>
                  </div>

                  <div class="mt-4">
                    <div class="font-semibold mb-2">参考图片 (可选, 最多4张)</div>
                    <div class="flex flex-wrap gap-2 mb-2">
                       <div v-for="(img, idx) in imageList" :key="idx" class="relative group">
                         <img :src="img.preview" class="w-20 h-20 object-cover rounded border" />
                         <button class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                           @click="removeImage(idx)">×</button>
                       </div>
                       
                       <div v-if="canAddImage" class="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 hover:text-blue-500 text-gray-400" @click="triggerFileSelect">
                         <el-icon><Icon icon="mdi:plus" /></el-icon>
                       </div>
                    </div>
                    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleImageSelect" multiple />
                  </div>
                </div>

                <!-- 结果预览区 -->
                <div class="mt-6 p-4 border rounded bg-white space-y-4 shadow-sm">
                  <div>
                    <div class="font-semibold mb-2">生成结果</div>
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
                      <el-icon class="is-loading"><Icon icon="mdi:loading" /></el-icon>
                      <span>正在生成，请稍候…</span>
                    </div>
                    <div v-if="wanStore.tasks.length === 0" class="text-gray-500 text-sm">暂无进度</div>
                    <div v-else class="space-y-3 max-h-60 overflow-auto border rounded p-2 bg-gray-50">
                      <div v-for="t in wanStore.tasks" :key="t.clientId" class="space-y-1">
                        <div class="flex items-center justify-between text-sm text-gray-700">
                          <span class="font-medium truncate max-w-[60%]">任务：{{ t.name }}</span>
                          <span class="text-xs text-gray-500">{{ t.status === 'running' ? '进行中' : (t.status === 'success' ? '完成' : '失败') }}</span>
                        </div>
                        <el-progress :percentage="t.percentage" :status="t.status === 'success' ? 'success' : (t.status === 'failed' ? 'exception' : '')" />
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
                placeholder="输入描述 (支持中英文)..."
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
import { computed, onMounted, onUnmounted, ref, reactive, watch } from "vue";
import { Icon } from "@iconify/vue";
import MessageInputChat from "../../components/MessageInputChat.vue";
import MarkdownViewer from "../../components/MarkdownViewer.vue";
import wan26ImageMd from "../../common/md/imageGen/wan2.6-image.md?raw";
import { useWanxiang26ImageStatusStore } from "../../stores/useWanxiang26ImageStatusStore";
import { compressImage } from "../../utils/imageCompression";

const wanStore = useWanxiang26ImageStatusStore();
const outerContainer = ref<HTMLElement | null>(null);
const rightPaneSize = ref("70%");

// UI Helpers
  const onRightSizeUpdate = async (val: string | number) => { /* ... reuse logic ... */ }; // Simplify for brevity, assume similar to others

// 参数
const enable_interleave = ref(true);

watch(enable_interleave, () => {
  // 切换模式时，重置图片列表 (可选)
  // imagePaths.value = [];
});
const params = reactive({
  n: 1,
  size: "", // Default empty string for "no size specified"
  watermark: false,
  prompt_extend: true,
});
const seedInput = ref("");

// 图片列表
interface ImageItem {
  path: string;
  preview: string;
}
const imageList = ref<ImageItem[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);

const canAddImage = computed(() => {
  return imageList.value.length < 4;
});

const triggerFileSelect = () => fileInputRef.value?.click();

const handleImageSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  
  for (const file of Array.from(input.files)) {
    if (!canAddImage.value) break;
    try {
      let f = file;
      if (f.size > 5 * 1024 * 1024) {
         f = await compressImage(f, { targetMaxBytes: 5 * 1024 * 1024 });
      }
      const savedPath = await (window as any).electronAPI.ensureImageStored(f);
      imageList.value.push({
        path: savedPath,
        preview: URL.createObjectURL(f)
      });
    } catch (err) {
      console.error("Image select error:", err);
    }
  }
  input.value = "";
};

const removeImage = (idx: number) => {
  URL.revokeObjectURL(imageList.value[idx].preview);
  imageList.value.splice(idx, 1);
};

// 结果
const genResultPaths = ref<string[]>([]);
const isGenerating = ref(false);

const toSafeFileUrl = (localPath: string) => {
  if (!localPath) return "";
  // 使用 query 参数传递路径，并添加 dummy path 确保 URL 格式标准
  return `safe-file:///image?path=${encodeURIComponent(localPath)}`;
};
const openImagesDir = () => (window as any).electronAPI.openDownloadsDir();
const openImage = (path: string) => (window as any).electronAPI.openPath(path);

// 订阅
let unsubscribe: any = null;
onMounted(() => {
  unsubscribe = (window as any).electronAPI.onWan26ImageProgress((info: any) => {
    wanStore.append(info);
  });
});
onUnmounted(() => {
  unsubscribe?.();
  imageList.value.forEach(i => URL.revokeObjectURL(i.preview));
});

// 创建任务
const createTask = async (prompt: string) => {
  if (!prompt.trim()) return;

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const taskName = prompt.slice(0, 20);
  isGenerating.value = true;
  wanStore.beginTask(clientId, taskName);

  try {
    const cfg = await (window as any).electronAPI.getConfig();
    const payload = {
      prompt,
      imagePaths: imageList.value.map(i => i.path),
      n: params.n,
      ...(params.size ? { size: params.size } : {}),
      seed: seedInput.value ? Number(seedInput.value) : undefined,
      watermark: params.watermark,
      prompt_extend: params.prompt_extend,
      
      apiKey: cfg?.DASHSCOPE_API_KEY,
      createUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation",
      taskBaseUrl: "https://dashscope.aliyuncs.com/api/v1/tasks",
      clientId,
      name: taskName,
    };
    
    const res = await (window as any).electronAPI.startWan26Image(payload);
    // 追加结果而不是覆盖
    if (res && res.length > 0) {
      genResultPaths.value = [...genResultPaths.value, ...res];
    }
    wanStore.finish(clientId, true);
  } catch (err: any) {
    console.error(err);
    wanStore.append({ stage: "error", message: err.message, clientId });
  } finally {
    isGenerating.value = false;
  }
};
</script>
