# brainstorming 使用示例

## 示例 1: 新功能设计

**输入**: topic = "开发用户标签管理系统"

**调用**: use_skill("brainstorming")

**过程**:
1. Agent 读取项目文件了解当前架构
2. Agent 提问「标签是全局的还是每个用户独立的？」
3. 用户确认后，Agent 提出 3 种方案
4. 用户选择方案 2，Agent 逐节呈现设计
5. 生成 spec 文档

**输出**: `docs/specs/YYYY-MM-DD-tag-system-design.md`