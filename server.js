// Signaling server for Jury's Out.
//
// This does NOT relay gameplay. Its only job is helping two browsers find each
// other; once connected, all game traffic goes peer-to-peer. That means it uses
// almost no bandwidth and a free tier is genuinely enough.
//
// Run locally:   npm install && npm start
// Then in the game's Settings, enter:   localhost:9000:/

const { PeerServer } = require('peer');

const port = Number(process.env.PORT) || 9000;

PeerServer({
  port,
  host: '0.0.0.0',        // required by most hosts, which bind an external interface
  path: '/',
  proxied: true,           // trust X-Forwarded-For; hosts terminate TLS in front of us
  allow_discovery: false,  // don't expose a list of every active room
  key: 'peerjs',           // the client default; change it in both places if you like
  concurrent_limit: 200
});

console.log(`Jury's Out signaling server listening on port ${port}`);
