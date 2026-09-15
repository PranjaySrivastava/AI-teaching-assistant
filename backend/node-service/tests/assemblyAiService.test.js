const { AssemblyAiService } = require('../src/services/assemblyAiService');

describe('AssemblyAiService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the configured domain vocabulary and caches it', () => {
    const service = new AssemblyAiService({
      apiKey: '',
      vocabularyPath: '/path/that/does/not/exist.json',
    });

    const first = service.getDomainVocabulary();
    const second = service.getDomainVocabulary();

    expect(first).toContain('QuickSort');
    expect(second).toBe(first);
  });

  it('uses a mock token when no API key is configured', async () => {
    const service = new AssemblyAiService({ apiKey: '' });
    await expect(service.createTemporaryToken()).resolves.toMatchObject({
      token: 'mock-temp-token-dev-mode',
      mode: 'mock',
    });
  });

  it('posts transcription requests with boosted vocabulary', async () => {
    const service = new AssemblyAiService({ apiKey: 'test-key' });
    jest.spyOn(service, 'getDomainVocabulary').mockReturnValue(['QuickSort']);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'transcript-1', status: 'queued' }),
    });

    await expect(service.transcribeAudio('https://example.test/audio.mp3')).resolves.toEqual({
      id: 'transcript-1',
      status: 'queued',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.assemblyai.com/v2/transcript',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          audio_url: 'https://example.test/audio.mp3',
          word_boost: ['QuickSort'],
          boost_param: 'high',
        }),
      })
    );
  });

  it('falls back when AssemblyAI returns an error', async () => {
    const service = new AssemblyAiService({ apiKey: 'test-key' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(service.transcribeAudio('audio')).resolves.toMatchObject({
      mode: 'fallback',
      text: expect.stringContaining('quick sort'),
      error: 'AssemblyAI transcription error: 503',
    });
  });
});
