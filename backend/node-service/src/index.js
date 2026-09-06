const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { WebSocketServer } = require('ws');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'node-orchestration-service',
    timestamp: new Date().toISOString(),
  });
});

// Q&A / Ask endpoint stub
app.post('/api/ask', (req, res) => {
  const { question, sessionId = 'default-session' } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // Placeholder response for boilerplate
  return res.status(200).json({
    sessionId,
    question,
    answer: `Received question: "${question}". Backend orchestration is ready for AssemblyAI, Claude, and ElevenLabs integration.`,
    visualSequence: {
      type: 'algorithm_visualization',
      topic: 'data-structures-and-algorithms',
      steps: [],
    },
  });
});

const server = http.createServer(app);

// Real-time WebSocket server for streaming avatar speech and phonemes
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connection established' }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      ws.send(JSON.stringify({ type: 'ack', received: data }));
    } catch (_err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON payload' }));
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Node Orchestration Service running on port ${PORT}`);
  });
}

module.exports = { app, server };
