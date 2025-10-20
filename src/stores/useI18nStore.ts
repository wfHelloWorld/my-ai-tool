import { defineStore } from "pinia";
import en from "../locales/en";
import zh from "../locales/zh";

export type Locale = "zh" | "en";

// 基于 Pinia 的极简 i18n 实现：
// - 目的：在打包环境中也能稳定提供模板/Options API 的 $t 翻译
// - 做法：将全局 $t 指向 store.t，绕过 vue-i18n 的全局注入不稳定问题
// - 与主进程 menu.ts 的翻译逻辑一致：通过点路径读取 messages

// 简易消息表：直接复用 src/locales 下的结构
const messages: Record<Locale, any> = {
  en,
  zh,
};

// 简易翻译器：按点路径查找，缺失时返回原始 key，避免页面显示空白
function translate(locale: Locale, key: string): string {
  const parts = key.split(".");
  let result: any = messages[locale];
  for (const p of parts) {
    result = result?.[p];
    if (result == null) return key;
  }
  return typeof result === "string" ? result : key;
}

export const useI18nStore = defineStore("i18n", {
  state: () => ({
    // 当前语言（与 config.json 的 language 字段保持一致）
    locale: "zh" as Locale,
  }),
  actions: {
    // 设置语言（由入口或设置页同步调用）
    setLocale(locale: Locale) {
      this.locale = locale;
    },
    // t 翻译函数（供模板中的 $t 与组件直接调用）
    t(key: string) {
      return translate(this.locale, key);
    },
  },
});