# Backend Workspace (Role 1: Backend Engineer / API Orchestrator)

> **Lead / Owner**: Salil ([@Salil-IND](https://github.com/Salil-IND))  
> **Reviewer / Project Lead**: Pranjay Srivastava ([@PranjaySrivastava](https://github.com/PranjaySrivastava))

Welcome, **Salil**! This directory houses the backend services responsible for orchestrating the AI pipeline, real-time audio streaming, speech-to-text, LLM generation, and text-to-speech synchronization.

---

## 🎯 Your Core Responsibilities & Deliverables

Based on the Hackathon specification (Page 5 of Architecture Guide):

### 1. API Orchestration (`backend/node-service/`)

- **Express & WebSocket Server**: Build and maintain the orchestration server coordinating:
  `AssemblyAI (STT) → Claude (LLM) → Visual Plan Generator → ElevenLabs (TTS)`
- **WebSocket Streaming**: Stream audio chunks, phoneme timestamps, and visual sequence steps to the frontend in real-time.
- **Latency Target**: Achieve `<2.0 second` latency from student question completion to the first visual and voice response.

### 2. AssemblyAI Real-Time Transcription

- Integrate AssemblyAI SDK / streaming WebSocket for live speech transcription.
- Apply custom domain vocabulary boost words from `ai-ml/assemblyai/domain_vocabulary.json` to ensure high transcription accuracy on CS terms.

### 3. Claude LLM Integration & Response Parsing

- Connect to Claude API (`@anthropic-ai/sdk` or REST) using the system prompt in `ai-ml/prompts/system_prompt.md`.
- Parse Claude's structured JSON response into:
  - `explanation`: Spoken dialogue for TTS.
  - `code`: Clean reference code.
  - `visualSequence`: Step-by-step animation instructions for the frontend canvas.

### 4. ElevenLabs TTS & Phoneme Lip-Sync

- Send Claude's explanation text to ElevenLabs TTS API.
- Extract audio stream and phoneme-level alignment timestamps for the frontend 3D avatar lip-sync engine.

### 5. Session Memory & Firebase Persistence

- Store session context (question history, past responses, generated visuals) in Firebase.
- Enable fluid follow-up conversations (e.g., student asks _"What if the array is already sorted?"_ and avatar remembers the preceding QuickSort explanation).

### 6. Error Handling & Fallbacks

- Implement graceful fallbacks for API rate limits and connection drops.

---

## 🛠️ Local Development Commands

```bash
# Navigate to Node backend service
cd backend/node-service

# Run development server with live reload
npm run dev

# Run ESLint (Required by PR check)
npm run lint

# Run Jest unit tests (Required by PR check)
npm test

# Run tests with coverage
npm run test:cov
```

---

## 🚨 PR Check Requirements Before Merging

Before your PR can be merged to `main`:

1. `npm run lint` must pass with 0 ESLint errors in `backend/node-service/`.
2. `npm test` must pass all Jest unit tests in `backend/node-service/tests/`.
3. Approval required from `@PranjaySrivastava`.
