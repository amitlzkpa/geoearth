const server = require('simple-server');

const DIR = 'public';
const PORT = process.env.PORT || 8080;

server(DIR, PORT);