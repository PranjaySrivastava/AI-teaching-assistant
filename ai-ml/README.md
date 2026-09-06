# AI Prompt Engineer & ML Integration Workspace (Role 4)

Welcome **AI Prompt Engineer / ML Specialist**! This workspace contains prompt templates, speech recognition configurations, phoneme lip-sync mappings, and evaluation scripts for the AI Teaching Assistant.

## Your Deliverables (Week 1–2)

1. **Prompt Engineering (`prompts/`)**:
   - `system_prompt.md`: Defines Professor Ada's personality (patient, clear, encouraging), pedagogical rules, and output contract.
   - `few_shot_examples.json`: Few-shot Claude examples enforcing the structured JSON output `{ explanation, code, visualSequence }`.
2. **AssemblyAI Speech Pipeline (`assemblyai/`)**:
   - `domain_vocabulary.json`: Custom vocabulary and word-boost configurations for technical CS terms (ensuring 85%+ accuracy on terms like _Dijkstra_, _QuickSort_, _amortized_).
3. **TTS & Avatar Lip-Sync (`lip-sync/`)**:
   - `phoneme_viseme_map.json`: Maps ElevenLabs phoneme timestamps to 3D facial blendshapes.
   - `expression_mapping.json`: Rules mapping teacher sentiment (e.g., thinking, encouraging, highlighting) to avatar animations.
4. **Model Evaluation & Testing (`evals/`)**:
   - `test_scenarios.json`: 10–15 benchmark prompt evaluation scenarios.
