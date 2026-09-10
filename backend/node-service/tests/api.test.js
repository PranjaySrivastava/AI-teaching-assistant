const request = require('supertest');
const { app } = require('../src/index');

describe('API Routes Integration', () => {
  describe('GET /api/models', () => {
    it('should list OpenRouter GLM and DeepSeek models', async () => {
      const res = await request(app).get('/api/models');
      expect(res.statusCode).toEqual(200);
      expect(res.body.glmModel).toBeDefined();
      expect(res.body.deepseekModel).toBeDefined();
      expect(Array.isArray(res.body.models)).toBe(true);

      const hasGlm = res.body.models.some((m) => m.family === 'glm');
      const hasDeepseek = res.body.models.some((m) => m.family === 'deepseek');
      expect(hasGlm).toBe(true);
      expect(hasDeepseek).toBe(true);
    });
  });

  describe('POST /api/ask with model selection', () => {
    it('should accept model parameter "glm"', async () => {
      const res = await request(app).post('/api/ask').send({
        question: 'Explain Binary Search',
        model: 'glm',
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body.modelUsed).toContain('glm');
      expect(res.body.visualSequence).toBeDefined();
    });

    it('should accept model parameter "deepseek"', async () => {
      const res = await request(app).post('/api/ask').send({
        question: 'Explain BFS graph traversal',
        model: 'deepseek',
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body.modelUsed).toContain('deepseek');
    });
  });

  describe('GET and DELETE /api/session/:sessionId', () => {
    it('should store and clear session history across requests', async () => {
      const sessionId = 'session-test-flow';

      // Ask question 1
      await request(app).post('/api/ask').send({
        question: 'Explain QuickSort',
        sessionId,
      });

      // Retrieve session
      const getRes = await request(app).get(`/api/session/${sessionId}`);
      expect(getRes.statusCode).toEqual(200);
      expect(getRes.body.history.length).toBeGreaterThanOrEqual(2);

      // Clear session
      const delRes = await request(app).delete(`/api/session/${sessionId}`);
      expect(delRes.statusCode).toEqual(200);

      // Verify empty after clearing
      const emptyRes = await request(app).get(`/api/session/${sessionId}`);
      expect(emptyRes.body.history.length).toEqual(0);
    });
  });

  describe('GET /api/visuals/template/:type', () => {
    it('should return visual template for sorting', async () => {
      const res = await request(app).get('/api/visuals/template/sorting');
      expect(res.statusCode).toEqual(200);
      expect(res.body.type).toEqual('algorithm_visualization');
      expect(res.body.steps.length).toBeGreaterThan(0);
    });

    it('should return visual template for trees', async () => {
      const res = await request(app).get('/api/visuals/template/tree');
      expect(res.statusCode).toEqual(200);
      expect(res.body.type).toEqual('data_structure');
    });
  });

  describe('POST /api/tts', () => {
    it('should return phoneme timings for input text', async () => {
      const res = await request(app).post('/api/tts').send({
        text: 'Binary Search runs in logarithmic time',
      });
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body.phonemeTimings)).toBe(true);
      expect(res.body.phonemeTimings.length).toBeGreaterThan(0);
    });

    it('should validate missing text', async () => {
      const res = await request(app).post('/api/tts').send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('text is required');
    });
  });

  describe('GET /api/transcribe/token', () => {
    it('should return temporary token for AssemblyAI streaming', async () => {
      const res = await request(app).get('/api/transcribe/token');
      expect(res.statusCode).toEqual(200);
      expect(res.body.token).toBeDefined();
    });
  });
});
