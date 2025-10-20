const http = require('http');
const socketio = require('socket.io');
const logger = require('./logger'); // Assuming logger is available

const getCorsConfig = () => {
  return {
    origin: [process.env.FRONTEND_URL, process.env.PROD_FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  };
};

class ServerManager {
  constructor(app) {
    this.app = app;
    this.httpServer = http.createServer(app);
    this.io = socketio(this.httpServer, { cors: getCorsConfig() });
  }

  getEnvironmentFromSocket(socket) {
    const origin = socket.handshake.headers.origin;
    return origin && origin.includes('test.wehub') ? 'dev' : 'prod';
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      const environment = this.getEnvironmentFromSocket(socket);
      socket.join(environment);
      logger.debug(`Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.debug(`Client disconnected: ${socket.id}`);
      });
    });
  }

  listen(port) {
    this.httpServer.listen(port, '0.0.0.0', () => {
      logger.info(`Server running on http://0.0.0.0:${port}`);
    });
  }
}

module.exports = ServerManager;