

# Mate Human ( mate-human )

基于 Live2D Cubism 5 与 Fay 数字人框架的 Web 实时互动数字人解决方案。

## 项目简介

Mate Human 是一个将 Live2D Cubism 5 Web SDK 与 Fay 数字人 AI 框架深度集成的开源项目。通过本项目，您可以快速构建具有实时语音交互、动作表情驱动、AI 智能对话能力的 Web 数字人应用。

## 效果展示

![效果展示](images/效果展示.png)

## 技术栈

- **Live2D Cubism SDK Web 5-r.4** - 业界领先的 2D 数字人渲染引擎
- **Fay 数字人框架** - AI 驱动的数字人核心系统
- **TypeScript** - 前端开发语言
- **Python** - 后端 AI 服务
- **WebGL** - 硬件加速渲染

## 核心功能

### 数字人渲染
- 基于 Live2D Cubism 5 的高质量 2D 角色渲染
- 支持表情、物理、姿势系统
- 60 FPS 流畅动画表现

### AI 交互
- 语音识别 (ASR) 支持多种后端
- 自然语言处理与情感分析
- 语音合成 (TTS) 输出
- MCP 工具集成扩展

### 动作驱动
- 眨眼、呼吸等自动微动作
- 语音同步口型动画
- 物理模拟 (头发、服装飘动)
- 动作与情绪关联

## 目录结构

```
mate-human/
├── CubismSdkForWeb-5-r.4/     # Live2D Cubism Web SDK
│   ├── Core/                   # 核心渲染库
│   ├── Framework/              # 框架组件
│   └── Samples/                # 示例项目
│       └── TypeScript/Demo/    # TypeScript 示例
├── Fay/                       # Fay 数字人框架
│   ├── ai_module/              # AI 模块 (情感分析)
│   ├── asr/                    # 语音识别
│   ├── bionicmemory/           # 记忆系统
│   ├── core/                   # 核心逻辑
│   ├── faymcp/                 # MCP 工具服务
│   └── docs/                   # 文档
```

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.8+
- 现代浏览器 (支持 WebGL 2.0)

### 安装部署

```bash
# 1. 克隆项目
git clone https://gitee.com/garveyer/mate-human.git
cd mate-human

# 2. 安装前端依赖
cd CubismSdkForWeb-5-r.4/Samples/TypeScript/Demo
npm install

# 3. 安装后端依赖
cd ../../../Fay
pip install -r requirements.txt

# 4. 启动服务
# 前端
npm run start

# 后端 (新终端)
python fay_booter.py
```

### 配置说明

Fay 框架配置文件位于 `Fay/cache_data/system.conf`，可配置：
- ASR 语音识别服务
- TTS 语音合成服务
- AI 模型参数
- WebSocket 端口

## 示例模型

项目包含多个预置 Live2D 模型：
- **Haru** - 活力少女
- **Hiyori** - 清新女生
- **Mao** - 可爱猫咪
- **Mark** - 成熟男性
- **Natori** - 温柔男性
- **Rice** - 活力少年
- **Wanko** - 萌系小狗

## 高级玩法

### MCP 工具集成

通过 FayMCP 模块，可将各种 AI 工具集成到数字人对话中：

```json
{
  "mcp_servers": [
    {
      "name": "天气查询",
      "url": "http://localhost:8000"
    }
  ]
}
```

### 记忆系统

利用 BionicMemory 模块实现长期记忆功能：
- 对话历史向量化存储
- 智能检索与上下文关联
- 用户画像个性化

### 情绪驱动

根据对话情感动态调整数字人表现：
- 表情变化
- 动作幅度
- 语音语调

## 文档

更多详细文档请参考：
- [Fay 数字人框架文档](./Fay/README.md)
- [Live2D Cubism SDK 文档](./CubismSdkForWeb-5-r.4/README.md)
- [记忆模块说明](./Fay/docs/memory_module.md)

## 开源协议

- **Live2D Cubism SDK**: [Live2D Proprietary Software License](./CubismSdkForWeb-5-r.4/LICENSE.md)
- **Fay 框架**: 详见 [Fay/LICENSE](./Fay/LICENSE)

## 相关链接

- [Live2D 官方网站](https://www.live2d.com/)
- [Cubism SDK 下载](https://www.live2d.com/download/)
- [Fay GitHub](https://github.com/TheRamU/Fay)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

---

*本项目整合了 Live2D 强大的 2D 渲染技术与 Fay AI 数字人框架，旨在降低数字人应用开发门槛。*