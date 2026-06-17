# Step 4: Code Review

## 输入

```
requesting_code_review({
  code_or_diff: "[executing_plans 产生的代码]",
  review_focus: "full"
})
```

## 预期输出

结构化审查报告，包含：
- 检查清单（代码逻辑、安全、性能、架构）
- 问题分级：Critical / Important / Minor
- 审查结论

## 下一步

修复问题后，进入 [Step 5: verification](../5-verification.md)