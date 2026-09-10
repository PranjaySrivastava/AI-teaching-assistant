const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const config = require('./config');
const apiRoutes = require('./routes/api');
const { openRouterService } = require('./services/openRouterService');
const { visualEngineService } = require('./services/visualEngineService');
const { ttsService } = require('./services/ttsService');
const { sessionService } = require('./services/sessionService');

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'node-orchestration-service',
    timestamp: new Date().toISOString(),
    openRouter: {
      defaultModel: config.openRouter.defaultModel,
      glmModel: config.openRouter.glmModel,
      deepseekModel: config.openRouter.deepseekModel,
    },
  });
});

// Mount modular API routes under /api
app.use('/api', apiRoutes);

const server = http.createServer(app);

// Real-time WebSocket server for streaming avatar speech, phonemes, and visual steps
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.send(
    JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established with AI Teaching Assistant Orchestrator',
    })
  );

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      // If client requests real-time streaming answer
      if (data.type === 'ask_stream') {
        const { question, sessionId = 'ws-session', model } = data;

        if (!question) {
          ws.send(JSON.stringify({ type: 'error', message: 'Question is required' }));
          return;
        }

        ws.send(JSON.stringify({ type: 'status', message: 'Generating pedagogical response...' }));

        const history = sessionService.getContextHistory(sessionId);
        const llmResult = await openRouterService.generateTeachingResponse(
          question,
          history,
          model
        );
        const visualSeq = visualEngineService.normalizeSequence(llmResult.visualSequence, question);
        const ttsResult = await ttsService.synthesize(llmResult.explanation);

        // Update session
        sessionService.addMessage(sessionId, 'user', question);
        sessionService.addMessage(sessionId, 'assistant', llmResult.explanation, {
          code: llmResult.code,
          visualSequence: visualSeq,
        });

        // 1. Emit code immediately (t = 0s)
        ws.send(
          JSON.stringify({
            type: 'code_ready',
            timestamp: 0,
            code: llmResult.code,
          })
        );

        // 2. Emit speech audio and phoneme lip-sync timings
        ws.send(
          JSON.stringify({
            type: 'speech_ready',
            explanation: llmResult.explanation,
            audioUrl: ttsResult.audioUrl,
            phonemeTimings: ttsResult.phonemeTimings,
            mood: llmResult.mood,
          })
        );

        // 3. Emit step-by-step visual sequence for synchronized canvas animation (t >= 3s)
        ws.send(
          JSON.stringify({
            type: 'visual_sequence_ready',
            timestamp: 3000,
            visualSequence: visualSeq,
            suggestedFollowUps: llmResult.suggestedFollowUps,
          })
        );

        ws.send(JSON.stringify({ type: 'complete', sessionId }));
        return;
      }

      // Default ack
      ws.send(JSON.stringify({ type: 'ack', received: data }));
    } catch (_err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON payload' }));
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Node Orchestration Service running on port ${PORT}`);
    console.log(
      `OpenRouter Models: GLM (${config.openRouter.glmModel}) | DeepSeek (${config.openRouter.deepseekModel})`
    );
  });
}

module.exports = { app, server };
