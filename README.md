
# 🎨 成语绘意 (IdiomCanvas)

> **基于 Google Gemini 2.5/3.0 系列模型的全自动成语连环画创作引擎**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![AI-Powered](https://img.shields.io/badge/AI-Gemini%203%20Pro-orange.svg)](https://ai.google.dev/)

**成语绘意** 是一个创新的开源项目，利用多智能体协作（MAS）逻辑，将枯燥的成语文本转化为包含 **精美分镜图片、动态视频演绎、以及多角色语音导读** 的沉浸式学习体验。

## ✨ 核心特性

- 🤖 **MAS 架构**: 模拟专业动画团队工作流（剧本、导演、画师、配音）。
- 👨‍👩‍👧‍👦 **全龄段适配**: 针对幼儿园、小学、中学、成年及老年人定制化的叙事和艺术风格。
- 🖼️ **视觉一致性**: 通过生成 "Visual Bible" 确保连环画角色和场景在四幕中保持高度一致。
- 🎬 **Veo 视频生成**: 自动捕捉故事高潮，生成电影感短片（需付费密钥）。
- 🎙️ **TTS 导读**: 针对不同年龄层匹配最合适的 AI 嗓音。
- 🔄 **自动重试机制**: 内置智能重试逻辑，确保在高并发或网络波动下生成成功率。

## 🚀 快速开始

### 1. 环境准备
确保你已拥有 [Google AI Studio](https://aistudio.google.com/) 的 API Key。

### 2. 安装运行
本应用采用纯 Web 架构，无需复杂后端配置：

```bash
# 访问部署地址或在本地启动测试
# 本地开发请确保环境变量 process.env.API_KEY 已配置
npm install
npm run dev
```

## 🏗️ 架构设计 (MAS Workflow)

1. **剧本解析 (ScriptAgent)**: 使用 `gemini-3-pro-preview` 解析成语背景，拆解为“起、承、转、合”四幕剧本。
2. **视觉导演 (DirectorAgent)**: 定义角色外观、艺术风格及色调，生成视觉基准文档。
3. **分镜创作 (ArtistAgent)**: 使用 `gemini-2.5-flash-image` 基于视觉基准批量绘制。
4. **媒体合成**: 同步生成 TTS 语音流，并可选调用 `veo-3.1-fast-generate-preview` 生成动画。

## 🤝 参与贡献

我们欢迎所有形式的贡献！无论是新功能的建议、代码优化还是文档修复。

---
*由 Gemini 3 Pro 强力驱动 | 为传播中国传统文化而生*
