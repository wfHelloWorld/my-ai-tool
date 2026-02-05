<!-- 基于首帧生成特效视频 -->
<template>
  <div class="h-full" ref="outerContainer">
    <el-splitter style="height: 100%">
      <!-- Left Panel: MarkdownViewer -->
      <el-splitter-panel :min="300">
        <div class="h-full w-full">
          <el-scrollbar style="height: 100%">
            <div class="p-4">
              <MarkdownViewer :source="mdContent" />
            </div>
          </el-scrollbar>
        </div>
      </el-splitter-panel>

      <!-- Right Panel: Interaction Area -->
      <el-splitter-panel v-model:size="rightPaneSize" :min="260">
        <el-splitter layout="vertical" style="height: 100%">
          <!-- Top: Parameters, Image Upload, Results -->
          <el-splitter-panel size="85%">
            <div class="h-full flex flex-col mb-[20px]">
              <div class="pt-5 shrink-0"></div>
              <div class="flex-1 overflow-y-auto px-[5%]">
                
                <!-- Parameters Area -->
                <div class="p-4 border rounded bg-gray-50 text-gray-800 space-y-4">
                  <div class="font-semibold">参数控制模块</div>
                  
                  <!-- Image Upload (Required) -->
                  <div>
                    <div class="font-semibold mb-2 text-sm">参考图片 (必填)</div>
                    <div class="flex items-center gap-3">
                      <div v-if="imageItem" class="relative group">
                        <img :src="imageItem.preview" class="w-32 h-32 object-contain rounded border bg-gray-200" />
                        <button class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          @click="removeImage">×</button>
                      </div>
                      <div v-else class="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:text-blue-500 text-gray-400" @click="triggerImageSelect">
                        <el-icon class="text-2xl mb-1"><Icon icon="mdi:image-plus" /></el-icon>
                        <span class="text-xs">选择图片</span>
                      </div>
                    </div>
                    <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="handleImageSelect" />
                  </div>

                  <!-- Model Selection -->
                  <div>
                    <div class="font-semibold mb-2 text-sm">模型 (Model)</div>
                    <el-select v-model="params.model" placeholder="Select Model" class="w-full">
                      <el-option
                        v-for="item in modelOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </div>

                  <!-- Resolution Selection -->
                  <div>
                    <div class="font-semibold mb-2 text-sm">分辨率 (Resolution)</div>
                    <el-radio-group v-model="params.resolution">
                      <el-radio label="720P" border>720P</el-radio>
                    </el-radio-group>
                  </div>

                  <!-- Template Selection -->
                  <div>
                    <div class="font-semibold mb-2 text-sm">视频特效模板 (必选)</div>
                    <el-radio-group v-model="params.template" class="w-full">
                      <div class="w-full space-y-4">
                        <div v-for="category in templateCategories" :key="category.title" class="bg-white p-3 rounded border">
                          <div class="text-xs font-bold text-gray-500 mb-2 border-b pb-1">{{ category.title }}</div>
                          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <el-radio 
                              v-for="opt in category.options" 
                              :key="opt.value" 
                              :label="opt.value" 
                              border
                              class="!mr-0 !w-full flex items-center justify-center !h-auto py-2"
                            >
                              <div class="flex flex-col items-center leading-tight">
                                <span class="text-sm font-medium">{{ opt.label }}</span>
                                <span class="text-xs text-gray-400 scale-90">{{ opt.value }}</span>
                              </div>
                            </el-radio>
                          </div>
                        </div>
                      </div>
                    </el-radio-group>
                  </div>

                </div>

                <!-- Results Preview Area -->
                <div class="mt-6 p-4 border rounded bg-white space-y-4 shadow-sm">
                  <div>
                    <div class="font-semibold mb-2">生成结果</div>
                    <div v-if="videoEffectsStore.results.length === 0" class="text-gray-500 text-sm">暂无结果</div>
                    <div v-else class="flex flex-wrap gap-3">
                      <div v-for="(item, i) in videoEffectsStore.results" :key="item.id || i" class="group relative">
                        <video 
                          v-if="genResultBlobUrls[item.path]"
                          controls 
                          :src="genResultBlobUrls[item.path]" 
                          class="w-64 h-auto rounded border bg-black"
                        ></video>
                        <div v-else class="w-64 h-36 flex items-center justify-center bg-gray-100 rounded border text-gray-400">
                          <el-icon class="is-loading mr-2"><Icon icon="mdi:loading" /></el-icon>
                          加载预览中...
                        </div>
                        <div class="mt-1 text-xs text-gray-500 break-all">{{ item.path.split(/[/\\]/).pop() }}</div>
                      </div>
                    </div>
                    <div class="mt-3">
                      <el-button size="small" @click="openVideosDir">打开保存目录</el-button>
                    </div>
                  </div>
                  
                  <!-- Progress & Logs -->
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
                        <!-- Log Details -->
                        <div class="text-xs text-gray-400 font-mono">
                           <div v-for="(log, li) in t.logs.slice(-3)" :key="li">
                             [{{ log.stage }}] {{ (log as any).message || (log as any).status || '' }}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-splitter-panel>
          
          <!-- Bottom: Create Button -->
          <el-splitter-panel>
            <div class="h-full w-full flex items-center justify-center bg-gray-50 p-4">
              <el-button 
                type="primary" 
                size="large" 
                class="w-full max-w-md !h-12 !text-lg" 
                :disabled="!imageItem || !params.template"
                @click="createTask"
              >
                <el-icon class="mr-2"><Icon icon="mdi:creation" /></el-icon>
                开始生成视频 (Generate)
              </el-button>
            </div>
          </el-splitter-panel>
        </el-splitter>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { Icon } from "@iconify/vue";
import MarkdownViewer from "../../components/MarkdownViewer.vue";
import mdContent from "../../common/md/video/video-effects-first.md?raw";
import { useWanxiang26VideoStatusStore } from "../../stores/useWanxiang26VideoStatusStore";
import { useProvidersStore } from "../../stores/useProviderStore";
import { useVideoEffectsStore } from "../../stores/useVideoEffectsStore";

const wanStore = useWanxiang26VideoStatusStore();
const providersStore = useProvidersStore();
const videoEffectsStore = useVideoEffectsStore();
const rightPaneSize = ref("70%");

// Parameters
const params = reactive({
  model: "wanx2.1-i2v-plus",
  template: "",
  resolution: "720P",
});

const modelOptions = computed(() => {
  return providersStore.items
    .filter((p) => p.name === "wanx2.1-i2v-plus")
    .map((p) => ({ label: p.title || p.name, value: p.name }));
});

const templateCategories = [
  {
    title: "通用特效 (General)",
    options: [
      { label: "解压捏捏", value: "squish" },
      { label: "转圈圈", value: "rotation" },
      { label: "戳戳乐", value: "poke" },
      { label: "气球膨胀", value: "inflate" },
      { label: "分子扩散", value: "dissolve" },
      { label: "热浪融化", value: "melt" },
      { label: "冰淇淋星球", value: "icecream" },
    ]
  },
  {
    title: "单人特效 (Single Person)",
    options: [
      { label: "时光木马", value: "carousel" },
      { label: "爱你哟", value: "singleheart" },
      { label: "摇摆时刻", value: "dance1" },
      { label: "头号甩舞", value: "dance2" },
      { label: "星摇时刻", value: "dance3" },
      { label: "指感节奏", value: "dance4" },
      { label: "舞动开关", value: "dance5" },
      { label: "人鱼觉醒", value: "mermaid" },
      { label: "学术加冕", value: "graduation" },
      { label: "巨兽追袭", value: "dragon" },
      { label: "财从天降", value: "money" },
      { label: "水母之约", value: "jellyfish" },
      { label: "瞳孔穿越", value: "pupil" },
    ]
  },
  {
    title: "单人或动物特效 (Single Person/Animal)",
    options: [
      { label: "魔法悬浮", value: "flying" },
      { label: "赠人玫瑰", value: "rose" },
      { label: "闪亮玫瑰", value: "crystalrose" },
    ]
  },
  {
    title: "双人特效 (Couple)",
    options: [
      { label: "爱的抱抱", value: "hug" },
      { label: "唇齿相依", value: "frenchkiss" },
      { label: "双倍心动", value: "coupleheart" },
    ]
  },
];

// Image Handling
interface ImageItem {
  path: string;
  preview: string;
}
const imageItem = ref<ImageItem | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);

const triggerImageSelect = () => imageInputRef.value?.click();

const handleImageSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target?.result) {
      imageItem.value = {
        path: e.target.result as string,
        preview: e.target.result as string,
      };
    }
  };
  reader.readAsDataURL(file);
  input.value = "";
};

const removeImage = () => {
  imageItem.value = null;
};

// Results Handling
// const genResultPaths = ref<string[]>([]); // Replaced by store
const genResultBlobUrls = ref<Record<string, string>>({});
const isGenerating = computed(() => wanStore.tasks.some(t => t.status === 'running'));

const loadVideoBlob = async (path: string) => {
  if (genResultBlobUrls.value[path]) return;
  try {
    const buffer = await (window as any).electronAPI.readVideoFile(path);
    const blob = new Blob([buffer], { type: "video/mp4" });
    genResultBlobUrls.value[path] = URL.createObjectURL(blob);
  } catch (err) {
    console.error("Load video blob error:", err);
  }
};

const openVideosDir = async () => {
  try {
    const res = await (window as any).electronAPI.openVideosDir();
    if (!res || !res.success) {
      console.warn("打开 videos 目录失败", res?.error);
    }
  } catch (err) {
    console.warn("打开 videos 目录异常", err);
  }
};

// Subscriptions
let unsubscribe: any = null;
onMounted(async () => {
  if (!providersStore.items.length) {
    await providersStore.initProvidersStore();
  }
  unsubscribe = (window as any).electronAPI.onWan26I2VProgress((info: any) => {
    wanStore.append(info);
  });
  
  // Load blobs for existing results sequentially to avoid freezing
  for (const r of videoEffectsStore.results) {
    await loadVideoBlob(r.path);
  }
});
onUnmounted(() => {
  unsubscribe?.();
  Object.values(genResultBlobUrls.value).forEach(url => URL.revokeObjectURL(url));
});

// Create Task
const createTask = async () => {
  if (!imageItem.value) {
    alert("请先选择参考图片");
    return;
  }
  if (!params.template) {
    alert("请选择视频特效模板");
    return;
  }

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const templateName = templateCategories.flatMap(c => c.options).find(o => o.value === params.template)?.label || params.template;
  const taskName = `特效-${templateName}`;
  
  // Capture current state for this task
  const currentImage = imageItem.value;
  const currentTemplate = params.template;
  const currentModel = params.model;
  const currentResolution = params.resolution;

  wanStore.beginTask(clientId, taskName);

  // Execute in background
  runGeneration(clientId, taskName, currentImage, currentTemplate, currentModel, currentResolution);
};

const runGeneration = async (
  clientId: string, 
  taskName: string, 
  imgItem: ImageItem, 
  template: string, 
  model: string, 
  resolution: string
) => {
  try {
    const cfg = await (window as any).electronAPI.getConfig();
    
    // Initialize providers if needed
    if (!providersStore.items.length) {
      await providersStore.initProvidersStore();
    }
    
    // Find the specific model based on selection
    const provider = providersStore.items.find(p => p.name === model);
    
    // Handle URL prefix "POST " if present
    let createUrl = provider?.url;
    if (createUrl && createUrl.startsWith("POST ")) {
      createUrl = createUrl.replace(/^POST\s+/, "");
    }
    
    const payload = {
      imagePath: imgItem.path,
      template: template,
      resolution: resolution as "720P",
      model: model,
      apiKey: cfg?.DASHSCOPE_API_KEY,
      createUrl: createUrl, 
      clientId,
      name: taskName,
    };
    
    const res = await (window as any).electronAPI.startWan26I2V(payload);
    
    if (res && res.length > 0) {
      // Add results to store first so UI shows "Loading preview..." placeholder
      for (const p of res) {
        videoEffectsStore.addResult({
          id: clientId,
          path: p,
          template: template,
          model: model,
          timestamp: Date.now(),
        });
      }

      // Then load video blobs
      for (const p of res) {
        await loadVideoBlob(p);
      }
    }
    
    wanStore.finish(clientId, true);
  } catch (err: any) {
    console.error(err);
    wanStore.append({ stage: "error", message: err.message, clientId });
  }
};
</script>

<style scoped>
/* Adjust radio button style to allow wrapping content */
:deep(.el-radio.is-bordered) {
  height: auto !important;
  padding: 8px 10px !important;
}
</style>
