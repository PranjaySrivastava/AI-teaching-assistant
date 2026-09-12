const { OpenRouterService } = require('../src/services/openRouterService');

describe('OpenRouterService', () => {
  let service;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: '', // Empty key to trigger deterministic pedagogical fallback
      defaultModel: 'deepseek/deepseek-chat',
      glmModel: 'thudm/glm-4-9b-chat',
      deepseekModel: 'deepseek/deepseek-chat',
    });
  });

  describe('Model Resolution', () => {
    it('should resolve "glm" to configured GLM model', () => {
      expect(service.resolveModel('glm')).toEqual('thudm/glm-4-9b-chat');
      expect(service.resolveModel('glm-4')).toEqual('thudm/glm-4-9b-chat');
    });

    it('should resolve "deepseek" to configured DeepSeek model', () => {
      expect(service.resolveModel('deepseek')).toEqual('deepseek/deepseek-chat');
      expect(service.resolveModel('deepseek-r1')).toEqual('deepseek-r1');
    });

    it('should default to defaultModel when none requested', () => {
      expect(service.resolveModel()).toEqual('deepseek/deepseek-chat');
    });

    it('should list available models', () => {
      const models = service.getAvailableModels();
      expect(models.glmModel).toBeDefined();
      expect(models.deepseekModel).toBeDefined();
      expect(models.models.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('JSON Response Parsing', () => {
    it('should parse clean JSON string', () => {
      const jsonStr = JSON.stringify({
        explanation: 'Quick sort partitions an array.',
        mood: 'explaining',
        code: { language: 'python', snippet: 'def qs(): pass' },
        visualSequence: { type: 'sorting', title: 'QuickSort', steps: [] },
        suggestedFollowUps: ['What about sorted arrays?'],
      });

      const parsed = service.parseJsonResponse(jsonStr);
      expect(parsed.explanation).toEqual('Quick sort partitions an array.');
      expect(parsed.mood).toEqual('explaining');
      expect(parsed.code.language).toEqual('python');
    });

    it('should parse markdown code block JSON', () => {
      const markdownBlock = '```json\n{"explanation":"MergeSort divides","mood":"explaining"}\n```';
      const parsed = service.parseJsonResponse(markdownBlock);
      expect(parsed.explanation).toEqual('MergeSort divides');
    });

    it('should gracefully handle malformed output and provide structured fallback', () => {
      const rawText = 'Just a regular text response without json formatting.';
      const parsed = service.parseJsonResponse(rawText);
      expect(parsed.explanation).toContain('Just a regular text');
      expect(parsed.code).toBeDefined();
      expect(parsed.visualSequence).toBeDefined();
    });
  });

  describe('Teaching Response Generation', () => {
    it('should generate structured explanation for QuickSort', async () => {
      const res = await service.generateTeachingResponse('Explain QuickSort');
      expect(res.explanation).toContain('Quick sort');
      expect(res.code.snippet).toContain('def quicksort');
      expect(res.visualSequence.type).toEqual('sorting');
      expect(res.suggestedFollowUps.length).toBeGreaterThan(0);
    });

    it('should generate contextual explanation for follow-up on already sorted array', async () => {
      const res = await service.generateTeachingResponse('What if the array is already sorted?', [
        { role: 'user', content: 'Explain QuickSort' },
      ]);
      expect(res.explanation).toContain('worst-case');
      expect(res.code.snippet).toContain('partition');
      expect(res.visualSequence.type).toEqual('complexity_analysis');
    });

    it('should handle out-of-scope non-DSA questions gracefully', async () => {
      const res = await service.generateTeachingResponse('What is the capital of France?');
      expect(res.explanation).toContain('Data Structures and Algorithms');
      expect(res.suggestedFollowUps.length).toBeGreaterThan(0);
    });
  });
});
