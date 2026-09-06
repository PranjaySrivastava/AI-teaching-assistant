# API Documentation

## Node.js Orchestration Service

Base URL: `http://localhost:5000`

### 1. Health Check

- **Endpoint**: `GET /health`
- **Response**:

```json
{
  "status": "ok",
  "service": "node-orchestration-service",
  "timestamp": "2026-09-06T10:00:00.000Z"
}
```

### 2. Ask Question

- **Endpoint**: `POST /api/ask`
- **Payload**:

```json
{
  "question": "How does QuickSort work?",
  "sessionId": "session-123",
  "conversationHistory": []
}
```

- **Response**:

```json
{
  "sessionId": "session-123",
  "question": "How does QuickSort work?",
  "answer": "Quick sort works by partitioning an array...",
  "visualSequence": {
    "type": "algorithm_visualization",
    "topic": "quick-sort",
    "steps": []
  }
}
```

### 3. WebSocket Real-time Stream

- **URL**: `ws://localhost:5000`
- Used for real-time phoneme streaming and animated avatar mouth synchronization.
