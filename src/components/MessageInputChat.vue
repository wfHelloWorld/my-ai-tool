<template>
  <!-- <div>MessageInput</div> -->
  <div class="w-full">
    <!-- 输入组件 -->
    <div class="flex justify-center">
      <div class="w-[80%] flex flex-col gap-2">
        <!-- 图片预览（上方，左对齐） -->
        <div v-if="imagePreview" class="flex items-start">
          <div class="relative inline-block border-2 border-gray-200 rounded-md">
            <el-tooltip placement="top" effect="light">
              <template #content>
                <img :src="imagePreview" alt="Preview" class="max-w-[300px] max-h-[300px]" />
              </template>
              <img :src="imagePreview" alt="preview" class="w-10 h-10 rounded object-cover cursor-pointer" />
            </el-tooltip>
            <button
              class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center text-xs cursor-pointer hover:cursor-pointer"
              @click="removeImage"
              title="移除图片"
            >
              <Icon icon="radix-icons:cross-2" width="10" height="10" />
            </button>
          </div>
        </div>

        <!-- 输入框 -->
        <div class="relative" @dragover.prevent @drop="handleDrop">
          <el-input
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 3 }"
            placeholder="Please input"
            :disabled="props.disabled"
            @keydown="handleKeydown"
          />
        </div>

        <!-- 按钮行（下方） -->
        <div class="flex items-center justify-between">
          <!-- 左侧：导入图片（simpleMode 下隐藏） -->
          <div v-if="!props.simpleMode">
            <input type="file" accept="image/*" class="hidden" ref="fileInput" @change="handleImageUpload" />
            <el-button type="primary" link @click="triggerFileInput" :disabled="props.disabled" class="px-2 py-2" circle>
              <Icon icon="radix-icons:image" width="20" height="20" />
            </el-button>
          </div>
          <!-- 右侧：发送 -->
          <el-button type="success" :loading="isLoading" @click="onCreate" :disabled="props.disabled" class="px-2 py-2" circle>
            <Icon icon="radix-icons:paper-plane" width="16" height="16" />
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick } from "vue";
import { Icon } from "@iconify/vue";
import { ElMessage } from "element-plus";

/**
 * 用ref绑定input组件的DOM
 */
const fileInput = ref<HTMLInputElement | null>(null);

/**
 * // 预览图片(base64)
 */
const imagePreview = ref("");

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    simpleMode?: boolean; // 简化模式：不处理图片，仅发文本
  }>(),
  {
    disabled: false,
    simpleMode: false,
  }
);

/**
 * 通过点击另外一个元素触发fileInput组件
 */
const triggerFileInput = () => {
  if (props.disabled) {
    return;
  }
  // 触发fileInput的方法
  fileInput.value?.click();
};

// 图片大小限制
const MAX_SIZE = 7 * 1024 * 1024; // 7MB

let selectFirstImage: File | null = null;
let selectLastImage: File | null = null;

// 将 canvas 转为 Blob 的 Promise 封装（PNG）
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

// 压缩图片（仅输出 PNG）：
// 1) 将较大尺寸图片缩放至不超过 maxDimension（默认 2048）
// 2) 若仍超出大小限制，继续按缩放因子递减，直到不超过目标大小或达到最小尺寸
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

  // 初始缩放，限制最大边不超过 maxDimension
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

  // 若仍超限，则循环进一步缩小尺寸（保守递减 0.85），直至不超过目标或达到最小尺寸
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

    // 更新当前画布与尺寸、生成新 blob
    canvas = canvas2;
    width = newW;
    height = newH;
    blob = await canvasToPngBlob(canvas);
  }

  const newName = file.name.replace(/\.[^.]+$/, "") + "-compressed.png";
  return new File([blob], newName, { type: "image/png" });
};

// 预览图片 URL（使用 objectURL 以避免重复读取）
const previewObjectUrl = ref<string | null>(null);

/**
 * 通过 `FIleReader` 方法来将`input`组件获取到的图片转换为base64格式,复赋值给 imagePreview
 */
const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    let file = target.files[0];

    // 若文件过大，则自动压缩
    if (file.size > MAX_SIZE) {
      try {
        const compressed = await compressImage(file);
        file = compressed;
        ElMessage.success("图片已自动压缩并导入");
      } catch (err) {
        ElMessage.error("图片压缩失败，请重试");
        // 清空文件输入，防止残留
        target.value = "";
        return;
      }
    }

    selectFirstImage = file;

    // 释放旧的预览 URL
    if (previewObjectUrl.value) {
      URL.revokeObjectURL(previewObjectUrl.value);
      previewObjectUrl.value = null;
    }

    // 使用 objectURL 进行预览，避免二次读取
    const url = URL.createObjectURL(file);
    previewObjectUrl.value = url;
    imagePreview.value = url;

    // 清空 input[type=file] 的值，允许重新选择相同文件
    target.value = "";
  }
};

// 支持从桌面拖拽图片到输入框（当当前没有图片时导入；已有图片时替换为新图片）
const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  if (props.disabled) return;

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  let file = files[0];
  if (!file.type.startsWith("image/")) {
    ElMessage.error("请拖入图片文件");
    return;
  }

  // 若文件过大，则自动压缩
  if (file.size > MAX_SIZE) {
    try {
      const compressed = await compressImage(file);
      file = compressed;
      ElMessage.success("图片已自动压缩并导入");
    } catch (err) {
      ElMessage.error("图片压缩失败，请重试");
      return;
    }
  }

  // 无论是否已有图片，都使用新拖入的图片进行替换
  selectFirstImage = file;

  // 释放旧的预览 URL
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value);
    previewObjectUrl.value = null;
  }

  // 使用 objectURL 进行预览
  const url = URL.createObjectURL(file);
  previewObjectUrl.value = url;
  imagePreview.value = url;

  // 清空隐藏的文件输入，以便后续可再次选择相同文件
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};
const input = ref("");
const isLoading = ref(false);

// 定义 emit
const emit = defineEmits<{
  create: [value: string, imagePath?: string];
}>();

const onCreate = async () => {
  if (input.value.trim() === "") return;
  // simpleMode：不做任何图片处理，避免跨 context 传递 File 导致克隆错误
  if (props.simpleMode) {
    emit("create", input.value);
  } else {
    if (selectFirstImage) {
      const filePath = await window.electronAPI.ensureImageStored(selectFirstImage);
      emit("create", input.value, filePath);
    } else {
      emit("create", input.value);
    }
  }
  input.value = ""; // 发送后清空输入框
  selectFirstImage = null; // 清空图片选择
  // 清理预览 URL，释放内存
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value);
    previewObjectUrl.value = null;
  }
  imagePreview.value = ""; // 清空预览图片
};

const removeImage = () => {
  selectFirstImage = null;
  // 清理预览 URL
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value);
    previewObjectUrl.value = null;
  }
  imagePreview.value = "";
  // 清空 input[type=file] 的值，允许重新选择相同文件
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};
const handleKeydown = (event: KeyboardEvent) => {
  // 正在使用输入法时（isComposing 为 true），回车仅用于确认输入，不发送消息
  if (event.isComposing) return;

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); // 阻止默认换行
    onCreate();
  }
};

// 不再监听 textarea 滚动
</script>

<style scoped>
/* 不再嵌入输入框，无需内部缩略图样式 */
</style>
