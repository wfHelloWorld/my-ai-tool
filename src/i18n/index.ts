import { createI18n } from "vue-i18n";
import en from "../locales/en";
import zh from "../locales/zh";

// 定义语言类型，限制只能为中文或英文
type LanguageType = "zh" | "en";

/**
 * 创建并导出i18n实例
 * 配置说明：
 * - legacy: false - 使用Vue 3的Composition API模式
 * - locale: "zh" - 默认语言设置为中文
 * - fallbackLocale: "en" - 回退语言设置为英文（当当前语言缺少翻译时使用）
 * - messages - 包含所有语言包的对象
 */
export const i18n = createI18n({
  legacy: false,
  locale: "zh",
  fallbackLocale: "en",
  messages: {
    en, // 英文语言包
    zh, // 中文语言包
  },
});

/**
 * 初始化i18n语言设置
 * 从electron主进程获取配置，并设置对应的语言
 */
export async function initI18n() {
  // 异步获取electron应用的配置信息
  const config = await window.electronAPI.getConfig();
  // 根据配置中的语言设置i18n
  setI18nLanguage(config.language);
}

/**
 * 设置i18n的当前语言
 * @param locale - 要设置的语言代码，只能是 "zh" 或 "en"
 *
 * 注意：在Composition API模式(legacy: false)下，
 * i18n.global.locale是一个ref对象，需要通过.value属性来修改值
 */
export function setI18nLanguage(locale: LanguageType) {
  // 使用.value赋值来更新当前语言
  i18n.global.locale.value = locale;
}
