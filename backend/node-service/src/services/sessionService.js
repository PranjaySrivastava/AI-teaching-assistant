/**
 * Session Service
 * Manages conversational context and memory per student session.
 * Supports sliding window context formatting for LLM queries to prevent token overflow.
 */

class SessionService {
  constructor() {
    // Map of sessionId -> array of { role, content, timestamp, meta }
    this.sessions = new Map();
  }

  /**
   * Get all messages for a session
   * @param {string} sessionId
   * @returns {Array}
   */
  getSession(sessionId = 'default-session') {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Add a message to the session history
   * @param {string} sessionId
   * @param {'user' | 'assistant'} role
   * @param {string} content
   * @param {Object} [meta] - Optional metadata (code, visuals, audioUrl, etc.)
   */
  addMessage(sessionId = 'default-session', role, content, meta = {}) {
    const session = this.getSession(sessionId);
    const entry = {
      role,
      content,
      timestamp: new Date().toISOString(),
      meta,
    };
    session.push(entry);
    return entry;
  }

  /**
   * Get formatted conversation history for LLM prompt context
   * @param {string} sessionId
   * @param {number} maxTurns - Maximum previous turns to include
   * @returns {Array<{ role: string, content: string }>}
   */
  getContextHistory(sessionId = 'default-session', maxTurns = 8) {
    const session = this.getSession(sessionId);
    const sliced = session.slice(-maxTurns);
    return sliced.map((item) => ({
      role: item.role,
      content: item.content,
    }));
  }

  /**
   * Clear session history
   * @param {string} sessionId
   */
  clearSession(sessionId = 'default-session') {
    return this.sessions.delete(sessionId);
  }

  /**
   * List all active session IDs
   * @returns {string[]}
   */
  listSessions() {
    return Array.from(this.sessions.keys());
  }
}

// Singleton instance
const sessionService = new SessionService();

module.exports = {
  SessionService,
  sessionService,
};
