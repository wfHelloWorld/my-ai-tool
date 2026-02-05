import fs from "fs/promises";
import path from "node:path";
import { lookup } from "mime-types";
import { nativeImage } from "electron";
import { FileService } from "../../services/fileService";

/**
 * 基于首图生成
 * 适配 wan2.6-i2v 的 Provider
 */
export interface Wan26I2VPayload {
  prompt?: string;
  negative_prompt?: string;
  template?: string; // 视频特效模板
  imagePath: string; // 必填，本地绝对路径
  audioPath?: string; // 选填，本地绝对路径
  
  model?: string; // wan2.6-i2v 等
  
  // 参数
  resolution?: "720P" | "1080P" | "480P";
  duration?: number;
  prompt_extend?: boolean;
  shot_type?: "single" | "multi";
  watermark?: boolean;
  seed?: number;

  apiKey?: string;
  createUrl?: string;
  taskBaseUrl?: string;
  
  clientId?: string;
  name?: string;
}

export type Wan26I2VProgress =
  | { stage: "prepared"; message: string; taskId?: string }
  | { stage: "uploading_audio"; percentage?: number; message?: string; taskId?: string }
  | { stage: "created"; taskId: string; status: string }
  | { stage: "poll"; try: number; status: string; taskId?: string }
  | { stage: "downloading"; url: string; outPath: string; taskId?: string }
  | { stage: "saved"; path: string; taskId?: string }
  | { stage: "failed"; taskId?: string; message: string }
  | { stage: "timeout"; taskId?: string }
  | { stage: "error"; taskId?: string; message: string };

interface VideoInputPayload {
  img_url: string;
  prompt?: string;
  negative_prompt?: string;
  template?: string;
  audio_url?: string;
}

interface VideoParameters {
  resolution?: "720P" | "1080P" | "480P";
  duration?: number;
  prompt_extend?: boolean;
  shot_type?: "single" | "multi";
  watermark?: boolean;
  seed?: number;
}

interface CreateTaskResponse {
  output?: { task_id?: string };
  code?: number;
  message?: string;
}

interface UploadPolicyResponse {
  data: OssPolicyData;
}

interface OssPolicyData {
  upload_dir: string;
  oss_access_key_id: string;
  signature: string;
  policy: string;
  x_oss_object_acl: string;
  x_oss_forbid_overwrite: string;
  upload_host: string;
}

interface PollResponse {
  output?: {
    task_status?: string;
    video_url?: string;
    code?: string;
    message?: string;
  };
}

export class Wanxiang26I2VProvider {
  private apiKey?: string;
  private fileService: FileService;

  constructor(opts: { apiKey?: string } = {}) {
    this.apiKey = opts.apiKey;
    this.fileService = new FileService();
  }

  /**
   * 执行生视流程
   */
  async generate(payload: Wan26I2VPayload, onProgress?: (info: Wan26I2VProgress) => void): Promise<string[]> {
    const apiKey = payload.apiKey || this.apiKey;
    if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未提供");

    const createUrl = payload.createUrl || "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
    const taskBaseUrl = payload.taskBaseUrl || "https://dashscope.aliyuncs.com/api/v1/tasks";
    
    onProgress?.({ stage: "prepared", message: "正在处理输入文件..." });

    // 1. 处理图片 (转Base64)
    if (!payload.imagePath) throw new Error("imagePath 必填");
    const imgBase64 = await this.fileToDataUrl(payload.imagePath);

    // 2. 处理音频 (上传OSS)
    let audioUrl: string | undefined = undefined;
    if (payload.audioPath) {
      onProgress?.({ stage: "uploading_audio", percentage: 0 });
      try {
        // 获取OSS Policy
        const policyData = await this.getUploadPolicy(apiKey, payload.model || "wan2.6-i2v");
        // 上传文件
        audioUrl = await this.uploadFileToOss(policyData, payload.audioPath);
        onProgress?.({ stage: "uploading_audio", percentage: 100, message: "音频上传成功" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`音频上传失败: ${msg}`);
      }
    }

    // 3. 构建请求体
    const model = payload.model || "wan2.6-i2v";
    const input: VideoInputPayload = {
      img_url: imgBase64,
    };
    if (payload.prompt) input.prompt = payload.prompt;
    if (payload.negative_prompt) input.negative_prompt = payload.negative_prompt;
    if (payload.template) input.template = payload.template;
    if (audioUrl) input.audio_url = audioUrl;

    const parameters: VideoParameters = {};
    if (payload.resolution) parameters.resolution = payload.resolution;
    if (payload.duration) parameters.duration = payload.duration;
    if (payload.prompt_extend !== undefined) parameters.prompt_extend = payload.prompt_extend;
    if (payload.shot_type) parameters.shot_type = payload.shot_type;
    if (payload.watermark !== undefined) parameters.watermark = payload.watermark;
    if (payload.seed !== undefined) parameters.seed = payload.seed;

    const body = {
      model,
      input,
      parameters,
    };

    console.log("[Wan26I2VProvider] calling API:", createUrl);
    
    // 4. 发起任务
    const resp = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
        ...(audioUrl ? { "X-DashScope-OssResourceResolve": "enable" } : {})
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Create task failed (${resp.status}): ${errText}`);
    }

    const respJson = await resp.json() as unknown as CreateTaskResponse;
    if (respJson.code) {
      throw new Error(`Create task API error: ${respJson.message || "Unknown"}`);
    }

    const taskId = respJson.output?.task_id;
    if (!taskId) throw new Error("No task_id returned");

    onProgress?.({ stage: "created", taskId, status: "PENDING" });

    // 5. 轮询
    const resultVideoUrl = await this.pollTask(taskBaseUrl, taskId, apiKey, onProgress);

    // 6. 下载
    onProgress?.({ stage: "downloading", url: resultVideoUrl, outPath: "", taskId });
    const savedPath = await this.fileService.saveVideoFromUrl(resultVideoUrl, `wan26-i2v-${taskId}.mp4`);
    onProgress?.({ stage: "saved", path: savedPath, taskId });

    return [savedPath];
  }

  private async fileToDataUrl(filePath: string): Promise<string> {
    if (filePath.startsWith("data:")) {
      return filePath;
    }

    const stat = await fs.stat(filePath);
    // Limit is ~19MB base64, so ~14MB binary.
    // Set a safe limit of 10MB to avoid API limits.
    const MAX_SIZE = 10 * 1024 * 1024;

    if (stat.size <= MAX_SIZE) {
      const buffer = await fs.readFile(filePath);
      const mime = lookup(filePath) || "application/octet-stream";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }

    // Too large, resize using nativeImage
    console.log(`[Wan26I2VProvider] Image too large (${stat.size} bytes), resizing...`);
    const image = nativeImage.createFromPath(filePath);
    if (image.isEmpty()) {
      throw new Error("Failed to load image for resizing");
    }

    const size = image.getSize();
    const maxDim = 2048; // Max dimension
    let newWidth = size.width;
    let newHeight = size.height;

    if (newWidth > maxDim || newHeight > maxDim) {
      if (newWidth > newHeight) {
        newHeight = Math.round(newHeight * (maxDim / newWidth));
        newWidth = maxDim;
      } else {
        newWidth = Math.round(newWidth * (maxDim / newHeight));
        newHeight = maxDim;
      }
    }

    // Resize and convert to JPEG
    const resized = image.resize({ width: newWidth, height: newHeight, quality: "better" });
    const jpegBuffer = resized.toJPEG(85);

    console.log(`[Wan26I2VProvider] Resized image to ${newWidth}x${newHeight}, size: ${jpegBuffer.length} bytes`);

    return `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
  }

  private async getUploadPolicy(apiKey: string, model: string): Promise<OssPolicyData> {
    const url = "https://dashscope.aliyuncs.com/api/v1/uploads";
    const params = new URLSearchParams({
      action: "getPolicy",
      model: model
    });
    
    const resp = await fetch(`${url}?${params.toString()}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    
    if (!resp.ok) throw new Error(`Get upload policy failed: ${await resp.text()}`);
    const json = await resp.json() as unknown as UploadPolicyResponse;
    return json.data;
  }

  private async uploadFileToOss(policyData: OssPolicyData, filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    const key = `${policyData.upload_dir}/${fileName}`;
    const fileBuffer = await fs.readFile(filePath);
    
    const formData = new FormData();
    formData.append("OSSAccessKeyId", policyData.oss_access_key_id);
    formData.append("Signature", policyData.signature);
    formData.append("policy", policyData.policy);
    formData.append("x-oss-object-acl", policyData.x_oss_object_acl);
    formData.append("x-oss-forbid-overwrite", policyData.x_oss_forbid_overwrite);
    formData.append("key", key);
    formData.append("success_action_status", "200");
    
    const arrayBuffer = new ArrayBuffer(fileBuffer.byteLength);
    new Uint8Array(arrayBuffer).set(fileBuffer);
    const blob = new Blob([arrayBuffer]);
    formData.append("file", blob, fileName);

    const resp = await fetch(policyData.upload_host, {
      method: "POST",
      body: formData
    });

    if (resp.status !== 200) {
      throw new Error(`Upload to OSS failed: ${await resp.text()}`);
    }

    return `oss://${key}`;
  }

  private async pollTask(
    baseUrl: string, 
    taskId: string, 
    apiKey: string,
    onProgress?: (info: Wan26I2VProgress) => void
  ): Promise<string> {
    let retry = 0;
    // Effectively infinite retry (user requested to remove timeout)
    const maxRetry = 1000000; 
    
    while (retry < maxRetry) {
      retry++;
      await new Promise(r => setTimeout(r, 2000)); // 2s interval

      try {
        const resp = await fetch(`${baseUrl}/${taskId}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        
        if (!resp.ok) {
           console.warn(`Poll task ${taskId} failed: ${resp.status}`);
           continue;
        }

    const json = await resp.json() as unknown as PollResponse;
    const status = json.output?.task_status;
        
        onProgress?.({ stage: "poll", try: retry, status: status || "UNKNOWN", taskId });

        if (status === "SUCCEEDED") {
          const videoUrl = json.output?.video_url;
          if (!videoUrl) throw new Error("Task succeeded but no video_url found");
          return videoUrl;
        } else if (status === "FAILED") {
          throw new Error(`Task failed: ${json.output?.code} - ${json.output?.message}`);
        } else if (status === "CANCELED") {
          throw new Error("Task canceled");
        }
        // RUNNING, PENDING, etc. -> continue
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Task failed") || msg.includes("Task canceled")) {
            throw err as Error;
        }
        console.warn(`Poll error: ${msg}`);
      }
    }
    
    onProgress?.({ stage: "timeout", taskId });
    throw new Error("Polling timeout");
  }
}
