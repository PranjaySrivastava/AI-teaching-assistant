<div align="center">

# 🎓 AI Teaching Assistant

### Interactive Voice-First 3D Avatar Learning Platform for DS&A

[![CI - PR Checks](https://img.shields.io/badge/CI-Passing-10b981?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/pr-checks.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AssemblyAI](https://img.shields.io/badge/AssemblyAI-Voice%20Agent-6842FF?style=for-the-badge&logo=soundcharts&logoColor=white)](https://www.assemblyai.com/)
[![Code Style: Prettier](https://img.shields.io/badge/Code%20Style-Prettier-ff69b4?style=for-the-badge&logo=prettier&logoColor=white)](https://prettier.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Built for the AssemblyAI Voice Agent Hackathon</b><br>
  Transforming Data Structures & Algorithms learning with real-time speech transcription, intelligent LLM reasoning, 3D animated lip-sync, and synchronized step-by-step algorithm visualizations.
</p>

[Explore Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [Team Roles](#-team-structure--roles) • [Docs](docs/) • [Contribution Guidelines](docs/CONTRIBUTING.md)

---

</div>

## 🎯 The Core Concept

**One Question → Instant Intelligent Response → Visual & Voice Explanation**

When a student asks a question about Data Structures & Algorithms:

1. **Speech-to-Text**: [AssemblyAI](https://www.assemblyai.com/) captures and transcribes spoken questions in real-time.
2. **AI Reasoning**: Claude LLM constructs a personalized, pedagogical response with step-by-step logic.
3. **Dynamic Visuals**: The visual engine generates real-time SVG/Canvas algorithm visualizers and syntax-highlighted code.
4. **Speech & 3D Avatar**: ElevenLabs generates natural voice audio with phoneme timing, driving synchronized 3D avatar lip-sync and facial expressions.
5. **Context Memory**: Firebase session memory preserves conversation history for fluid follow-up inquiries.

---

## 🏗️ System Architecture

```
[Student Voice / Text Input]
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                       │
│  - Web Audio API microphone capture                         │
│  - Three.js 3D Avatar rendering & expression controller     │
│  - Dynamic Canvas / SVG Algorithm Visualizer                │
│  - Highlight.js code preview & session history              │
└───────────────────────────┬─────────────────────────────────┘
                            │ WebSocket / REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js Orchestration Service               │
│  - AssemblyAI real-time transcription pipeline              │
│  - Claude API system prompt & structured JSON generation    │
│  - ElevenLabs TTS phoneme alignment generator               │
│  - Firebase session context memory management               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Python ML & Speech Service                  │
│  - Advanced speech processing & audio streaming             │
│  - Algorithm state machine calculations                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `v18.x` or `v20.x+`
- **Python**: `3.10+`
- **npm**: `v9+`

### 1. Installation

Run the automated installation script or use npm workspaces:

```bash
# Clone the repository
git clone <repo-url>
cd assembly-ai

# Install all dependencies (Frontend, Node backend, Python service)
npm run install-all
```

### 2. Environment Configuration

Create `.env` files in `backend/node-service/` and `frontend/`:

**`backend/node-service/.env`**:

```env
PORT=5000
ASSEMBLYAI_API_KEY=your_assemblyai_key
ANTHROPIC_API_KEY=your_claude_api_key
ELEVENLABS_API_KEY=your_elevenlabs_key
FIREBASE_CONFIG=your_firebase_json
```

**`frontend/.env.local`**:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

### 3. Running Locally

Run both the frontend and backend development servers concurrently:

```bash
# Start frontend (http://localhost:3000)
npm run dev

# Or start all services
npm run dev:all
```

---

## 🧪 Automated Testing & CI Quality Gates

This repository enforces automated checks via GitHub Actions on every Pull Request:

- **`pr-checks.yml`**: TypeScript type-check, ESLint, Prettier, Flake8, Black, and isort.
- **`frontend-tests.yml`**: Next.js unit tests, production build verification, Lighthouse CI, and accessibility (a11y) checks.
- **`backend-tests.yml`**: Pytest (Python 3.9–3.11) and Jest (Node 16–20) test suites with code coverage reporting.

To run tests locally:

```bash
# Run all frontend and backend tests
npm test

# Run code linter
npm run lint

# Check TypeScript types
npm run type-check

# Check Prettier formatting
npm run format:check
```

---

## 👥 Team Structure & Roles

- **Project Lead & AI/ML Engineer**: **Pranjay Srivastava** ([@PranjaySrivastava](https://github.com/PranjaySrivastava)) — Overall project architecture, Claude/LLM prompt orchestration, AssemblyAI domain vocabularies, and phoneme lip-sync mapping.
- **Backend Engineer**: **Salil** ([@Salil-IND](https://github.com/Salil-IND)) — Node.js Express REST & WebSocket orchestration service, API streaming, and data persistence.
- **Frontend Engineer**: **Gopal** ([@gopal45-dev](https://github.com/gopal45-dev)) — Next.js user interface, Three.js 3D avatar rendering, Web Audio API voice capture, and algorithm visualization canvas.
- **Content & Curriculum Developer**: **Aaarav Bhatnagar** — DS&A curriculum design, 50+ Q&A benchmark dataset, visual animation specs, and multi-language code snippets.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
