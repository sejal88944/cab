require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket');
const { getAllowedOriginsList } = require('./config/cors.config');

const port = process.env.PORT || 5001;

const server = http.createServer(app);
initializeSocket(server, app);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`[CORS] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
        console.log('[CORS] Socket.IO + REST allow origins:', getAllowedOriginsList());
    }
});
