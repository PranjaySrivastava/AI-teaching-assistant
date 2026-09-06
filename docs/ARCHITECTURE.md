# System Architecture

## Overview

The AI Teaching Assistant is an interactive, voice-first learning platform specifically designed for Data Structures & Algorithms. It combines real-time speech transcription, LLM pedagogical intelligence, procedural 3D avatar animation, and synchronized visual algorithm execution.

## End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Frontend as Next.js Frontend
    participant NodeAPI as Node.js Orchestration
    participant AAI as AssemblyAI
    participant LLM as Claude API
    participant TTS as ElevenLabs TTS
    participant DB as Firebase Context

    Student->>Frontend: Speaks question (Web Audio API)
    Frontend->>NodeAPI: Stream audio / transcription request
    NodeAPI->>AAI: Real-time speech-to-text
    AAI-->>NodeAPI: Transcribed text
    NodeAPI->>DB: Fetch previous session context & Q&A history
    DB-->>NodeAPI: Conversation history
    NodeAPI->>LLM: System prompt + History + Current Question
    LLM-->>NodeAPI: Explanation + Code + Visual Sequence JSON
    NodeAPI->>TTS: Generate speech audio + phoneme timestamps
    TTS-->>NodeAPI: Audio file + phoneme alignments
    NodeAPI->>DB: Save updated session memory
    NodeAPI-->>Frontend: WebSocket Stream: {audio, phonemes, code, visualSequence}
    Frontend->>Student: Avatar lip-syncs explanation + displays animated visualization
```

## Detailed 7-Step Workflow

1. **Student Asks Question**: Spoken through browser microphone via Web Audio API or entered as text.
2. **Backend Processing**: Node orchestration engine retrieves conversation history and builds pedagogical system prompt.
3. **Claude Generation**: Claude produces structured JSON with explanation text, executable code snippets, and step-by-step visual animation directives.
4. **TTS & Phoneme Extraction**: ElevenLabs returns speech audio and phoneme-level timings for lip synchronization.
5. **Frontend Rendering**: Three.js avatar moves mouth and changes facial expressions in sync with speech while algorithm steps animate on canvas.
6. **Context Storage**: Session memory is updated in Firebase.
7. **Follow-Up Ready**: Next student question retains context (e.g., "What if the array is already sorted?").
