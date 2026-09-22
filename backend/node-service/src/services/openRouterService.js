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
    if (norm === 'glm' || norm === 'glm-4' || norm === 'glm4' || norm.includes('glm')) {
      return this.glmModel;
    }
    if (norm === 'deepseek' || norm === 'deepseek-chat' || norm.includes('deepseek')) {
      return this.deepseekModel;
    }

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

    const modelsToTry = [selectedModel];
    if (
      selectedModel !== 'openrouter/free' &&
      selectedModel !== 'meta-llama/llama-3.3-70b-instruct:free'
    ) {
      modelsToTry.push('openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free');
    }

    let lastError = null;

    for (const modelToAttempt of modelsToTry) {
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
            model: modelToAttempt,
            messages,
            temperature: 0.3,
            max_tokens: 1500,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(
            `OpenRouter API error for model ${modelToAttempt} (${response.status}): ${errText}`
          );
          lastError = `OpenRouter API returned status ${response.status}: ${errText}`;
          // Continue to next fallback model in modelsToTry
          continue;
        }

        const result = await response.json();
        const rawContent = result.choices?.[0]?.message?.content;

        if (!rawContent) {
          throw new Error(`Empty response from model ${modelToAttempt}`);
        }

        const parsed = this.parseJsonResponse(rawContent);
        return {
          ...parsed,
          modelUsed: modelToAttempt,
        };
      } catch (err) {
        console.warn(`OpenRouter generation failed on ${modelToAttempt} (${err.message})`);
        lastError = err.message;
      }
    }

    console.warn(`All OpenRouter attempts failed (${lastError}): using deterministic fallback`);
    return this.generateFallbackResponse(question, selectedModel, lastError);
  }

  /**
   * Parse LLM response content into strict JSON object, with recovery for truncated responses
   * @param {string} content
   * @returns {Object}
   */
  parseJsonResponse(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Content is not a string');
    }

    let cleaned = content.trim();

    // Strip common safety/moderation preamble lines (e.g., from Llama Guard / free tier wrappers)
    cleaned = cleaned
      .replace(/^(?:User|Response|Assistant|Model)?\s*Safety\s*:[^\n]*\n+/gim, '')
      .replace(/^Safety\s+Assessment\s*:[^\n]*\n+/gim, '')
      .trim();

    // Try extracting JSON from markdown code blocks first
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let jsonTarget = codeBlockMatch ? codeBlockMatch[1].trim() : cleaned;

    // If still not clean JSON, extract outer curly braces
    if (!jsonTarget.startsWith('{')) {
      const braceMatch = jsonTarget.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonTarget = braceMatch[0];
      }
    }

    let parsed = null;
    try {
      parsed = JSON.parse(jsonTarget);
    } catch (_err) {
      // Secondary attempt: extract substring between first '{' and last '}' of entire content
      const fullBraceMatch = cleaned.match(/\{[\s\S]*\}/);
      if (fullBraceMatch) {
        try {
          parsed = JSON.parse(fullBraceMatch[0]);
        } catch (_nestedErr) {
          parsed = null;
        }
      }
    }

    // If standard JSON parsing failed (e.g. truncated JSON from token ceiling), recover fields via regex
    if (!parsed) {
      const explanationMatch = cleaned.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)/i);
      if (explanationMatch && explanationMatch[1].trim()) {
        // Unescape JSON string
        let rawExplanation = explanationMatch[1];
        try {
          rawExplanation = JSON.parse(`"${rawExplanation.replace(/\\?$/, '')}"`);
        } catch (_unescapeErr) {
          rawExplanation = rawExplanation.replace(/\\"/g, '"').replace(/\\n/g, ' ');
        }

        const snippetMatch = cleaned.match(/"snippet"\s*:\s*"((?:[^"\\]|\\.)*)/i);
        let snippet = '# Implementation details';
        if (snippetMatch) {
          try {
            snippet = JSON.parse(`"${snippetMatch[1].replace(/\\?$/, '')}"`);
          } catch (_sErr) {
            snippet = snippetMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
          }
        }

        parsed = {
          explanation: rawExplanation,
          mood: 'explaining',
          code: { language: 'python', snippet },
          visualSequence: { type: 'algorithm_visualization', title: 'Algorithm Steps', steps: [] },
          suggestedFollowUps: [
            'What is the time complexity in the worst case?',
            'Can you explain the intuition behind this approach?',
          ],
        };
      } else {
        throw new Error('No valid JSON or explanation found in LLM response');
      }
    }

    // Clean explanation from any accidental leaked JSON syntax or safety text
    let explanation = parsed.explanation || 'Let us explore this algorithm step by step.';
    explanation = explanation
      .replace(/^(?:User|Response|Assistant|Model)?\s*Safety\s*:[^\n]*\n+/gim, '')
      .replace(/^Safety\s+Assessment\s*:[^\n]*\n+/gim, '')
      .replace(/^\{\s*"explanation"\s*:\s*"/i, '')
      .replace(/"\s*,\s*"mood"[\s\S]*$/i, '')
      .replace(/\\n/g, ' ')
      .replace(/\\"/g, '"')
      .trim();

    // Validate required properties
    const isOutOfScope = parsed.code === null && parsed.visualSequence === null;
    return {
      explanation: explanation || 'Let us explore this algorithm step by step.',
      mood: parsed.mood || 'explaining',
      code: isOutOfScope
        ? null
        : parsed.code || {
            language: 'python',
            snippet: '# Implementation details',
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
      'anagram',
      'duplicate',
      'two sum',
      'sliding window',
      'pointer',
      'string',
      'matrix',
      'edge case',
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

    // Follow-up: "What if the array is already sorted?" (PDF Page 1 example)
    if (q.includes('already sorted') || (q.includes('sorted') && q.includes('what if'))) {
      return {
        explanation:
          'Great follow-up question! If the array is already sorted and we pick the last element as pivot, QuickSort hits its worst-case O(n²) time complexity because partitions become completely unbalanced.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def randomized_partition(arr, low, high):
    import random
    pivot_idx = random.randint(low, high)
    arr[pivot_idx], arr[high] = arr[high], arr[pivot_idx] # Mitigates O(n^2)
    return partition(arr, low, high)`,
        },
        visualSequence: {
          type: 'complexity_analysis',
          title: 'Worst-Case Degeneration on Sorted Input',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Subarrays partition into sizes 0 and n-1 each recursion level',
              elements: [0, 6],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Requires n recursive levels, resulting in O(n^2) total comparisons',
              elements: [1, 5],
            },
            {
              step: 3,
              action: 'highlight',
              description:
                'Randomized pivot selection or Median-of-Three restores average O(n log n)',
              elements: [3],
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
        type: 'algorithm_visualization',
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
