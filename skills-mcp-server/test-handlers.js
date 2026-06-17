// Test script: 直接导入 handler 测试新 Skill 是否输出真实内容
import("./handlers/writing-plans.js").then(mod => {
  const result = mod.handler({
    objective: "实现用户注册 API（邮箱+密码+验证码）",
    constraints: "Node.js + Express + SQLite",
    output_format: "markdown"
  });
  const text = result.content[0].text;
  const hasRealContent = text.includes("const express") || text.includes("SQLite") || text.includes("users");
  const isEmpty = text.includes("当前状态：") && text.includes("目标状态：") && text.includes("差距分析：");
  console.log("=== writing-plans ===");
  console.log("有真实内容?", hasRealContent);
  console.log("是空白模板?", isEmpty);
  console.log("前200字:", text.substring(0, 200));
}).catch(e => console.error("FAIL:", e.message));