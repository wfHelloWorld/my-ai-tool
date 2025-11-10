<template>
  <!-- <div>MessageInput</div> -->
  <div class="w-full">
    <!-- 输入组件 -->
    <div class="flex justify-center">
      <div class="w-[80%] flex items-start">
        <!-- 用 Icon代替问价上传组件 -->
        <input type="file" accept="image/*" class="hidden" ref="fileInput" @change="handleImageUpload" />
        <!-- 图片预览 -->
        <!-- elementPlus文字提示组件,展示选择的图片 -->
        <div class="self-start">
          <el-tooltip placement="top" effect="light">
            <template #content>
              <!-- <div v-if="imagePreview" class="mb-2 relative flex items-center">
                <img :src="imagePreview" alt="Preview" class="h-50" />
              </div> -->
              <el-text class="mx-1" type="info" size="small">{{ $t('common.imageInputHint') }}</el-text>
            </template>
            <Icon icon="radix-icons:image" width="24" height="24" :class="[
            'mr-2',
            disabled
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-400 cursor-pointer hover:text-gray-600',
          ]" @click="triggerFileInput" />
          </el-tooltip>
        </div>

        <!-- 在 el-input 内部显示图片缩略图（覆盖在内侧顶部），并在悬停时显示大图 tooltip -->
        <div class="relative flex-1 input-with-thumb self-start" :class="{ 'has-thumb': !!imagePreview }" ref="inputWithThumb" @dragover.prevent @drop="handleDrop">
          <el-input
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 3 }"
            placeholder="Please input"
            :disabled="props.disabled"
            @keydown="handleKeydown"
          >
          </el-input>

          <div v-if="imagePreview" class="input-thumb-wrapper">
            <div class="thumb-box">
              <el-tooltip placement="top" effect="light">
                <template #content>
                  <img :src="imagePreview" alt="Preview" class="max-w-[300px] max-h-[300px]" />
                </template>
                <img :src="imagePreview" alt="thumb" class="input-thumb" />
              </el-tooltip>
              <button
                class="thumb-box-remove no-drag"
                @click.stop="removeImage"
                title="移除图片"
                aria-label="移除图片"
              >
                <Icon icon="radix-icons:cross-2" width="12" height="12" />
              </button>
            </div>
          </div>
        </div>

        <el-button type="success" :loading="isLoading" @click="onCreate" :disabled="props.disabled" class="self-start">
          <!-- 发送 -->
          {{ $t("common.send") }}
          <Icon icon="radix-icons:paper-plane" width="15" height="15" class="ml-1" />
        </el-button>
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
  }>(),
  {
    disabled: false,
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
  if (selectFirstImage) {
    // 确保图片存在于用户目录，兼容压缩后新建 File 无原生路径的情况
    const filePath = await window.electronAPI.ensureImageStored(selectFirstImage);
    emit("create", input.value, filePath);
  } else {
    emit("create", input.value);
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
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); // 阻止默认换行
    onCreate();
  }
};

// 让缩略图视觉上跟随 textarea 内容滚动
const inputWithThumb = ref<HTMLElement | null>(null);
const textareaScrollTop = ref(0);

onMounted(() => {
  nextTick(() => {
    const textarea = inputWithThumb.value?.querySelector('textarea.el-textarea__inner') as HTMLTextAreaElement | null;
    if (textarea) {
      const onScroll = (e: Event) => {
        const t = e.target as HTMLTextAreaElement;
        textareaScrollTop.value = t.scrollTop;
      };
      textarea.addEventListener('scroll', onScroll);
    }
  });
});
</script>

<style scoped>
.input-with-thumb {
  position: relative;
  overflow: hidden; /* 保证缩略图被输入框边界裁切 */
}
.input-with-thumb.has-thumb :deep(.el-textarea__inner) {
  padding-top: 56px; /* 40px 缩略图 + 16px 间距 */
}

.input-thumb-wrapper {
  position: absolute;
  top: 8px;
  left: 8px;
  pointer-events: none; /* 保证点击非图片区域可以聚焦输入框 */
  will-change: transform; /* 平滑跟随滚动 */
}

.input-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  pointer-events: auto; /* 图片本身可交互（tooltip、点击） */
}

.thumb-box {
  position: relative;
  width: 40px;
  height: 40px;
}

.thumb-box-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 1;
  pointer-events: auto;
}

.thumb-box-remove:hover {
  background: rgba(0, 0, 0, 0.7);
}
</style>
