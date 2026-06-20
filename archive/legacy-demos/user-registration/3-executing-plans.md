# Step 3: Executing Plans

## 输入

```
executing_plans({
  plan: "[writing_plans 的完整输出]",
  project_path: "./user-registration"
})
```

## 预期输出

执行跟踪日志，包含：
- 每个任务的执行状态（进行中/已完成）
- 代码创建/修改记录
- 验证步骤结果

## 下一步

将变更代码作为 code_or_diff 参数传入 [Step 4: code-review](../4-code-review.md)