import { app } from "electron";
import path from "path";
import fs from "fs/promises";
import { AppConfig, DEFAULT_CONFIG } from "./types";

// 配置文件的完整路径，存放在 Electron 应用的用户数据目录下
const configPath = path.join(app.getPath("userData"), "config.json");
// macOS:
// ~/Library/Application Support/<YourAppName>
// 例如，如果你的应用名是 MyApp，路径可能是：
// /Users/你的用户名/Library/Application Support/MyApp

// Windows:
// C:\Users\<用户名>\AppData\Roaming\<YourAppName>
// 例如：
// C:\Users\你的用户名\AppData\Roaming\MyApp

// open /Users/wf/Library/Application Support/<Your App Name>

// // 执行下面这个打开文件再去手动寻找
// open /Users/wf/Library




// 当前内存中的配置，初始为默认配置的拷贝
let config = { ...DEFAULT_CONFIG };

export const configManager = {
  /**
   * 加载配置文件
   * - 尝试读取 config.json 文件并解析
   * - 如果文件不存在或读取失败，则保存默认配置到文件
   * @returns 当前配置对象
   */
  async getConfig() {
    try {
      const data = await fs.readFile(configPath, "utf-8");
      // 合并默认配置和文件中的配置，文件配置优先
      config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      // 读取失败（文件不存在等）时，保存默认配置
      await this.save();
    }
    return config;
  },

  /**
   * 保存当前配置到文件
   * @returns 当前配置对象
   */
  async save() {
    // 将配置对象格式化为 JSON 字符串写入文件
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return config;
  },

  /**
   * 更新配置
   * - 合并传入的新配置到当前配置
   * - 保存更新后的配置到文件
   * @param newConfig 配置的部分字段
   * @returns 更新后的完整配置对象
   */
  async update(newConfig: Partial<AppConfig>) {
    config = { ...config, ...newConfig };
    await this.save();
    return config;
  },

  /**
   * 获取当前内存中的配置对象
   * @returns 当前配置对象
   */
  get() {
    return config;
  },
};
