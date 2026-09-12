/**
 * AssemblyAI Service
 * Real-time speech-to-text integration with CS domain vocabulary boost words.
 */

const fs = require('fs');
const config = require('../config');

class AssemblyAiService {
  constructor(customConfig = {}) {
    this.apiKey = customConfig.apiKey || config.assemblyAi.apiKey;
    this.vocabularyPath = customConfig.vocabularyPath || config.assemblyAi.vocabularyPath;
    this.cachedVocabulary = null;
  }

  /**
   * Load domain vocabulary words for boost parameter
   * @returns {string[]} List of boost words
   */
  getDomainVocabulary() {
    if (this.cachedVocabulary) {
      return this.cachedVocabulary;
    }

    try {
      if (fs.existsSync(this.vocabularyPath)) {
        const raw = fs.readFileSync(this.vocabularyPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.cachedVocabulary = parsed.word_boost || [];
        return this.cachedVocabulary;
      }
    } catch (err) {
      console.warn('Could not load domain vocabulary from file:', err.message);
    }

    // Fallback list of common CS/DSA terms
    this.cachedVocabulary = [
      'QuickSort',
      'MergeSort',
      'BubbleSort',
      'Binary Search',
      'BFS',
      'DFS',
      'Tree',
      'Graph',
      'Linked List',
      'Big-O',
    ];
    return this.cachedVocabulary;
  }

  /**
   * Generate temporary token for frontend direct WebSocket connection to AssemblyAI
   * Allows low-latency real-time streaming (<2s target)
   * @returns {Promise<{ token: string, expires_in?: number }>}
   */
  async createTemporaryToken() {
    if (!this.apiKey || this.apiKey === 'your_assemblyai_api_key_here') {
      return {
        token: 'mock-temp-token-dev-mode',
        mode: 'mock',
        expires_in: 600,
      };
    }

    try {
      const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ expires_in: 600 }),
      });

      if (!response.ok) {
        throw new Error(`AssemblyAI token error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('Failed to fetch AssemblyAI temporary token:', err.message);
      return {
        token: 'mock-temp-token-dev-mode',
        mode: 'mock',
        error: err.message,
      };
    }
  }

  /**
   * Transcribe recorded audio buffer or URL
   * @param {string} audioUrl
   */
  async transcribeAudio(audioUrl) {
    if (!this.apiKey || this.apiKey === 'your_assemblyai_api_key_here') {
      return {
        text: 'Explain how quick sort works with a simple example',
        confidence: 0.98,
        mode: 'mock',
      };
    }

    try {
      const boostWords = this.getDomainVocabulary();
      const response = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          word_boost: boostWords,
          boost_param: 'high',
        }),
      });

      if (!response.ok) {
        throw new Error(`AssemblyAI transcription error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('AssemblyAI transcription failed:', err.message);
      return {
        text: 'Explain how quick sort works with a simple example',
        error: err.message,
        mode: 'fallback',
      };
    }
  }
}

const assemblyAiService = new AssemblyAiService();

module.exports = {
  AssemblyAiService,
  assemblyAiService,
};
