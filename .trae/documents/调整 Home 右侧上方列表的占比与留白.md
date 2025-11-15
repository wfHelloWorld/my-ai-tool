## 目标
- 在右侧上方的历史对话区域左右各增加 5% 的留白，同时保持整体居中与现有功能不变。
- 不改动下方输入框（仍位于右侧底部 30% 区域）。

## 变更文件
- `src/views/Home.vue`

## 实现说明
- 将上方历史对话的容器添加水平留白：给 `div.h-full.overflow-y-auto` 增加 `px-[5%]`（或 `style="padding: 0 5%"`），实现左右各 5% 的空白。
- 保持现有垂直分割占比（上方自动、下方 30%），仅改变内容区的左右占用，不影响拖动与配置持久化。

## 代码示例
```vue
<el-splitter-panel>
  <div class="h-full overflow-y-auto px-[5%]">
    <ConversationList />
  </div>
</el-splitter-panel>
```

## 验证
- 右侧上方列表左右出现 5% 留白，内容视觉缩窄。
- 拖动左右/上下分割条正常；输入框与创建会话功能保持原状。