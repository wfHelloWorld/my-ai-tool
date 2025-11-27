import fs from "fs/promises";
import os from "node:os";
import path from "node:path";

// ==== 基本配置（北京端点写死）====
const API_KEY = process.env.DASHSCOPE_API_KEY || "";
const endpoint = "https://dashscope.aliyuncs.com";
const createUrl = `${endpoint}/api/v1/services/aigc/image2image/image-synthesis`;

// ==== 命令行参数：提示词 + 本地图片路径 ====
const prompt = "将图片1和图片2拼接起来,1在上面";
const img1Path = "/Users/wf/Desktop/iShot_2025-07-19_23.51.06.png";
const img2Path = "/Users/wf/Desktop/iShot_2025-03-09_12.45.31.png";

// ==== 基本校验 ====
console.log("🚀 ~ API_KEY:", API_KEY)
console.log("🚀 ~ img1Path:", img1Path)
if (!API_KEY || !img1Path) {
    console.error("Usage: node qwen_wanxiang2.5.mjs <prompt> <image1Path> [image2Path] (env DASHSCOPE_API_KEY required)");
    process.exit(1);
}

// ==== 辅助：根据扩展名确定 MIME ====
const extToMime = (p) => {
    const lower = p.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".bmp")) return "image/bmp";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/png";
};

// ==== 本地文件转 Base64 DataURL（便于直接提交到 API）====
const fileToDataUrl = async (path) => {
    const mime = extToMime(path);
    console.log("[读图] 路径:", path, "MIME:", mime);
    const buf = await fs.readFile(path);
    const b64 = buf.toString("base64");
    return `data:${mime};base64,${b64}`;
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ==== HTTP POST（创建异步任务）====
const postJson = async (url, body) => {
    console.log("[POST]", url);
    console.log("[POST Body]", JSON.stringify(body).slice(0, 400), "...");
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
            "X-DashScope-Async": "enable",
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return resp.json();
};

// ==== HTTP GET（查询任务结果）====
const getJson = async (url) => {
    console.log("[GET]", url);
    const resp = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
        },
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return resp.json();
};

// ==== 下载生成图片到本地文件 ====
const downloadToFile = async (url, outPath = "/Users/wf/Downloads") => {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    console.log("[下载]", url, "=>", outPath);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Download failed ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    await fs.writeFile(outPath, buf);
    return outPath;
};

// ==== 主流程：创建任务 → 轮询结果 → 下载图片 ====
/**
 * 万相2.5 preview(单图编辑,多参考图生图)
 * @param {number} n 生成图片数量
 * @param {number} seed 随机种子
 * @param {boolean} watermark 是否添加水印
 * @param {string} size 图片尺寸
 * 推荐分边路以及高宽比:1280x1280：1:1, 1024x1024：1:1, 800x1200：2:3, 1200x800:：3:2, 960x1280：3:4, 1280x960：4:3, 720x1280：9:16, 1280x720：16:9, 1344x576：21:9,
 */
const run = async (n, seed, watermark, size) => {
    console.log("[配置] endpoint:", endpoint);
    console.log("[参数] prompt:", prompt);
    console.log("[参数] image1:", img1Path);
    if (img2Path) console.log("[参数] image2:", img2Path);
    console.log("[参数] n:", n);
    console.log("[参数] seed:", seed);
    console.log("[参数] watermark:", watermark);
    console.log("[参数] size:", size);



    const images = [await fileToDataUrl(img1Path)];
    if (img2Path) images.push(await fileToDataUrl(img2Path));

    const body = {
        model: "wan2.5-i2i-preview",
        input: {
            prompt,
            images,
        },
        parameters: {
            n: 1,
            seed: Math.floor(Math.random() * 2147483647),
            watermark: false,
        },
    };

    const created = await postJson(createUrl, body);
    console.log("[创建任务返回]", created);
    const taskId = created?.output?.task_id;
    if (!taskId) throw new Error("No task_id");
    const taskUrl = `${endpoint}/api/v1/tasks/${taskId}`;
    console.log("[任务ID]", taskId);

    let status = created?.output?.task_status || "PENDING";
    let tries = 0;
    while (status !== "SUCCEEDED" && status !== "FAILED" && tries < 60) {
        await sleep(10000);
        const r = await getJson(taskUrl);
        status = r?.output?.task_status || status;
        console.log(`[#${tries + 1}] 当前状态:`, status);
        if (status === "SUCCEEDED") {
            const results = r?.output?.results || [];
            console.log("[结果数量]", results.length);
            for (let i = 0; i < results.length; i++) {
                const u = results[i]?.url;
                if (u) {
                    const out = path.join(os.homedir(), "Downloads", `wan2.5_result_${Date.now()}_${i}.png`);
                    const saved = await downloadToFile(u, out);
                    console.log(saved);
                }
            }
            return;
        }
        if (status === "FAILED") {
            console.log("[失败详情]", r);
            throw new Error("Task failed");
        }
        tries++;
    }
    if (status !== "SUCCEEDED") throw new Error("Task timeout");
};

run().catch((e) => {
    console.error("[异常]", String(e?.message || e));
    process.exit(1);
});
// 测试指令 node qwen_wanxiang2.5.mjs