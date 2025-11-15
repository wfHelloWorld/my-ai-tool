## 目标
- 保持 MessageInputChat 功能完全不变（props、事件、压缩/预览逻辑等），仅调整布局。
- 首页使用左右可拖动分割（右侧初始 30% 宽），右侧再上下分割（底部为输入框，初始 30% 高）。
- 在配置中新增右侧占比参数并持久化，拖动后写回配置；页面加载读取配置作为默认值。

## 变更文件
- `src/views/Home.vue`
- `src/types.ts`（为配置类型与默认值扩展一个字段）
- `src/config.ts`（无需逻辑改动，读取/更新沿用 `configManager`）

## 配置扩展
- 在 `src/types.ts` 的 `AppConfig` 与 `DEFAULT_CONFIG` 中新增：
  - `homeRightPanePercent: number`（默认 `30`）。
- 不改变现有语言/字体/KEY 配置；`configManager` 已支持读写新增字段，无需其他改动。

## 页面布局调整（Home.vue）
- 顶层容器保持 `h-full`。
- 外层使用 Element Plus Splitter（水平）：
  - 左侧面板：保留现有 Provider 选择区（`ProviderSelect` 与 `currentProdiver` 逻辑不变）。
  - 右侧面板：使用嵌套 Splitter（垂直）：
    - 上面板：引入并渲染 `ConversationList.vue`，高度随分割自动调整，支持滚动。
    - 下面板：渲染 `MessageInputChat`，占右侧底部 30% 高度。
- 将右侧宽度的初始 `size` 绑定到 `homeRightPanePercent`：
  - `v-model:size="rightPaneSize"`，初始值来自 `getConfig()`，格式为百分比字符串（例如 `"30%"`）。
  - 在 `update:size`（或 `@resize-end`）时，将新的值转换为百分比并调用 `window.electronAPI.updateConfig({ homeRightPanePercent })` 持久化。

## 关键实现点
- 读取配置：在 `onMounted` 中 `const cfg = await window.electronAPI.getConfig()`，设置 `rightPaneSize = cfg.homeRightPanePercent + '%'`。
- 持久化拖动结果：
  - `update:size` 事件回调拿到新值 `val`（可能是字符串百分比或像素值）。
  - 若为像素值，使用外层 Splitter 容器宽度计算百分比：`Math.round(val / containerWidth * 100)`。
  - 写回配置：`await window.electronAPI.updateConfig({ homeRightPanePercent: percent })`。
- 右侧上下分割：`layout="vertical"`，底部面板 `size="30%"`，允许拖动调整但不写入配置（按你的要求仅持久化左右占比）。
- 保持 `MessageInputChat` 交互：`@create="createConversation"` 与 `:disabled="currentProdiver === ''"` 维持不变；不修改其文件。

## 验证
- 打开 Home：右侧宽度为配置占比（默认为 30%）。
- 拖动左右分割条：松开后再次进入页面仍保持新占比（已写入配置）。
- 右侧顶部显示历史对话（`ConversationList.vue`），底部显示输入框；上下拖动仅影响右侧内部高度。
- 发送消息与图片逻辑保持原样（参考 `src/components/MessageInputChat.vue`）。

## 可能的边界处理
- 最小/最大宽度：为左右面板设置 `min`（例如左侧 `min="300"`，右侧 `min="260"`）以避免过小导致布局拥挤。
- 懒更新：如需拖动更流畅可设置 `lazy`，并在 `resize-end` 时持久化，避免频繁写文件。

确认后我将按照以上方案实现代码修改与类型扩展，并确保不触碰 `MessageInputChat.vue` 的功能逻辑。