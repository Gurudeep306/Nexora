// A port the operating system says is free right now. Test files run in
// parallel; picking a random port from a fixed range let two servers (or an
// outgoing connection's ephemeral port) land on the same number now and then,
// and the second server failed to start.
const net = require('node:net');

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

module.exports = { freePort };
