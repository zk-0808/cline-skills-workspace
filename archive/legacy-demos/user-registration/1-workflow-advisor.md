# Step 1: Workflow Advisor

## 输入

```
workflow_advisor({
  task_description: "开发用户注册功能（邮箱+密码）",
  workflow_type: "auto"
})
```

## 预期输出

```
## 🔵 推荐工作流: Feature (功能开发)

**任务**: 开发用户注册功能（邮箱+密码）
**工作流类型**: feature

---

### 执行步骤

  1. **writing_plans** — 出技术方案
  2. **executing_plans** — 编码实现
  3. **requesting_code_review** — 审查代码
  4. **verification_before_completion** — 验证
  5. **finishing_development_branch** — 提PR收尾

---

### 流程拓扑

```
writing_plans → executing_plans → requesting_code_review → verification_before_completion → finishing_development_branch
```

### 参数传递

writing_plans 的输出(方案)作为 executing_plans 的 plan 参数传入

> 💡 按以上顺序依次调用 Skill，前一步的输出作为后一步的输入。
```

## 下一步

进入 [Step 2: writing_plans](../2-writing-plans.md)