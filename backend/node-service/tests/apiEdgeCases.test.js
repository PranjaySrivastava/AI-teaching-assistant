const request = require('supertest');
const { app } = require('../src/index');

describe('API validation and failure handling', () => {
  it.each([{}, { question: '   ' }, { question: 123 }])(
    'rejects invalid ask payload %#',
    async (payload) => {
      const response = await request(app).post('/api/ask').send(payload);
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Question is required');
    }
  );

  it('rejects transcription without an audio URL', async () => {
    const response = await request(app).post('/api/transcribe').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('audioUrl is required');
  });

  it('returns the mock transcription response for a valid audio URL', async () => {
    const response = await request(app).post('/api/transcribe').send({ audioUrl: 'audio' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ mode: 'mock' });
    expect(response.body.text).toEqual(expect.any(String));
  });

  it('returns a default visual template for an unknown type', async () => {
    const response = await request(app).get('/api/visuals/template/not-a-template');
    expect(response.status).toBe(200);
    expect(response.body.steps.length).toBeGreaterThan(0);
  });
});
