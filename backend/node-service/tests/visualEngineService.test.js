const { VisualEngineService } = require('../src/services/visualEngineService');

describe('VisualEngineService', () => {
  let service;

  beforeEach(() => {
    service = new VisualEngineService();
  });

  describe('normalizeSequence', () => {
    it('should enrich empty sequence with default steps and timing', () => {
      const normalized = service.normalizeSequence({}, 'BubbleSort');
      expect(normalized.topic).toEqual('BubbleSort');
      expect(normalized.steps.length).toBeGreaterThan(0);
      expect(normalized.timing.visualStartAt).toEqual(3000);
      expect(normalized.timing.visualCompleteAt).toEqual(7000);
    });

    it('should preserve steps and ensure valid structure', () => {
      const input = {
        type: 'sorting',
        title: 'Custom Sort',
        steps: [{ step: 1, action: 'compare', description: 'Comparing 2 and 5', elements: [0, 1] }],
      };

      const normalized = service.normalizeSequence(input, 'Custom');
      expect(normalized.type).toEqual('sorting');
      expect(normalized.steps[0].action).toEqual('compare');
      expect(normalized.steps[0].elements).toEqual([0, 1]);
    });
  });

  describe('generateTemplate', () => {
    it('should generate QuickSort template', () => {
      const template = service.generateTemplate('sorting', 'quicksort');
      expect(template.type).toEqual('algorithm_visualization');
      expect(template.subtype).toEqual('sorting');
      expect(template.initialState.array).toBeDefined();
      expect(template.steps.length).toBeGreaterThanOrEqual(4);
    });

    it('should generate Binary Search template', () => {
      const template = service.generateTemplate('searching', 'binary search');
      expect(template.type).toEqual('algorithm_visualization');
      expect(template.subtype).toEqual('searching');
      expect(template.initialState.target).toEqual(23);
      expect(template.steps.some((s) => s.action === 'compare')).toBe(true);
    });

    it('should generate BST template', () => {
      const template = service.generateTemplate('tree', 'binary search tree');
      expect(template.type).toEqual('data_structure');
      expect(template.subtype).toEqual('tree');
      expect(template.nodes.length).toBeGreaterThan(0);
    });

    it('should generate BFS and DFS graph templates', () => {
      const bfs = service.generateTemplate('graph', 'bfs');
      expect(bfs.type).toEqual('graph_traversal');
      expect(bfs.subtype).toEqual('bfs');
      expect(bfs.nodes).toContain('A');

      const dfs = service.generateTemplate('graph', 'dfs');
      expect(dfs.type).toEqual('graph_traversal');
      expect(dfs.subtype).toEqual('dfs');
    });

    it('should generate Big-O complexity template', () => {
      const template = service.generateTemplate('complexity');
      expect(template.type).toEqual('complexity_analysis');
      expect(template.curves.length).toBeGreaterThanOrEqual(4);
    });
  });
});
