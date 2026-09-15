const { TtsService } = require('../src/services/ttsService');

describe('TtsService', () => {
  let service;

  beforeEach(() => {
    service = new TtsService({
      apiKey: '', // Empty key triggers fallback procedural phonemes
    });
  });

  it('should return empty audio and phonemes for empty text', async () => {
    const res = await service.synthesize('');
    expect(res.audioUrl).toEqual('');
    expect(res.phonemeTimings).toEqual([]);
  });

  it('should generate procedural phonemes for avatar lip-sync', async () => {
    const text = 'Quick sort works by partitioning an array';
    const res = await service.synthesize(text);

    expect(res.phonemeTimings.length).toBeGreaterThan(0);
    expect(res.phonemeTimings[0].phoneme).toBeDefined();
    expect(typeof res.phonemeTimings[0].start).toEqual('number');
    expect(typeof res.phonemeTimings[0].end).toEqual('number');
    expect(res.phonemeTimings[0].end).toBeGreaterThan(res.phonemeTimings[0].start);
  });

  it('should extract phonemes correctly from ElevenLabs alignment object', () => {
    const alignment = {
      characters: ['H', 'E', 'L', 'L', 'O'],
      character_start_times_seconds: [0.0, 0.05, 0.1, 0.15, 0.2],
      character_end_times_seconds: [0.05, 0.1, 0.15, 0.2, 0.25],
    };

    const extracted = service.extractPhonemesFromAlignment(alignment);
    expect(extracted.length).toEqual(5);
    expect(extracted[0].phoneme).toEqual('H');
    expect(extracted[0].start).toEqual(0.0);
    expect(extracted[0].end).toEqual(0.05);
  });
});
