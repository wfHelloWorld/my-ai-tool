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
              <el-text class="mx-1" type="info" size="small">文件大小不超过7M</el-text>
            </template>
            <Icon icon="radix-icons:image" width="24" height="24" :class="[
            'mr-2',
            props.disabled
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-400 cursor-pointer hover:text-gray-600',
          ]" @click="triggerFileInput" />
          </el-tooltip>
        </div>

        <!-- 在 el-input 内部显示图片缩略图（覆盖在内侧顶部），并在悬停时显示大图 tooltip -->
        <div class="relative flex-1 input-with-thumb self-start" :class="{ 'has-thumb': !!imagePreview }" ref="inputWithThumb">
          <el-input
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 3 }"
            placeholder="Please input"
            :disabled="props.disabled"
            @keydown="handleKeydown"
          >
          </el-input>

          <div v-if="imagePreview" class="input-thumb-wrapper" :style="{ transform: `translateY(-${textareaScrollTop}px)` }">
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
// 引入全局类型声明，确保 window.electronAPI 在该文件中可识别
import "../../interface.d.ts";

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
const MAX_SIZE = 7 * 1024 * 1024; // 10MB

let selectFirstImage: File | null = null;
let selectLastImage: File | null = null;
/**
 * 通过 `FIleReader` 方法来将`input`组件获取到的图片转换为base64格式,复赋值给 imagePreview
 */
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    // console.log(target.files[0]);
    selectFirstImage = target.files[0];

    // 文件大小检测
    if (selectFirstImage.size > MAX_SIZE) {
      // 提示用户文件过大
      ElMessage.error("上传图片大小不能超过 7MB");
      // 清空文件输入，防止残留
      target.value = "";
      return;
    }

    const reader = new FileReader();
    // onload 在文件读取完成后执行
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
      // console.log("e.target?.result:", e.target?.result);
    };
    // 开始读取文件
    reader.readAsDataURL(selectFirstImage);
  }
};

const input = ref("");
const isLoading = ref(false);

// 定义 emit
const emit = defineEmits<{
  create: [value: string, imagePath?: string];
}>();

const onCreate = () => {
  if (input.value.trim() === "") return;
  if (selectFirstImage) {
    // 在浏览器预览中 window.electronAPI 可能不存在，使用可选链避免报错
    const filePath = window.electronAPI?.getFilePath(selectFirstImage);
    emit("create", input.value, filePath);
  } else {
    emit("create", input.value);
  }
  input.value = ""; // 发送后清空输入框
  selectFirstImage = null // 清空图片选择
  imagePreview.value = '' // 清空预览图片
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); // 阻止默认换行
    onCreate();
  }
};

const removeImage = () => {
  selectFirstImage = null;
  imagePreview.value = '';
  // 清空 input[type=file] 的值，允许重新选择相同文件
  if (fileInput.value) {
    fileInput.value.value = '';
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
