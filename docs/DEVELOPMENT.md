# Development Guide

This guide describes development practices for the 4 core roles on the team.

## Role 1: Backend Engineer (Node.js & APIs)

- Working directory: `backend/node-service/`
- Coordinate AssemblyAI WebSocket real-time transcription.
- Handle Claude prompts for structured visual outputs.
- Setup ElevenLabs phoneme extraction for avatar lip synchronization.

## Role 2: Frontend Engineer (Next.js & 3D Avatar)

- Working directory: `frontend/`
- Render 3D procedural avatar using Three.js in `src/components/Avatar/`.
- Handle Web Audio API voice recording with audio level indicators.
- Synchronize algorithm visual transitions with speech timestamps.

## Role 3: Content & Curriculum Developer

- Design Q&A pairs for common Data Structures & Algorithms.
- Formulate test cases and reference implementations in Python, JavaScript, and C++.
- Verify pedagogical clarity and step-by-step correctness of explanations.

## Role 4: AI Prompt & ML Engineer

- System prompt tuning in Claude for concise, teacher-like explanations.
- AssemblyAI domain dictionary configuration for DS&A terms (e.g., "Dijkstra", "AVL tree", "memoization").
- Map emotional states (thinking, encouraging, explaining) to 3D facial expressions.
