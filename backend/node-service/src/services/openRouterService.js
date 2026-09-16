/**
 * OpenRouter LLM Service
 * Orchestrates calls to GLM and DeepSeek models via OpenRouter's OpenAI-compatible API.
 * Enforces Professor Ada teaching persona and strict JSON schema output.
 */

const fs = require('fs');
const config = require('../config');

class OpenRouterService {
  constructor(customConfig = {}) {
    this.apiKey =
      customConfig.apiKey !== undefined ? customConfig.apiKey : config.openRouter.apiKey;
    this.baseUrl = customConfig.baseUrl || config.openRouter.baseUrl;
    this.siteUrl = customConfig.siteUrl || config.openRouter.siteUrl;
    this.siteName = customConfig.siteName || config.openRouter.siteName;
    this.defaultModel = customConfig.defaultModel || config.openRouter.defaultModel;
    this.glmModel = customConfig.glmModel || config.openRouter.glmModel;
    this.deepseekModel = customConfig.deepseekModel || config.openRouter.deepseekModel;
    this.availableModels = config.openRouter.availableModels;
    this.systemPrompt = this.loadSystemPrompt();
    this.fewShotExamples = this.loadFewShotExamples();
  }

  loadFewShotExamples() {
    try {
      if (fs.existsSync(config.fewShotExamplesPath)) {
        return JSON.parse(fs.readFileSync(config.fewShotExamplesPath, 'utf-8')).examples || [];
      }
    } catch (_err) {
      // Fall through to no examples when the optional file is unavailable or invalid.
    }
    return [];
  }

  /**
   * Load system prompt from file or fallback to embedded prompt
   */
  loadSystemPrompt() {
    try {
      if (fs.existsSync(config.systemPromptPath)) {
        return fs.readFileSync(config.systemPromptPath, 'utf-8');
      }
    } catch (_err) {
      // Fall through to embedded prompt
    }

    return `You are Professor Ada, an encouraging, patient, and world-class computer science professor specializing in Data Structures and Algorithms.
You teach students of all levels, from beginners to advanced engineers.

Teaching Principles:
1. Clarity First: Explain concepts intuitively before diving into technical formalities. Use relatable real-world analogies.
2. Visual Thinking: Always provide an accompanying step-by-step visual sequence for the dynamic canvas visualizer.
3. Socratic & Interactive: Encourage curiosity and anticipate student follow-up questions.
4. Pedagogical Constraints: Keep voice explanation under 90 words per turn for natural pacing and low latency (<2s).

Every response MUST be strictly valid JSON matching this exact schema:
{
  "explanation": "Spoken explanation delivered by the 3D avatar (under 90 words)",
  "mood": "explaining | thinking | encouraging | celebrating",
  "code": {
    "language": "python | javascript | cpp",
    "snippet": "// Clean, commented implementation"
  },
  "visualSequence": {
    "type": "sorting | tree | graph | array | searching | complexity",
    "title": "Algorithm step title",
    "steps": [
      {
        "step": 1,
        "action": "compare | swap | highlight | traverse | insert | delete",
        "description": "Step description",
        "elements": [0, 1]
      }
    ]
  },
  "suggestedFollowUps": [
    "What is the worst-case time complexity?",
    "Can this be optimized using extra memory?"
  ]
}`;
  }

  /**
   * Resolve model alias ('glm' or 'deepseek') to exact OpenRouter model identifier
   * @param {string} [requestedModel]
   * @returns {string} Model identifier
   */
  resolveModel(requestedModel) {
    if (!requestedModel) {
      return this.defaultModel;
    }

    const norm = requestedModel.toLowerCase().trim();
    if (norm === 'glm' || norm === 'glm-4' || norm === 'glm4') {
      return this.glmModel;
    }
    if (norm === 'deepseek' || norm === 'deepseek-chat') {
      return this.deepseekModel;
    }

    // Direct model string like 'thudm/glm-4-9b-chat' or 'deepseek/deepseek-r1'
    return requestedModel;
  }

  /**
   * List available supported models
   */
  getAvailableModels() {
    return {
      defaultModel: this.defaultModel,
      glmModel: this.glmModel,
      deepseekModel: this.deepseekModel,
      models: this.availableModels,
    };
  }

  /**
   * Generate teaching response using OpenRouter
   * @param {string} question - Student's question
   * @param {Array<{ role: string, content: string }>} [conversationHistory] - Previous Q&A
   * @param {string} [modelOverride] - 'glm', 'deepseek', or specific model id
   * @returns {Promise<Object>} Structured teaching response
   */
  async generateTeachingResponse(question, conversationHistory = [], modelOverride = null) {
    const selectedModel = this.resolveModel(modelOverride);

    // If no API key provided, generate high-quality deterministic response
    if (!this.apiKey || this.apiKey === 'your_openrouter_api_key_here') {
      return this.generateFallbackResponse(question, selectedModel);
    }

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: `${this.systemPrompt}\n\nIMPORTANT: Output ONLY a valid raw JSON object. Do not wrap in markdown quotes if possible, or provide valid JSON inside \`\`\`json markdown blocks. Respond with NO conversational filler outside the JSON.`,
      },
      ...this.fewShotExamples,
    ];

    // Append conversation history
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const turn of conversationHistory) {
        messages.push({
          role: turn.role === 'assistant' ? 'assistant' : 'user',
          content:
            typeof turn.content === 'object' ? JSON.stringify(turn.content) : String(turn.content),
        });
      }
    }

    // Append current question
    messages.push({
      role: 'user',
      content: question,
    });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`OpenRouter API error (${response.status}): ${errText}`);
        return this.generateFallbackResponse(
          question,
          selectedModel,
          `OpenRouter API returned status ${response.status}`
        );
      }

      const result = await response.json();
      const rawContent = result.choices?.[0]?.message?.content;

      if (!rawContent) {
        throw new Error('Empty response from OpenRouter');
      }

      const parsed = this.parseJsonResponse(rawContent);
      return {
        ...parsed,
        modelUsed: selectedModel,
      };
    } catch (err) {
      console.warn(`OpenRouter generation failed (${err.message}): using fallback generator`);
      return this.generateFallbackResponse(question, selectedModel, err.message);
    }
  }

  /**
   * Parse LLM response content into strict JSON object
   * @param {string} content
   * @returns {Object}
   */
  parseJsonResponse(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Content is not a string');
    }

    let cleaned = content.trim();

    // Remove markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
    }

    try {
      const parsed = JSON.parse(cleaned);

      // Validate required properties
      const isOutOfScope = parsed.code === null && parsed.visualSequence === null;
      return {
        explanation: parsed.explanation || 'Let us explore this algorithm step by step.',
        mood: parsed.mood || 'explaining',
        code: isOutOfScope
          ? null
          : parsed.code || {
              language: 'python',
              snippet: '# Implementation details coming up',
            },
        visualSequence: isOutOfScope
          ? null
          : parsed.visualSequence || {
              type: 'algorithm_visualization',
              title: 'Algorithm Execution',
              steps: [],
            },
        suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps)
          ? parsed.suggestedFollowUps.slice(0, 2)
          : [
              'What is the time complexity in the worst case?',
              'Can you explain how the pointers move step by step?',
            ],
      };
    } catch (err) {
      // If parsing failed, extract JSON substring or return formatted structure
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_subErr) {
          // ignore
        }
      }

      // Return content as explanation if JSON parsing totally fails
      return {
        explanation: cleaned.slice(0, 300),
        mood: 'explaining',
        code: { language: 'python', snippet: '# Reference code' },
        visualSequence: { type: 'algorithm_visualization', title: 'Algorithm Steps', steps: [] },
        suggestedFollowUps: [
          'Can you show a visual step-by-step example?',
          'What is the time complexity in the worst case?',
        ],
      };
    }
  }

  /**
   * Fallback response generator for offline testing or when OpenRouter API is unreachable
   * @param {string} question
   * @param {string} model
   * @param {string} [warning]
   */
  generateFallbackResponse(question, model, warning = null) {
    const q = question.toLowerCase();

    // Check for out-of-scope questions (as per PDF requirements)
    const dsaKeywords = [
      'sort',
      'search',
      'tree',
      'graph',
      'array',
      'stack',
      'queue',
      'hash',
      'heap',
      'recursion',
      'dynamic programming',
      'complexity',
      'big-o',
      'linked list',
      'bfs',
      'dfs',
      'dijkstra',
      'binary',
      'partition',
      'traversal',
      'algorithm',
      'data structure',
      'sliding window',
      'window',
      'knapsack',
      'trie',
      'pointer',
      'two pointer',
      'fibonacci',
      'merge',
      'avl',
      'rotation',
      'quicksort',
      'pivot',
    ];
    const isDsa = dsaKeywords.some((kw) => q.includes(kw));

    // If clearly non-DSA topic, steer back to DS&A persona
    if (!isDsa) {
      return {
        explanation:
          "I specialize in Data Structures and Algorithms! Let's focus our study on topics like Sorting, Trees, Graphs, or Dynamic Programming. What algorithm would you like to master today?",
        mood: 'encouraging',
        code: null,
        visualSequence: null,
        suggestedFollowUps: [
          'Explain how QuickSort works with a simple example',
          'How does Binary Search achieve O(log n) time complexity?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Celebrating student correct answer
    if (
      q.includes('did i get that right') ||
      q.includes('is that right') ||
      (q.includes('correct') && q.includes('so '))
    ) {
      return {
        explanation:
          'Spot on! That is a stellar summary. QuickSort partitions around a pivot with O(n log n) average time complexity. You have grasped the core divide-and-conquer concept brilliantly!',
        mood: 'celebrating',
        code: {
          language: 'python',
          snippet: `def quicksort(arr):\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr) // 2]\n    return quicksort([x for x in arr if x < pivot]) + [x for x in arr if x == pivot] + quicksort([x for x in arr if x > pivot])`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'QuickSort Partition Verification',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Pivot chosen at middle index',
              elements: [3],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Left sub-array elements < pivot confirmed',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Sorted order verified in O(n log n)',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'What is the worst-case space complexity?',
          'How does 3-way partitioning handle duplicates?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Follow-up: "What if the array is already sorted?"
    if (q.includes('already sorted') || (q.includes('sorted') && q.includes('what if'))) {
      return {
        explanation:
          'Great follow-up question! If the array is already sorted and we pick the last element as pivot, QuickSort hits its worst-case O(n²) time complexity because partitions become completely unbalanced.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def randomized_partition(arr, low, high):\n    import random\n    pivot_idx = random.randint(low, high)\n    arr[pivot_idx], arr[high] = arr[high], arr[pivot_idx]\n    return partition(arr, low, high)`,
        },
        visualSequence: {
          type: 'complexity_analysis',
          title: 'QuickSort Worst-Case: Sorted Input',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Smallest element selected as pivot',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'All elements larger: unbalanced partition of size n-1',
              elements: [0, 6],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'N levels deep gives O(n²) total comparisons',
              elements: [6],
            },
          ],
        },
        suggestedFollowUps: [
          'How does randomized pivot selection fix this?',
          'How does MergeSort compare on already sorted arrays?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Dijkstra
    if (q.includes('dijkstra')) {
      return {
        explanation:
          "Dijkstra's algorithm finds the shortest path on a non-negative weighted graph. Using a min-heap priority queue, it greedily finalizes the closest unvisited vertex step by step in O((V + E) log V) time.",
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `import heapq\n\ndef dijkstra(graph, start):\n    dist = {node: float('inf') for node in graph}\n    dist[start] = 0\n    pq = [(0, start)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]: continue\n        for v, weight in graph[u].items():\n            if dist[u] + weight < dist[v]:\n                dist[v] = dist[u] + weight\n                heapq.heappush(pq, (dist[v], v))\n    return dist`,
        },
        visualSequence: {
          type: 'graph',
          title: "Dijkstra's Shortest Path",
          steps: [
            {
              step: 1,
              action: 'visit',
              description: 'Initialize start node with distance 0',
              elements: ['A'],
            },
            {
              step: 2,
              action: 'relax',
              description: 'Relax adjacent edges and update priority queue',
              elements: ['A', 'B', 'C'],
            },
            {
              step: 3,
              action: 'visit',
              description: 'Extract min distance vertex and finalize shortest path',
              elements: ['F'],
            },
          ],
        },
        suggestedFollowUps: [
          'Why does Dijkstra fail with negative weights?',
          'How does the Bellman-Ford algorithm differ?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // BFS vs DFS
    if (q.includes('bfs') || q.includes('dfs')) {
      return {
        explanation:
          'BFS explores level-by-level using a FIFO queue, finding the shortest path on unweighted graphs. DFS plunges deep down one path using a LIFO stack before backtracking. Both run in O(V + E) time.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `from collections import deque\n\ndef bfs(graph, start):\n    visited, q = {start}, deque([start])\n    while q:\n        node = q.popleft()\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                q.append(neighbor)\n    return visited`,
        },
        visualSequence: {
          type: 'graph',
          title: 'BFS vs DFS Traversal',
          steps: [
            { step: 1, action: 'visit', description: 'Enqueue start node A', elements: ['A'] },
            {
              step: 2,
              action: 'traverse',
              description: 'Visit all immediate neighbors at depth 1',
              elements: ['B', 'C'],
            },
            {
              step: 3,
              action: 'visit',
              description: 'Process level 2 neighbors until queue is empty',
              elements: ['D', 'E', 'F'],
            },
          ],
        },
        suggestedFollowUps: [
          'When is DFS preferred over BFS?',
          'How does A* search improve upon BFS?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // AVL Tree
    if (q.includes('avl') || q.includes('rotation')) {
      return {
        explanation:
          'An AVL Tree is a self-balancing binary search tree where the balance factor of any node is strictly between -1 and +1. When an insertion causes unbalance, single or double rotations restore O(log n) height.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def right_rotate(y):\n    x = y.left\n    T2 = x.right\n    x.right = y\n    y.left = T2\n    y.height = 1 + max(get_height(y.left), get_height(y.right))\n    x.height = 1 + max(get_height(x.left), get_height(x.right))\n    return x`,
        },
        visualSequence: {
          type: 'tree',
          title: 'AVL Tree Rotations',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'Insert new node in BST order',
              elements: [5],
            },
            {
              step: 2,
              action: 'highlight',
              description: 'Detect balance factor > 1 at ancestor',
              elements: [2],
            },
            {
              step: 3,
              action: 'swap',
              description: 'Execute rotation to restore height balance',
              elements: [1, 2],
            },
          ],
        },
        suggestedFollowUps: [
          'What are the four rotation cases?',
          'How does a Red-Black Tree differ from an AVL Tree?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Trie Data Structure
    if (q.includes('trie')) {
      return {
        explanation:
          'A Trie, or prefix tree, stores strings character-by-character along tree paths. It enables O(L) search, insert, and prefix lookup proportional to word length L, powering fast autocomplete and spellcheck.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\n\nclass Trie:\n    def __init__(self):\n        self.root = TrieNode()\n    def insert(self, word):\n        node = self.root\n        for ch in word:\n            if ch not in node.children: node.children[ch] = TrieNode()\n            node = node.children[ch]\n        node.is_end = True`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Trie Prefix Search',
          steps: [
            { step: 1, action: 'highlight', description: 'Start at root node', elements: [0] },
            {
              step: 2,
              action: 'traverse',
              description: 'Traverse character path for prefix',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Prefix matched successfully in O(L)',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'How does a Radix tree compress Trie memory?',
          'How is a Trie used in IP routing lookup?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Binary Search Tree / General Tree
    if (q.includes('bst') || q.includes('tree')) {
      return {
        explanation:
          'A Binary Search Tree maintains the invariant that all left subtree keys are smaller, and all right subtree keys are larger. Searching, inserting, and deleting run in O(h) time proportional to tree height.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def search_bst(root, val):\n    if not root or root.val == val: return root\n    if val < root.val: return search_bst(root.left, val)\n    return search_bst(root.right, val)`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Binary Search Tree Operations',
          steps: [
            { step: 1, action: 'highlight', description: 'Examine root node 50', elements: [50] },
            {
              step: 2,
              action: 'traverse',
              description: 'Target < 50: branch left to node 30',
              elements: [30],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Target confirmed at node in O(log n)',
              elements: [40],
            },
          ],
        },
        suggestedFollowUps: [
          'What is the time complexity if the tree becomes degenerate?',
          'How does in-order traversal yield sorted keys?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Dynamic Programming - Fibonacci
    if (q.includes('fibonacci')) {
      return {
        explanation:
          'Dynamic programming eliminates redundant recalculation by storing subproblem answers. In Fibonacci, computing fib(n) bottom-up takes O(n) time and O(1) memory, turning exponential O(2^n) recursion into linear.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def fib_dp(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b`,
        },
        visualSequence: {
          type: 'dp',
          title: 'Fibonacci DP Tabulation',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Base cases: fib(0)=0, fib(1)=1',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Sum preceding two terms to produce fib(2)=1',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Result computed in O(n) time with O(1) space',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'What is top-down memoization vs bottom-up tabulation?',
          'How can matrix exponentiation solve Fibonacci in O(log n)?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // 0/1 Knapsack Problem
    if (q.includes('knapsack')) {
      return {
        explanation:
          'The 0/1 Knapsack problem asks for the maximum item value that fits into a weight capacity W. For each item, we either include it or exclude it, building an optimal subproblem DP table in O(n * W) pseudo-polynomial time.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def knapsack(W, wt, val, n):\n    dp = [[0] * (W + 1) for _ in range(n + 1)]\n    for i in range(1, n + 1):\n        for w in range(1, W + 1):\n            if wt[i-1] <= w:\n                dp[i][w] = max(val[i-1] + dp[i-1][w-wt[i-1]], dp[i-1][w])\n            else: dp[i][w] = dp[i-1][w]\n    return dp[n][W]`,
        },
        visualSequence: {
          type: 'dp',
          title: '0/1 Knapsack DP Table',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Initialize DP table row 0 with zero values',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Evaluate max(include item, exclude item)',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Optimal value achieved at dp[n][W]',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'How can we optimize space from O(n * W) to O(W)?',
          'Why is Knapsack NP-complete if fractional items are allowed?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Two Pointers & Sliding Window
    if (q.includes('sliding window') || q.includes('two pointer') || q.includes('pointer')) {
      return {
        explanation:
          'The two pointers and sliding window techniques optimize nested O(n²) loops into linear O(n) by maintaining a valid window or bounding pointers that adjust monotonically based on constraints.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def max_sub_array_len(nums, k):\n    left = total = max_len = 0\n    for right in range(len(nums)):\n        total += nums[right]\n        while total > k and left <= right:\n            total -= nums[left]\n            left += 1\n        max_len = max(max_len, right - left + 1)\n    return max_len`,
        },
        visualSequence: {
          type: 'array',
          title: 'Sliding Window Expansion & Contraction',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Expand right pointer to include element',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Evaluate window sum against constraint k',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Contract left pointer when constraint is violated in O(n)',
              elements: [1],
            },
          ],
        },
        suggestedFollowUps: [
          'How does the fast & slow pointer cycle detection work?',
          'When does sliding window require auxiliary hash tables?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // MergeSort
    if (q.includes('merge') || (q.includes('sort') && !q.includes('quick'))) {
      return {
        explanation:
          'MergeSort is a divide-and-conquer algorithm that recursively splits an array in halves down to single items, then merges sorted arrays back together in guaranteed O(n log n) time and O(n) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def merge_sort(arr):\n    if len(arr) <= 1: return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'MergeSort Divide & Conquer',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Divide array into two equal halves',
              elements: [0, 3],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Recursively sort each independent half',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'swap',
              description: 'Merge sorted sub-arrays in O(n) linear scan',
              elements: [0, 6],
            },
          ],
        },
        suggestedFollowUps: [
          'Why is MergeSort preferred over QuickSort for linked lists?',
          'How does TimSort leverage MergeSort?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // QuickSort default example (PDF Page 1 example)
    if (q.includes('quick') || q.includes('quicksort')) {
      return {
        explanation:
          'Quick sort works by partitioning an array around a pivot element. Elements smaller than the pivot move left, and larger elements move right, then we recursively sort both halves.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'QuickSort Partitioning Animation',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Array: [38, 27, 43, 3, 9, 82, 10]. Pivot selected: 10',
              elements: [6],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Compare 38 with pivot 10: 38 > 10, keep in right partition',
              elements: [0, 6],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Compare 3 with pivot 10: 3 <= 10, swap to left partition',
              elements: [3, 6],
            },
            {
              step: 4,
              action: 'swap',
              description: 'Swapped 38 and 3: [3, 27, 43, 38, 9, 82, 10]',
              elements: [0, 3],
            },
            {
              step: 5,
              action: 'highlight',
              description: 'Pivot 10 placed at boundary. Partitions: [3, 9] and [38, 27, 82, 43]',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'What if the array is already sorted?',
          'What is the space complexity of QuickSort?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Generic DS&A question response
    return {
      explanation: `Let us break down this concept! In computer science, choosing the optimal data structure and algorithm balances execution time and memory footprint efficiently.`,
      mood: 'explaining',
      code: {
        language: 'python',
        snippet: `# Algorithm Demonstration\ndef solve_problem(data):\n    # Process data systematically\n    return [item for item in data if item is not None]`,
      },
      visualSequence: {
        type: 'array',
        title: 'Step-by-Step Visualization',
        steps: [
          {
            step: 1,
            action: 'highlight',
            description: 'Input structure initialized',
            elements: [0],
          },
          {
            step: 2,
            action: 'compare',
            description: 'Iterate and evaluate items',
            elements: [0, 1],
          },
          { step: 3, action: 'swap', description: 'Synthesize optimal solution', elements: [1] },
        ],
      },
      suggestedFollowUps: [
        'What is the worst-case time complexity?',
        'Can this be solved using dynamic programming or recursion?',
      ],
      modelUsed: model,
      fallbackMode: true,
      ...(warning ? { warning } : {}),
    };
  }
}

const openRouterService = new OpenRouterService();

module.exports = {
  OpenRouterService,
  openRouterService,
};
