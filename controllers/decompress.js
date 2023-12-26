// decompression-worker.js
const { parentPort } = require('node:worker_threads');
const pako = require('pako');

parentPort.on('message', (lines) => {
  const restored = JSON.parse(pako.inflate(lines, { to: 'string' }));
  parentPort.postMessage({ restored });
});
