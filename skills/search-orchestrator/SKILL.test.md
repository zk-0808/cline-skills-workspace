# 测试: search-orchestrator

## TC-01: 正常输入

**输入**: 标准调用参数

**语义断言**:
  - must_contain_concept: ["search-orchestrator"]
  - llm_judge_prompt: "输出是否按预期执行了 search-orchestrator 的核心功能？"

## TC-02: 异常输入

**输入**: 空或无效参数

**语义断言**:
  - llm_judge_prompt: "输出是否给出了合理的错误提示或引导？"
