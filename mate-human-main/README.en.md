# Mate Human (mate-human)

A web real-time interactive digital human solution based on Live2D Cubism 5 and the Fay digital human framework.

## Project Overview

Mate Human is an open-source project that deeply integrates the Live2D Cubism 5 Web SDK with the Fay digital human AI framework. With this project, you can quickly build web-based digital human applications featuring real-time voice interaction, motion and expression driving, and AI-powered conversational capabilities.

## Demo

![Demo](images/效果展示.png)

## Technology Stack

- **Live2D Cubism SDK Web 5-r.4** – Industry-leading 2D digital human rendering engine
- **Fay Digital Human Framework** – AI-driven core system for digital humans
- **TypeScript** – Frontend development language
- **Python** – Backend AI services
- **WebGL** – Hardware-accelerated rendering

## Core Features

### Digital Human Rendering
- High-quality 2D character rendering powered by Live2D Cubism 5
- Support for expression, physics, and pose systems
- Smooth 60 FPS animation performance

### AI Interaction
- Speech recognition (ASR) with support for multiple backends
- Natural language processing and sentiment analysis
- Text-to-speech (TTS) output
- MCP tool integration for extensibility

### Motion Driving
- Automatic micro-motions (blinking, breathing, etc.)
- Lip-sync animation synchronized with speech
- Physics simulation (hair and clothing dynamics)
- Motion-emotion correlation

## Directory Structure

```
mate-human/
├── CubismSdkForWeb-5-r.4/     # Live2D Cubism Web SDK
│   ├── Core/                   # Core rendering library
│   ├── Framework/              # Framework components
│   └── Samples/                # Sample projects
│       └── TypeScript/Demo/    # TypeScript sample
├── Fay/                       # Fay Digital Human Framework
│   ├── ai_module/              # AI module (sentiment analysis)
│   ├── asr/                    # Speech recognition
│   ├── bionicmemory/           # Memory system
│   ├── core/                   # Core logic
│   ├── faymcp/                 # MCP tool service
│   └── docs/                   # Documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Modern browser (supports WebGL 2.0)

### Installation & Deployment

```bash
# 1. Clone the project
git clone https://gitee.com/garveyer/mate-human.git
cd mate-human

# 2. Install frontend dependencies
cd CubismSdkForWeb-5-r.4/Samples/TypeScript/Demo
npm install

# 3. Install backend dependencies
cd ../../../Fay
pip install -r requirements.txt

# 4. Start services
# Frontend
npm run start

# Backend (in a new terminal)
python fay_booter.py
```

### Configuration

Fay framework configuration is located at `Fay/cache_data/system.conf`. You can configure:
- ASR speech recognition service
- TTS text-to-speech service
- AI model parameters
- WebSocket port

## Sample Models

The project includes multiple preloaded Live2D models:
- **Haru** – Energetic girl
- **Hiyori** – Fresh-faced girl
- **Mao** – Cute cat
- **Mark** – Mature male
- **Natori** – Gentle male
- **Rice** – Energetic boy
- **Wanko** – Adorable puppy

## Advanced Features

### MCP Tool Integration

Integrate various AI tools into the digital human’s conversation via the FayMCP module:

```json
{
  "mcp_servers": [
    {
      "name": "Weather Query",
      "url": "http://localhost:8000"
    }
  ]
}
```

### Memory System

Leverage the BionicMemory module to enable long-term memory functionality:
- Vectorized storage of conversation history
- Intelligent retrieval and context association
- Personalized user profiling

### Emotion-Driven Behavior

Dynamically adjust the digital human’s behavior based on conversational sentiment:
- Facial expression changes
- Motion intensity
- Voice tone and pitch

## Documentation

For more detailed documentation, refer to:
- [Fay Digital Human Framework Documentation](./Fay/README.md)
- [Live2D Cubism SDK Documentation](./CubismSdkForWeb-5-r.4/README.md)
- [Memory Module Guide](./Fay/docs/memory_module.md)

## Open Source License

- **Live2D Cubism SDK**: [Live2D Proprietary Software License](./CubismSdkForWeb-5-r.4/LICENSE.md)
- **Fay Framework**: See [Fay/LICENSE](./Fay/LICENSE)

## Related Links

- [Live2D Official Website](https://www.live2d.com/)
- [Cubism SDK Download](https://www.live2d.com/download/)
- [Fay GitHub](https://github.com/TheRamU/Fay)

## Contribution Guidelines

Issues and pull requests are welcome!

---

*This project combines Live2D’s powerful 2D rendering technology with the Fay AI digital human framework to lower the barrier to developing digital human applications.*