# Step 5: Verification

## 输入

```
verification_before_completion({
  task_summary: "用户注册功能开发完成",
  requirements: "开发用户注册功能（邮箱+密码）\n- 用户输入邮箱和密码完成注册\n- 邮箱格式校验\n- 密码强度要求（8位以上，含字母和数字）",
  changed_files: "register.html, register.js, style.css",
  strict_mode: true
})
```

## 预期输出

完成前验证清单，包含：
- 需求满足检查 ✅
- 测试检查 ✅
- 代码质量检查 ✅
- 集成检查 ✅
- 文档检查 ✅

## 结果

所有检查通过后，声明完成。