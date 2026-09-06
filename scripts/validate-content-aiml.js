/**
 * Validation script for Content QA dataset and AI-ML domain vocabulary
 */
const fs = require('fs');
const path = require('path');

let hasErrors = false;

function error(msg) {
  console.error(`❌ [Validation Error] ${msg}`);
  hasErrors = true;
}

function success(msg) {
  console.log(`✅ [Validation Passed] ${msg}`);
}

// 1. Validate content/qa-database/qa-dataset.json
const qaDatasetPath = path.join(__dirname, '..', 'content', 'qa-database', 'qa-dataset.json');
if (fs.existsSync(qaDatasetPath)) {
  try {
    const raw = fs.readFileSync(qaDatasetPath, 'utf8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data.topics)) {
      error('content/qa-database/qa-dataset.json: root "topics" must be an array');
    } else if (data.topics.length === 0) {
      error('content/qa-database/qa-dataset.json: "topics" array must not be empty');
    } else {
      const seenIds = new Set();
      data.topics.forEach((topic, idx) => {
        const prefix = `Topic [${idx}] (${topic.id || 'missing id'})`;
        if (!topic.id || typeof topic.id !== 'string') {
          error(`${prefix}: "id" is required and must be a string`);
        } else if (seenIds.has(topic.id)) {
          error(`${prefix}: duplicate topic id "${topic.id}"`);
        } else {
          seenIds.add(topic.id);
        }

        if (!topic.question || typeof topic.question !== 'string') {
          error(`${prefix}: "question" is required and must be a string`);
        }
        if (!topic.expectedAnswer || typeof topic.expectedAnswer !== 'object') {
          error(`${prefix}: "expectedAnswer" is required and must be an object`);
        } else if (!topic.expectedAnswer.summary) {
          error(`${prefix}: "expectedAnswer.summary" is required`);
        }
      });

      if (!hasErrors) {
        success(`Validated ${data.topics.length} topics in content/qa-database/qa-dataset.json`);
      }
    }
  } catch (err) {
    error(`Failed to parse content/qa-database/qa-dataset.json: ${err.message}`);
  }
} else {
  console.log('ℹ️  content/qa-database/qa-dataset.json not found, skipping.');
}

// 2. Validate ai-ml/assemblyai/domain_vocabulary.json
const vocabPath = path.join(__dirname, '..', 'ai-ml', 'assemblyai', 'domain_vocabulary.json');
if (fs.existsSync(vocabPath)) {
  try {
    const raw = fs.readFileSync(vocabPath, 'utf8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data.word_boost)) {
      error('ai-ml/assemblyai/domain_vocabulary.json: "word_boost" must be an array of strings');
    } else if (data.word_boost.length === 0) {
      error('ai-ml/assemblyai/domain_vocabulary.json: "word_boost" array must not be empty');
    } else {
      const invalidWords = data.word_boost.filter((w) => typeof w !== 'string' || !w.trim());
      if (invalidWords.length > 0) {
        error(
          `ai-ml/assemblyai/domain_vocabulary.json: contains empty or non-string word_boost entries`
        );
      } else {
        success(
          `Validated ${data.word_boost.length} domain terms in ai-ml/assemblyai/domain_vocabulary.json`
        );
      }
    }

    if (!data.boost_param) {
      error('ai-ml/assemblyai/domain_vocabulary.json: "boost_param" is required');
    }
  } catch (err) {
    error(`Failed to parse ai-ml/assemblyai/domain_vocabulary.json: ${err.message}`);
  }
} else {
  console.log('ℹ️  ai-ml/assemblyai/domain_vocabulary.json not found, skipping.');
}

if (hasErrors) {
  console.error('\n❌ Content & AI-ML validation failed.');
  process.exit(1);
} else {
  console.log('\n✨ All Content and AI-ML files passed validation!');
  process.exit(0);
}
