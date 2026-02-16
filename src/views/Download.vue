<template>
  <div class="h-full flex flex-col p-6">
    <el-text tag="h1" size="large">{{ i18nStore.t("common.download") }}</el-text>

    <el-tabs v-model="activeTab" class="mt-4">
      <el-tab-pane :label="i18nStore.t('download.imagesTab')" name="images" />
      <el-tab-pane :label="i18nStore.t('download.videosTab')" name="videos" />
    </el-tabs>

    <div class="mt-4 flex-1 min-h-0 overflow-y-auto">
      <div v-if="activeTab === 'images'" class="flex flex-col gap-3">
        <div class="mb-3 flex items-center gap-3">
          <el-button size="small" @click="openImagesDir">
            {{ i18nStore.t("download.openFolder") }}
          </el-button>
          <el-button size="small" :loading="loadingImages" @click="loadImages">
            {{ i18nStore.t("download.refresh") }}
          </el-button>
          <span v-if="imagesError" class="text-xs text-red-500">{{ imagesError }}</span>
        </div>
        <div class="border rounded p-2 bg-white">
          <div v-if="!loadingImages && images.length === 0" class="text-sm text-gray-500">
            {{ i18nStore.t("download.emptyImages") }}
          </div>
          <el-table
            v-else
            :data="images"
            size="small"
            border
            style="width: 100%"
          >
            <el-table-column
              :label="i18nStore.t('download.preview')"
              width="120"
            >
              <template #default="{ row }">
                <img
                  v-if="isImageFile(row.name)"
                  :src="toSafeFileUrl(row.path)"
                  class="w-16 h-16 object-cover rounded border"
                />
              </template>
            </el-table-column>
            <el-table-column prop="name" :label="i18nStore.t('download.fileName')" />
            <el-table-column prop="mtimeDisplay" :label="i18nStore.t('download.modified')" />
            <el-table-column prop="sizeDisplay" :label="i18nStore.t('download.size')" />
          </el-table>
        </div>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div class="mb-3 flex items-center gap-3">
          <el-button size="small" @click="openVideosDir">
            {{ i18nStore.t("download.openFolder") }}
          </el-button>
          <el-button size="small" :loading="loadingVideos" @click="loadVideos">
            {{ i18nStore.t("download.refresh") }}
          </el-button>
          <span v-if="videosError" class="text-xs text-red-500">{{ videosError }}</span>
        </div>
        <div class="border rounded p-2 bg-white">
          <div v-if="!loadingVideos && videos.length === 0" class="text-sm text-gray-500">
            {{ i18nStore.t("download.emptyVideos") }}
          </div>
          <el-table
            v-else
            :data="videos"
            size="small"
            border
            style="width: 100%"
          >
            <el-table-column
              :label="i18nStore.t('download.preview')"
              width="220"
            >
              <template #default="{ row }">
                <div v-if="isVideoFile(row.name)" class="flex flex-col gap-1">
                  <video
                    :src="toSafeFileUrl(row.path)"
                    :ref="el => setVideoRef(row.path, el as HTMLVideoElement | null)"
                    class="w-48 h-28 rounded border bg-black"
                  ></video>
                  <div class="flex items-center justify-between gap-2">
                    <el-button size="small" @click="togglePlay(row.path)">
                      <Icon :icon="playingMap[row.path] ? 'mdi:pause' : 'mdi:play'" />
                    </el-button>
                    <el-button size="small" @click="enterFullscreen(row.path)">
                      <Icon icon="mdi:fullscreen" />
                    </el-button>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="name" :label="i18nStore.t('download.fileName')" />
            <el-table-column prop="mtimeDisplay" :label="i18nStore.t('download.modified')" />
            <el-table-column prop="sizeDisplay" :label="i18nStore.t('download.size')" />
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useI18nStore } from "../stores/useI18nStore";

const i18nStore = useI18nStore();

type DownloadItem = {
  name: string;
  path: string;
  size: number;
  mtimeMs: number;
  isDirectory: boolean;
  mtimeDisplay?: string;
  sizeDisplay?: string;
};

const activeTab = ref<"images" | "videos">("images");
const images = ref<DownloadItem[]>([]);
const videos = ref<DownloadItem[]>([]);
const loadingImages = ref(false);
const loadingVideos = ref(false);
const imagesError = ref("");
const videosError = ref("");
const videoRefs = ref<Record<string, HTMLVideoElement | null>>({});
const playingMap = ref<Record<string, boolean>>({});

const toSafeFileUrl = (localPath: string) => {
  if (!localPath) return "";
  return `safe-file://render?path=${encodeURIComponent(localPath)}`;
};

const isImageFile = (name: string) => {
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name || "");
};

const isVideoFile = (name: string) => {
  return /\.(mp4|mov|m4v|webm|ogv|ogg)$/i.test(name || "");
};

const setVideoRef = (path: string, el: HTMLVideoElement | null) => {
  const next = { ...videoRefs.value };
  if (el) {
    next[path] = el;
  } else {
    delete next[path];
  }
  videoRefs.value = next;
};

const getVideo = (path: string) => {
  return videoRefs.value[path] || null;
};

const togglePlay = (path: string) => {
  const video = getVideo(path);
  if (!video) return;
  if (video.paused) {
    void video.play();
    playingMap.value = { ...playingMap.value, [path]: true };
  } else {
    video.pause();
    playingMap.value = { ...playingMap.value, [path]: false };
  }
};

const enterFullscreen = (path: string) => {
  const video = getVideo(path);
  if (!video) return;
  if (video.requestFullscreen) {
    void video.requestFullscreen();
  }
};

const formatSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = size;
  let idx = 0;
  while (n >= 1024 && idx < units.length - 1) {
    n /= 1024;
    idx += 1;
  }
  return `${n.toFixed(1)} ${units[idx]}`;
};

const mapItems = (items: DownloadItem[]): DownloadItem[] => {
  return items
    .filter((i) => !i.isDirectory)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .map((item) => ({
      ...item,
      mtimeDisplay: new Date(item.mtimeMs).toLocaleString(),
      sizeDisplay: formatSize(item.size),
    }));
};

const loadImages = async () => {
  loadingImages.value = true;
  imagesError.value = "";
  try {
    const res = await (window as any).electronAPI.listDownloadsImages();
    images.value = mapItems(res || []);
  } catch (e) {
    imagesError.value = String(e instanceof Error ? e.message : e);
  } finally {
    loadingImages.value = false;
  }
};

const loadVideos = async () => {
  loadingVideos.value = true;
  videosError.value = "";
  try {
    const res = await (window as any).electronAPI.listDownloadsVideos();
    videos.value = mapItems(res || []);
  } catch (e) {
    videosError.value = String(e instanceof Error ? e.message : e);
  } finally {
    loadingVideos.value = false;
  }
};

const openImagesDir = async () => {
  try {
    await (window as any).electronAPI.openDownloadsDir();
  } catch (e) {
    imagesError.value = String(e instanceof Error ? e.message : e);
  }
};

const openVideosDir = async () => {
  try {
    await (window as any).electronAPI.openVideosDir();
  } catch (e) {
    videosError.value = String(e instanceof Error ? e.message : e);
  }
};

onMounted(() => {
  loadImages();
  loadVideos();
});
</script>
