# Step 2: Writing Plans

## 输入

```
writing_plans({
  objective: "用户注册功能（邮箱+密码）",
  constraints: "邮箱格式校验，密码8位以上含字母和数字"
})
```

## 预期输出

技术方案文档，包含：
- 文件结构规划（register.html, register.js, style.css）
- 任务拆分（HTML结构、表单校验、样式）
- 每个任务 2-5 分钟，精确到代码块

## 下一步

将输出作为 plan 参数传入 [Step 3: executing_plans](../3-executing-plans.md)