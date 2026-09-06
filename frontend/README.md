# Frontend Workspace (Role 2: Frontend Engineer / UI Developer)

> **Lead / Owner**: Gopal ([@gopal45-dev](https://github.com/gopal45-dev))  
> **Reviewer / Project Lead**: Pranjay Srivastava ([@PranjaySrivastava](https://github.com/PranjaySrivastava))

Welcome, **Gopal**! This directory houses the entire Next.js + React user interface, 3D avatar viewport, audio input capture, and dynamic algorithm visualization system.

---

## 🎯 Your Core Responsibilities & Deliverables

Based on the Hackathon specification (Page 6 of Architecture Guide):

### 1. User Interface & Layout (`src/app/`)

- **Next.js & Tailwind CSS**: Build the responsive main layout with voice controls, avatar viewport, code display panel, and algorithm visualization container.
- **Responsive Design**: Ensure full responsiveness across desktop, tablet, and mobile screens.
- **Session UI**: Display conversation history and allow reviewing previous Q&A turns.

### 2. Microphone & Audio Capture (`src/components/Audio/`)

- **Web Audio API**: Capture user audio stream from the browser microphone.
- **Visual Audio Meter**: Show real-time microphone level animation when the user speaks.
- **Streaming Input**: Transmit microphone audio to backend / AssemblyAI real-time transcription.

### 3. 3D Avatar Rendering & Lip-Sync (`src/components/Avatar/`)

- **Three.js Scene**: Render procedural 3D avatar model with head, eyes, and facial rig.
- **Expression Controller**: Animate facial states (`thinking`, `explaining`, `encouraging`) based on metadata from `ai-ml/lip-sync/expression_mapping.json`.
- **Phoneme Lip-Sync**: Animate avatar mouth movements in sync with speech using phoneme timings received from ElevenLabs TTS.

### 4. Algorithm Visualizer & Code Display (`src/components/Visualizer/`)

- **Dynamic Canvas / SVG**: Render step-by-step animations for:
  - Array & Sorting (QuickSort, MergeSort with element swap animations).
  - Trees & Graphs (node highlighting, edge traversal).
  - Two-Pointer demonstrations (moving pointer indicators).
- **Code Display**: Syntax-highlight code snippets using Highlight.js with active line highlighting synchronized to the avatar's explanation.

---

## 🛠️ Local Development Commands

```bash
# Navigate to frontend
cd frontend

# Run development server (http://localhost:3000)
npm run dev

# Run TypeScript type check (Required by PR check)
npm run type-check

# Run ESLint check (Required by PR check)
npm run lint

# Run Jest unit tests (Required by PR check)
npm test

# Test production build
npm run build
```

---

## 🚨 PR Check Requirements Before Merging

Before your PR can be merged to `main`:

1. `npm run type-check` must pass with 0 TypeScript errors.
2. `npm run lint` must pass with 0 ESLint warnings/errors.
3. `npm test` must pass all Jest component tests.
4. `npm run build` must compile Next.js without errors.
5. Approval required from `@PranjaySrivastava`.
