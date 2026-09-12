/**
 * API Router
 * Endpoints for AI Teaching Assistant orchestration:
 * - /api/ask: Main multi-modal Q&A endpoint coordinating LLM (GLM/DeepSeek via OpenRouter),
 *             Visual Engine, and TTS lip-sync.
 * - /api/models: OpenRouter model configuration and selection
 * - /api/transcribe: Speech-to-text with domain vocabulary boost
 * - /api/tts: Standalone TTS and phoneme extraction
 * - /api/session: Conversation history management
 * - /api/visuals: Visual template sequences
 */

const express = require('express');
const { openRouterService } = require('../services/openRouterService');
const { visualEngineService } = require('../services/visualEngineService');
const { ttsService } = require('../services/ttsService');
const { assemblyAiService } = require('../services/assemblyAiService');
const { sessionService } = require('../services/sessionService');

const router = express.Router();

/**
 * POST /api/ask
 * Main orchestration endpoint
 */
router.post('/ask', async (req, res) => {
  try {
    const { question, sessionId = 'default-session', conversationHistory, model } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Retrieve previous conversation context if not directly passed in request
    const contextHistory =
      Array.isArray(conversationHistory) && conversationHistory.length > 0
        ? conversationHistory
        : sessionService.getContextHistory(sessionId);

    // 1. Generate pedagogical response via OpenRouter (GLM or DeepSeek)
    const llmResult = await openRouterService.generateTeachingResponse(
      question.trim(),
      contextHistory,
      model
    );

    const explanation = llmResult.explanation || 'Here is the step-by-step explanation.';
    const mood = llmResult.mood || 'explaining';
    const code = llmResult.code || { language: 'python', snippet: '' };
    const suggestedFollowUps = llmResult.suggestedFollowUps || [];
    const modelUsed = llmResult.modelUsed || 'default';

    // 2. Validate and enrich Visual Generation sequence
    const visualSequence = visualEngineService.normalizeSequence(
      llmResult.visualSequence,
      question
    );

    // 3. Synthesize speech and phonemes for avatar lip-sync
    const ttsResult = await ttsService.synthesize(explanation);

    // 4. Update session memory for follow-up conversation context
    sessionService.addMessage(sessionId, 'user', question.trim());
    sessionService.addMessage(sessionId, 'assistant', explanation, {
      code,
      visualSequence,
      audioUrl: ttsResult.audioUrl,
      phonemeTimings: ttsResult.phonemeTimings,
      modelUsed,
    });

    // 5. Return complete multi-modal payload matching frontend QuestionResponse schema
    return res.status(200).json({
      sessionId,
      question: question.trim(),
      answer: explanation,
      explanation,
      mood,
      audioUrl: ttsResult.audioUrl || '',
      phonemeTimings: ttsResult.phonemeTimings || [],
      code,
      visualSequence,
      suggestedFollowUps,
      modelUsed,
      fallbackMode: Boolean(llmResult.fallbackMode),
      ...(llmResult.warning ? { warning: llmResult.warning } : {}),
    });
  } catch (err) {
    console.error('Error in /api/ask orchestration:', err);
    return res.status(500).json({
      error: 'Internal server error processing question',
      message: err.message,
    });
  }
});

/**
 * GET /api/models
 * Returns available OpenRouter models (GLM, DeepSeek)
 */
router.get('/models', (req, res) => {
  const modelInfo = openRouterService.getAvailableModels();
  res.status(200).json(modelInfo);
});

/**
 * POST /api/transcribe
 * AssemblyAI Speech-to-text endpoint
 */
router.post('/transcribe', async (req, res) => {
  try {
    const { audioUrl } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ error: 'audioUrl is required' });
    }
    const result = await assemblyAiService.transcribeAudio(audioUrl);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Transcription failed', message: err.message });
  }
});

/**
 * GET /api/transcribe/token
 * Temporary token for real-time WebSocket connection to AssemblyAI
 */
router.get('/transcribe/token', async (req, res) => {
  try {
    const tokenData = await assemblyAiService.createTemporaryToken();
    return res.status(200).json(tokenData);
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'Failed to retrieve temporary token', message: err.message });
  }
});

/**
 * POST /api/tts
 * Synthesize speech and phonemes for arbitrary text
 */
router.post('/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const result = await ttsService.synthesize(text);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'TTS synthesis failed', message: err.message });
  }
});

/**
 * GET /api/session/:sessionId
 * Retrieve conversation history for context review
 */
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const history = sessionService.getSession(sessionId);
  res.status(200).json({ sessionId, history });
});

/**
 * DELETE /api/session/:sessionId
 * Reset session history
 */
router.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  sessionService.clearSession(sessionId);
  res.status(200).json({ status: 'ok', message: `Session ${sessionId} cleared` });
});

/**
 * GET /api/visuals/template/:type
 * Returns canonical algorithm visualization sequences (sorting, searching, tree, graph, complexity)
 */
router.get('/visuals/template/:type', (req, res) => {
  const { type } = req.params;
  const template = visualEngineService.generateTemplate(type, req.query.name || type);
  res.status(200).json(template);
});

module.exports = router;
