const request = require('supertest');
const { app } = require('../src/index');

describe('Node Orchestration Service', () => {
  it('GET /health should return status ok and OpenRouter model info', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('ok');
    expect(res.body.service).toEqual('node-orchestration-service');
    expect(res.body.openRouter).toBeDefined();
    expect(res.body.openRouter.glmModel).toBeDefined();
    expect(res.body.openRouter.deepseekModel).toBeDefined();
  });

  it('POST /api/ask should validate question presence', async () => {
    const res = await request(app).post('/api/ask').send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('Question is required');
  });

  it('POST /api/ask should accept question and return full multi-modal teaching response', async () => {
    const res = await request(app).post('/api/ask').send({
      question: 'Explain QuickSort with a simple example',
      sessionId: 'test-session-1',
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.sessionId).toEqual('test-session-1');
    expect(res.body.question).toEqual('Explain QuickSort with a simple example');
    expect(res.body.explanation).toBeDefined();
    expect(res.body.mood).toBeDefined();
    expect(res.body.code).toBeDefined();
    expect(res.body.code.language).toBeDefined();
    expect(res.body.visualSequence).toBeDefined();
    expect(res.body.visualSequence.steps.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.phonemeTimings)).toBe(true);
    expect(Array.isArray(res.body.suggestedFollowUps)).toBe(true);
  });
});
