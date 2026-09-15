/**
 * Text-to-Speech (TTS) Service
 * Integrates with ElevenLabs API with phoneme-level timing extraction for avatar lip-sync.
 * Includes fallback procedural phoneme generator when API key is not configured.
 */

const config = require('../config');

class TtsService {
  constructor(customConfig = {}) {
    this.apiKey = customConfig.apiKey || config.elevenLabs.apiKey;
    this.voiceId = customConfig.voiceId || config.elevenLabs.voiceId;
    this.modelId = customConfig.modelId || config.elevenLabs.modelId;
  }

  /**
   * Synthesize speech and extract phoneme timing for lip-sync
   * @param {string} text - Spoken explanation text
   * @returns {Promise<{ audioUrl: string, phonemeTimings: Array<{ phoneme: string, start: number, end: number }> }>}
   */
  async synthesize(text) {
    if (!text || typeof text !== 'string') {
      return { audioUrl: '', phonemeTimings: [] };
    }

    if (!this.apiKey || this.apiKey === 'your_elevenlabs_api_key_here') {
      return this.generateFallbackTts(text);
    }

    try {
      // ElevenLabs API with timestamps endpoint
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/with-timestamps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: this.modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        console.warn(
          `ElevenLabs API error (${response.status}): falling back to procedural phonemes`
        );
        return this.generateFallbackTts(text);
      }

      const data = await response.json();
      const base64Audio = data.audio_base64;
      const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

      // Format alignment data into phonemeTimings
      const phonemeTimings = this.extractPhonemesFromAlignment(data.alignment);

      return {
        audioUrl,
        phonemeTimings,
      };
    } catch (err) {
      console.warn('ElevenLabs synthesis failed:', err.message);
      return this.generateFallbackTts(text);
    }
  }

  /**
   * Convert ElevenLabs character/phoneme alignment into standardized phoneme timings
   * @param {Object} alignment - ElevenLabs alignment response { characters, character_start_times_seconds, character_end_times_seconds }
   */
  extractPhonemesFromAlignment(alignment) {
    if (!alignment || !Array.isArray(alignment.characters)) {
      return [];
    }

    const {
      characters,
      character_start_times_seconds = [],
      character_end_times_seconds = [],
    } = alignment;

    return characters.map((char, index) => ({
      phoneme: char.toUpperCase(),
      start: character_start_times_seconds[index] || index * 0.05,
      end: character_end_times_seconds[index] || (index + 1) * 0.05,
    }));
  }

  /**
   * Fallback procedural phoneme generator when ElevenLabs is offline or unconfigured
   * Calculates realistic phoneme timings based on average speaking rate (approx 150 words/min)
   * @param {string} text
   */
  generateFallbackTts(text) {
    const words = text.trim().split(/\s+/);
    const phonemeTimings = [];
    let currentTime = 0.0;
    const avgCharDuration = 0.065; // ~65ms per phoneme/character

    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '').toUpperCase();
      for (let i = 0; i < cleanWord.length; i++) {
        const start = Math.round(currentTime * 1000) / 1000;
        currentTime += avgCharDuration;
        const end = Math.round(currentTime * 1000) / 1000;
        phonemeTimings.push({
          phoneme: cleanWord[i],
          start,
          end,
        });
      }
      currentTime += 0.08; // Inter-word silence
    }

    return {
      audioUrl: '', // In dev mode, frontend can use browser SpeechSynthesis or procedural audio
      phonemeTimings,
      duration: Math.round(currentTime * 1000) / 1000,
      mode: 'procedural_fallback',
    };
  }
}

const ttsService = new TtsService();

module.exports = {
  TtsService,
  ttsService,
};
