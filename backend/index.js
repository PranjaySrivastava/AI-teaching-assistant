/**
 * Backend Entrypoint
 * Forwards execution to the Node Orchestration Service in backend/node-service
 */

const { app, server } = require('./node-service/src/index');

module.exports = { app, server };
