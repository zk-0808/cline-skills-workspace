# 测试: handoff-protocol

## TC-01: 新会话开局应主动 resume

**输入**: 用户开新会话，第一句说"继续"

**语义断言**:
- must_contain_concept: ["handoff_resume", "复述 next_action", "do_not", "等用户确认"]
- llm_judge_prompt: "Agent 是否在第一条响应中调用了 handoff_resume，并主动把 next_action 和 do_not 复述给用户，让用户确认后再继续？"
- max_tokens: 800

**期望结果**：
1. Agent 第一条 thinking 中调用 `handoff_resume`
2. 收到结构化包后**复述 next_action 和 do_not**
3. 等用户确认（不擅自开干）

## TC-02: 会话结束应主动写入

**输入**: 用户在长任务进行到一半时说"今天先到这里"

**语义断言**:
- must_contain_concept: ["handoff_write", "goal", "completed", "next_action", "do_not"]
- llm_judge_prompt: "Agent 是否调用 handoff_write 并填入了 goal、completed、next_action？是否主动思考填 do_not（最有价值的字段）？"
- max_tokens: 600

**期望结果**：
1. Agent 调用 `handoff_write`
2. 至少包含 goal + next_action（首次必填）
3. 主动整理 completed 和 do_not（即使用户没明说）

## TC-03: status=blocked 缺 blocked_by 应报错

**输入**: 用户说"我等设计稿，先 blocked 一下"，Agent 调 `handoff_write { status: "blocked" }` 但忘记传 blocked_by

**语义断言**:
- must_contain_concept: ["BLOCKED_REQUIRES_REASON", "blocked_by"]
- must_not_contain: ["✅", "已创建"]
- llm_judge_prompt: "返回是否明确报 BLOCKED_REQUIRES_REASON 错误，并提示需要 blocked_by 数组？"

**期望结果**：返回错误码 `BLOCKED_REQUIRES_REASON`，不写入文件

## TC-04: 单 quick fix 不应触发 handoff

**输入**: 用户问"如何用 PowerShell 列出当前目录？"

**语义断言**:
- must_not_contain: ["handoff_write", "handoff_resume"]
- llm_judge_prompt: "Agent 是否避免调用 handoff 工具，因为这是无状态变化的简单查询？"

**期望结果**：直接回答，不调 handoff（避免噪音）

## TC-05: stale handoff 应等用户确认

**输入**: 用户在第 20 天回到项目，调 `handoff_resume`

**语义断言**:
- must_contain_concept: ["STALE_HANDOFF", "confirm_stale", "天未更新"]
- llm_judge_prompt: "Agent 是否把 STALE_HANDOFF 错误原样展示，等用户决定是否传 confirm_stale: true？是否避免擅自接受 stale handoff？"

**期望结果**：
1. 收到 STALE_HANDOFF 错误
2. 把错误信息透传给用户
3. **不擅自重试** confirm_stale: true，等用户判断