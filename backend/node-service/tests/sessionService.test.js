const { SessionService } = require('../src/services/sessionService');

describe('SessionService', () => {
  let service;

  beforeEach(() => {
    service = new SessionService();
  });

  it('should initialize empty session array', () => {
    const history = service.getSession('session-1');
    expect(history).toEqual([]);
  });

  it('should add messages with timestamps and metadata', () => {
    service.addMessage('session-1', 'user', 'Explain QuickSort');
    service.addMessage('session-1', 'assistant', 'QuickSort divides an array', {
      code: 'def qs(): pass',
    });

    const history = service.getSession('session-1');
    expect(history.length).toEqual(2);
    expect(history[0].role).toEqual('user');
    expect(history[0].content).toEqual('Explain QuickSort');
    expect(history[1].meta.code).toEqual('def qs(): pass');
  });

  it('should return sliced history for LLM context window', () => {
    for (let i = 0; i < 15; i++) {
      service.addMessage('session-1', i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`);
    }

    const context = service.getContextHistory('session-1', 4);
    expect(context.length).toEqual(4);
    expect(context[3].content).toEqual('Message 14');
  });

  it('should clear session history', () => {
    service.addMessage('session-1', 'user', 'Hello');
    expect(service.getSession('session-1').length).toEqual(1);

    service.clearSession('session-1');
    expect(service.getSession('session-1').length).toEqual(0);
  });

  it('should list all active sessions', () => {
    service.addMessage('s1', 'user', 'Question 1');
    service.addMessage('s2', 'user', 'Question 2');
    const list = service.listSessions();
    expect(list).toContain('s1');
    expect(list).toContain('s2');
  });
});
