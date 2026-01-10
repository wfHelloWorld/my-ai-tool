<template>
  <div class="h-full" ref="outerContainer">
    <el-splitter style="height: 100%">
      <!-- 左侧面板：MarkdownViewer -->
      <el-splitter-panel :min="300">
        <div class="h-full w-full">
          <el-scrollbar style="height: 100%">
            <div class="p-4">
              <MarkdownViewer :source="wan26VideoMd" />
            </div>
          </el-scrollbar>
        </div>
      </el-splitter-panel>

      <el-splitter-panel v-model:size="rightPaneSize" :min="260">
        <el-splitter layout="vertical" style="height: 100%">
          <!-- 上方：参数、图片/音频选择、结果 -->
          <el-splitter-panel size="70%">
            <div class="h-full flex flex-col mb-[20px]">
              <div class="pt-5 shrink-0"></div>
              <div class="flex-1 overflow-y-auto px-[5%]">
                
                <!-- 参数区 -->
                <div class="p-4 border rounded bg-gray-50 text-gray-800 space-y-3">
                  <div class="font-semibold">参数控制模块</div>
                  <div class="grid grid-cols-2 gap-3">
                    
                    <!-- 分辨率 -->
                    <div>
                      <label class="block text-sm mb-1">分辨率 (Resolution)</label>
                      <el-select v-model="params.resolution" class="w-full">
                        <el-option label="720P (1280x720)" value="720P" />
                        <el-option label="1080P (1920x1080)" value="1080P" />
                        <el-option label="480P (720x480)" value="480P" />
                      </el-select>
                    </div>

                    <!-- 时长 -->
                    <div>
                      <label class="block text-sm mb-1">时长 (Duration)</label>
                      <el-select v-model="params.duration" class="w-full">
                        <el-option label="5 秒" :value="5" />
                        <el-option label="10 秒" :value="10" />
                        <el-option label="15 秒" :value="15" />
                      </el-select>
                    </div>

                    <!-- 随机种子 -->
                    <div>
                      <label class="block text-sm mb-1">随机种子 (Seed)</label>
                      <el-input v-model="seedInput" placeholder="留空随机" />
                    </div>

                    <!-- 镜头类型 -->
                    <div>
                      <label class="block text-sm mb-1">镜头类型 (Shot Type)</label>
                      <el-select v-model="params.shot_type" class="w-full">
                        <el-option label="单镜头 (Single)" value="single" />
                        <el-option label="多镜头 (Multi)" value="multi" />
                      </el-select>
                    </div>

                    <!-- 复选框 -->
                    <div class="col-span-2 flex gap-4 mt-2">
                      <el-checkbox v-model="params.watermark" label="添加水印" />
                      <el-checkbox v-model="params.prompt_extend" label="智能改写Prompt" />
                    </div>
                  </div>

                  <!-- 图片上传 (必填) -->
                  <div class="mt-4">
                    <div class="font-semibold mb-2">参考图片 (必填)</div>
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

                  <!-- 音频上传 (选填) -->
                  <div class="mt-4">
                    <div class="font-semibold mb-2">背景音频 (选填)</div>
                    <div class="flex items-center gap-3">
                      <div v-if="audioItem" class="relative group flex items-center gap-2 p-2 border rounded bg-white">
                        <el-icon class="text-blue-500"><Icon icon="mdi:music" /></el-icon>
                        <span class="text-sm truncate max-w-[150px]">{{ audioItem.name }}</span>
                        <button class="ml-2 text-red-500 hover:text-red-700" @click="removeAudio">×</button>
                      </div>
                      <el-button v-else size="small" @click="triggerAudioSelect">
                        <el-icon class="mr-1"><Icon icon="mdi:upload" /></el-icon>
                        上传音频
                      </el-button>
                    </div>
                    <input ref="audioInputRef" type="file" accept="audio/*" class="hidden" @change="handleAudioSelect" />
                  </div>
                </div>

                <!-- 结果预览区 -->
                <div class="mt-6 p-4 border rounded bg-white space-y-4 shadow-sm">
                  <div>
                    <div class="font-semibold mb-2">生成结果</div>
                    <div v-if="genResultPaths.length === 0" class="text-gray-500 text-sm">暂无结果</div>
                    <div v-else class="flex flex-wrap gap-3">
                      <div v-for="(p, i) in genResultPaths" :key="`res-${i}`" class="group relative">
                        <video 
                          v-if="genResultBlobUrls[p]"
                          controls 
                          :src="genResultBlobUrls[p]" 
                          class="w-64 h-auto rounded border bg-black"
                        ></video>
                        <div v-else class="w-64 h-36 flex items-center justify-center bg-gray-100 rounded border text-gray-400">
                          <el-icon class="is-loading mr-2"><Icon icon="mdi:loading" /></el-icon>
                          加载预览中...
                        </div>
                        <div class="mt-1 text-xs text-gray-500 break-all">{{ p.split(/[/\\]/).pop() }}</div>
                      </div>
                    </div>
                    <div class="mt-3">
                      <el-button size="small" @click="openVideosDir">打开保存目录</el-button>
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
                        <!-- 日志详情 -->
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
          
          <!-- 下方：输入框 -->
          <el-splitter-panel>
            <div class="h-full w-full flex items-center justify-center">
              <MessageInputChat 
                @create="createTask" 
                placeholder="输入视频描述..."
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
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { Icon } from "@iconify/vue";
import MessageInputChat from "../../components/MessageInputChat.vue";
import MarkdownViewer from "../../components/MarkdownViewer.vue";
import wan26VideoMd from "../../common/md/video/wan2.6-i2v.md?raw";
import { useWanxiang26VideoStatusStore } from "../../stores/useWanxiang26VideoStatusStore";

const wanStore = useWanxiang26VideoStatusStore();
const rightPaneSize = ref("70%");

// 参数
const params = reactive({
  resolution: "1080P",
  duration: 5,
  shot_type: "single",
  watermark: false,
  prompt_extend: true,
});
const seedInput = ref("");

// 图片处理
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
  try {
    const storedPath = await (window as any).electronAPI.ensureImageStored(file);
    imageItem.value = {
      path: storedPath,
      preview: URL.createObjectURL(file),
    };
  } catch (err) {
    console.error("Image select error:", err);
  }
  input.value = "";
};

const removeImage = () => {
  if (imageItem.value) URL.revokeObjectURL(imageItem.value.preview);
  imageItem.value = null;
};

// 音频处理
interface AudioItem {
  path: string;
  name: string;
}
const audioItem = ref<AudioItem | null>(null);
const audioInputRef = ref<HTMLInputElement | null>(null);

const triggerAudioSelect = () => audioInputRef.value?.click();
const handleAudioSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  const file = input.files[0];
  try {
    const path = await (window as any).electronAPI.getFilePath(file);
    if (path) {
      audioItem.value = {
        path,
        name: file.name,
      };
    }
  } catch (err) {
    console.error("Audio select error:", err);
  }
  input.value = "";
};
const removeAudio = () => {
  audioItem.value = null;
};

// 结果
const genResultPaths = ref<string[]>([]);
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

// 订阅
let unsubscribe: any = null;
onMounted(() => {
  unsubscribe = (window as any).electronAPI.onWan26I2VProgress((info: any) => {
    wanStore.append(info);
  });
});
onUnmounted(() => {
  unsubscribe?.();
  if (imageItem.value) URL.revokeObjectURL(imageItem.value.preview);
  // 清理视频 blob url
  Object.values(genResultBlobUrls.value).forEach(url => URL.revokeObjectURL(url));
});

// 创建任务
const createTask = async (prompt: string) => {
  if (!imageItem.value) {
    alert("请先选择参考图片");
    return;
  }

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const taskName = prompt ? prompt.slice(0, 20) : "图生视频任务";
  
  wanStore.beginTask(clientId, taskName);

  try {
    const cfg = await (window as any).electronAPI.getConfig();
    const payload = {
      prompt,
      imagePath: imageItem.value.path,
      audioPath: audioItem.value?.path,
      
      resolution: params.resolution,
      duration: params.duration,
      shot_type: params.shot_type,
      watermark: params.watermark,
      prompt_extend: params.prompt_extend,
      seed: seedInput.value ? Number(seedInput.value) : undefined,
      
      apiKey: cfg?.DASHSCOPE_API_KEY,
      clientId,
      name: taskName,
    };
    
    const res = await (window as any).electronAPI.startWan26I2V(payload);
    // 将新结果添加到列表头部
    if (res && res.length > 0) {
      genResultPaths.value.unshift(...res);
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
