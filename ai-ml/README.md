# AI Prompt Engineer & ML Integration Workspace (Role 4 & Project Lead)

> **Lead / Owner**: Pranjay Srivastava ([@PranjaySrivastava](https://github.com/PranjaySrivastava))  
> **Role**: Project Lead & AI Prompt / ML Specialist

Welcome, **Pranjay**! This workspace contains prompt templates, speech recognition configurations, phoneme lip-sync mappings, and evaluation benchmark scripts for the AI Teaching Assistant.

---

## 🎯 Your Core Responsibilities & Deliverables

Based on the Hackathon specification (Page 8 of Architecture Guide):

### 1. Avatar Persona & System Prompt (`prompts/`)

- **System Prompt (`system_prompt.md`)**: Define Professor Ada's personality (patient, clear, encouraging, interactive), pedagogical rules, and output contract.
- **Few-Shot Prompt Engineering (`few_shot_examples.json`)**: Provide diverse few-shot demonstrations to ensure Claude reliably returns valid structured JSON (`explanation`, `code`, `visualSequence`).
- **Out-of-Scope Handling**: Prompt logic to politely redirect non-DS&A questions back to algorithms.

### 2. AssemblyAI Configuration (`assemblyai/`)

- **Domain Vocabulary (`domain_vocabulary.json`)**: Curate custom technical CS terms (e.g., _QuickSort_, _Dijkstra_, _AVL Tree_, _O(n log n)_) with high word-boost weights to maximize transcription accuracy.

### 3. Speech Synthesis & 3D Expression Mapping (`lip-sync/`)

- **Phoneme-to-Viseme Mapping (`expression_mapping.json`)**: Map ElevenLabs phonemes to 3D avatar facial blendshapes.
- **Sentiment / Mood Mapping**: Rules mapping teacher mood (`thinking` → eyes up/chin pose, `encouraging` → smile/head tilt, `explaining` → forward gesture) to Three.js avatar animations.

### 4. Evaluation & Demo Scenarios (`evals/`)

- **Benchmark Scenarios (`test_scenarios.json`)**: Maintain 10–15 end-to-end demo test scenarios covering easy, medium, and edge-case algorithm questions.
- **Response Quality & Latency**: Validate that LLM output is concise (<90 words) and latency remains under target (<2s).
