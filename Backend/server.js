require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket');

const port = process.env.PORT || 5001;

const server = http.createServer(app);
initializeSocket(server, app);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

