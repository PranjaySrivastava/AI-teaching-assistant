const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // OpenRouter Configuration
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    siteUrl:
      process.env.OPENROUTER_SITE_URL || 'https://github.com/Salil-IND/AI-teaching-assistant',
    siteName: process.env.OPENROUTER_SITE_NAME || 'AI Teaching Assistant',
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'deepseek/deepseek-chat',
    // GLM Models supported via OpenRouter
    glmModel: process.env.OPENROUTER_GLM_MODEL || 'thudm/glm-4-9b-chat',
    // DeepSeek Models supported via OpenRouter
    deepseekModel: process.env.OPENROUTER_DEEPSEEK_MODEL || 'deepseek/deepseek-chat',
    availableModels: [
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat (V3)',
        provider: 'DeepSeek',
        family: 'deepseek',
        description: 'High-performance general-purpose reasoning model',
      },
      {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1',
        provider: 'DeepSeek',
        family: 'deepseek',
        description: 'Advanced reasoning and mathematical reasoning model',
      },
      {
        id: 'thudm/glm-4-9b-chat',
        name: 'GLM-4 9B Chat',
        provider: 'Zhipu AI / THUDM',
        family: 'glm',
        description: 'Bilingual open multilingual chat and instruction model',
      },
      {
        id: 'zhipuai/glm-4-plus',
        name: 'GLM-4 Plus',
        provider: 'Zhipu AI',
        family: 'glm',
        description: 'Flagship GLM-4 language model with enhanced coding capabilities',
      },
    ],
  },

  // AssemblyAI Configuration
  assemblyAi: {
    apiKey: process.env.ASSEMBLYAI_API_KEY || '',
    vocabularyPath: path.resolve(__dirname, '../../../ai-ml/assemblyai/domain_vocabulary.json'),
  },

  // ElevenLabs Configuration
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
  },

  // System Prompt Path
  systemPromptPath: path.resolve(__dirname, '../../../ai-ml/prompts/system_prompt.md'),
};

module.exports = config;
