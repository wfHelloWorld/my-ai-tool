<template>
  <!-- <div>MessageInput</div> -->
  <div class="w-full">
    <!-- 输入组件 -->
    <div class="flex items-center justify-center">
      <div class="w-[80%] flex items-center justify-center">
        <!-- 用 Icon代替问价上传组件 -->
        <input
          type="file"
          accept="image/*"
          class="hidden"
          ref="fileInput"
          @change="handleImageUpload"
        />
        <!-- 图片预览 -->
        <!-- elementPlus文字提示组件,展示选择的图片 -->
        <el-tooltip placement="top" effect="light">
          <template #content>
            <div v-if="imagePreview" class="mb-2 relative flex items-center">
              <img :src="imagePreview" alt="Preview" class="h-50" />
            </div>
            <el-text class="mx-1" type="info" size="small">文件大小不超过7M</el-text>
          </template>
          <Icon
            icon="radix-icons:image"
            width="24"
            height="24"
            :class="[
              'mr-2',
              disabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 cursor-pointer hover:text-gray-600',
            ]"
            @click="triggerFileInput"
          />
        </el-tooltip>
        <el-input
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          placeholder="Please input"
          :disabled="props.disabled"
          @keydown="handleKeydown"
        >
        </el-input>
        <el-button
          type="success"
          :loading="isLoading"
          @click="onCreate"
          :disabled="props.disabled"
        >
          <!-- 发送 -->
          {{ $t("common.send") }}
          <Icon
            icon="radix-icons:paper-plane"
            width="15"
            height="15"
            class="ml-1"
          />
        </el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
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
    const filePath = window.electronAPI.getFilePath(selectFirstImage);
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
</script>

<style></style>
