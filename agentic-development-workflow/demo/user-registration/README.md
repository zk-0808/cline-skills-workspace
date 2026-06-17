# Demo: 用户注册功能（邮箱+密码）

## 概述

本 Demo 演示 Agentic Development Workflow System 的完整端到端流程：

从用户输入自然语言需求开始，依次通过 5 个 Skill 完成一个用户注册功能的开发。

## 需求

```
开发用户注册功能（邮箱+密码）
- 用户输入邮箱和密码完成注册
- 邮箱格式校验
- 密码强度要求（8位以上，含字母和数字）
```

## 流程

```
用户需求
   ↓
1. workflow_advisor → 推荐工作流
2. writing_plans → 出技术方案
3. executing_plans → 编码实现
4. requesting_code_review → 审查代码
5. verification_before_completion → 验证
```

## 前置条件

- MCP Server 已启动（16 个工具已加载）
- 项目路径：当前工作目录

## 预期结果

- 用户注册功能代码实现
- 包含邮箱校验、密码强度校验
- 通过代码审查无 Critical 问题
- 验证清单全部通过