# Development Guide

This guide describes development practices for the 4 core roles on the team.

## Role 1: Backend Engineer (Salil - @Salil-IND)

- Working directory: `backend/node-service/`
- Coordinate AssemblyAI WebSocket real-time transcription.
- Handle Claude / LLM prompts for structured visual outputs.
- Setup ElevenLabs phoneme extraction for avatar lip synchronization.

## Role 2: Frontend Engineer (Gopal - @gopal45-dev)

- Working directory: `frontend/`
- Render 3D procedural avatar using Three.js in `src/components/Avatar/`.
- Handle Web Audio API voice recording with audio level indicators.
- Synchronize algorithm visual transitions with speech timestamps.

## Role 3: Content & Curriculum Developer (Aaarav Bhatnagar)

- Working directory: `content/`
- Design Q&A pairs for common Data Structures & Algorithms.
- Formulate test cases and reference implementations in Python, JavaScript, and C++.
- Verify pedagogical clarity and step-by-step correctness of explanations.

## Role 4: Project Lead & AI-ML Engineer (Pranjay Srivastava - @PranjaySrivastava)

- Working directory: `ai-ml/`
- Overall project architecture and integration lead.
- System prompt tuning for concise, teacher-like explanations.
- AssemblyAI domain dictionary configuration for DS&A terms (e.g., "Dijkstra", "AVL tree", "memoization").
- Map emotional states (thinking, encouraging, explaining) to 3D facial expressions.
