const WebSocket = require('ws');
const { server } = require('../src/index');

describe('WebSocket streaming API', () => {
  let address;

  beforeAll((done) => {
    server.listen(0, '127.0.0.1', () => {
      address = `ws://127.0.0.1:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('sends the connected event and acknowledges ordinary messages', (done) => {
    const socket = new WebSocket(address);
    const messages = [];

    socket.on('message', (raw) => {
      messages.push(JSON.parse(raw.toString()));
      if (messages.length === 1) socket.send(JSON.stringify({ type: 'ping', value: 1 }));
      if (messages.length === 2) {
        expect(messages).toEqual([
          expect.objectContaining({ type: 'connected' }),
          { type: 'ack', received: { type: 'ping', value: 1 } },
        ]);
        socket.close();
        done();
      }
    });
  });

  it('reports invalid JSON without terminating the connection', (done) => {
    const socket = new WebSocket(address);
    socket.once('open', () => socket.send('{invalid'));
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'error') {
        expect(message.message).toBe('Invalid JSON payload');
        socket.close();
        done();
      }
    });
  });
});
