const request = require('supertest');
const { app } = require('../src/index');

describe('Node Orchestration Service', () => {
  it('GET /health should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('ok');
    expect(res.body.service).toEqual('node-orchestration-service');
  });

  it('POST /api/ask should validate question presence', async () => {
    const res = await request(app).post('/api/ask').send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('Question is required');
  });

  it('POST /api/ask should accept question and return boilerplate response', async () => {
    const res = await request(app).post('/api/ask').send({ question: 'Explain QuickSort' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.question).toEqual('Explain QuickSort');
    expect(res.body.answer).toBeDefined();
    expect(res.body.visualSequence).toBeDefined();
  });
});
