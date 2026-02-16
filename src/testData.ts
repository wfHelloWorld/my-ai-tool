import { ConversationPorps, MessageProps, ProviderProps } from "./types";


export const providers: ProviderProps[] = [
  // {
  //   id: 1,
  //   name: "ERNIE-Speed-128K",
  //   title: "百度千帆(免费) ERNIE-Speed-128K",
  //   desc: "百度智能云提供的 ERNIE Speed 模型",
  //   avatar: "bx:basketball",
  //   createdAt: "2025-08-27T08:00:00Z",
  //   updatedAt: "2025-08-27T08:00:00Z",
  //   label: "百度智能云",
  // },
  // chat 文本模型
  {
    id: 1,
    name: "qwen-plus-latest",
    title: "通义千问 Plus(支持深度思考)",
    desc: "效果、速度、成本均衡",
    avatar: "bx:beer",
    createdAt: "2023-12-15T10:30:00Z",
    updatedAt: "2024-05-20T09:45:00Z",
    label: "阿里云百炼",
    type: "chat",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1"
  },
  {
    id: 2,
    name: "qwen-max-latest",
    title: "通义千问 Max(不支持深度思考)",
    desc: "适合复杂任务，能力最强",
    avatar: "bx:beer",
    createdAt: "2023-12-15T10:30:00Z",
    updatedAt: "2024-05-20T09:45:00Z",
    label: "阿里云百炼",
    type: "chat",
  },
  {
    id: 3,
    name: "deepseek-chat",
    title: "deepseek-chat(无联网,非思考模式)",
    desc: "deepseek官方接口",
    avatar: "bx:basketball",
    createdAt: "2025-08-27T08:00:00Z",
    updatedAt: "2025-08-27T08:00:00Z",
    label: "deepseek",
    type: "chat",
  },
  {
    id: 4,
    name: "deepseek-reasoner",
    title: "deepseek-reasoner(无联网,深入思考模式)",
    desc: "deepseek官方接口",
    avatar: "bx:basketball",
    createdAt: "2025-08-27T08:00:00Z",
    updatedAt: "2025-08-27T08:00:00Z",
    label: "deepseek",
    type: "chat",
  },

  // vision 识图模型
  {
    id: 5,
    name: "qwen-vl-plus",
    title: "千问识图qwen-vl-plus(不支持思考模式)",
    desc: "识图",
    avatar: "bx:beer",
    createdAt: "2023-12-15T10:30:00Z",
    updatedAt: "2024-05-20T09:45:00Z",
    label: "阿里云百炼",
    type: "vision",
  },
  {
    id: 6,
    name: "qwen3-vl-plus",
    title: "千问识图qwen3-vl-plus",
    desc: "识图",
    avatar: "bx:beer",
    createdAt: "2023-12-15T10:30:00Z",
    updatedAt: "2024-05-20T09:45:00Z",
    label: "阿里云百炼",
    type: "vision",
  },

  // imageGen 生图模型
  {
    id: 7,
    name: "wan2.5-i2i-preview",
    title: "万相2.5 preview(单图编辑,多参考图生图)",
    desc: "万相2.5",
    avatar: "bx:basketball",
    createdAt: "2025-08-27T08:00:00Z",
    updatedAt: "2025-08-27T08:00:00Z",
    label: "阿里云百炼",
    type: "imageGen",
    url: "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis"
  },
  {
    id: 8,
    name: "wan2.6-image",
    title: "通义万相2.6-图像生成",
    desc: "通义万相2.6-图像生成，全能图像生成模型，支持图文一体化推理生成，具备多图创意融合、商用级一致性、美学要素迁移与镜头光影精确控制，全面提升图像生成的一致性、可控性和表现力。",
    avatar: "bx:basketball",
    createdAt: "2025-08-27T08:00:00Z",
    updatedAt: "2025-08-27T08:00:00Z",
    label: "阿里云百炼",
    type: "imageGen",
    url: "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
  },

  // video 视频模型
  {
    id: 9,
    name: "wan2.6-i2v",
    title: "万相2.6（有声视频）",
    desc: "通义万相2.6-图生视频，智能分镜调度支持多镜头叙事，更高品质的声音生成，多人稳定对话，更自然真实音色，最高支持15秒时长生成",
    avatar: "bx:basketball",
    createdAt: "2025-08-27T08:00:00Z",
    updatedAt: "2025-08-27T08:00:00Z",
    label: "阿里云百炼",
    type: "video",
    url: "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis"
  },
  {
    id: 10,
    name: "wan2.2-kf2v-flash",
    title: "万相2.2极速版（无声视频）",
    desc: "基于首尾帧生成.较2.1模型速度提升50%，稳定性与成功率全面提升",
    avatar: "bx:basketball",
    createdAt: "2025-08-27T08:00:00Z",
    updatedAt: "2025-08-27T08:00:00Z",
    label: "阿里云百炼",
    type: "video",
    url: "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis"
  },
  {
    id: 11,
    name: "wanx2.1-i2v-plus",
    title: "万相2.1专业版（无声视频,特效）",
    desc: "基于首帧特效使用",
    avatar: "bx:basketball",
    createdAt: "2025-08-27T08:00:00Z",
    updatedAt: "2025-08-27T08:00:00Z",
    label: "阿里云百炼",
    type: "video",
    url: "POST https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis"
  },
];
