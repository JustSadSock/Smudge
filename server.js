import http from 'http';
import { WebSocketServer } from 'ws';

const port = process.env.PORT || 1234;
const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms = new Map();

function broadcast(room, msg, except) {
  rooms.get(room)?.forEach(client => {
    if (client !== except && client.readyState === client.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', ws => {
  let room = null;
  ws.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'join') {
        room = msg.code;
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room).add(ws);
      } else if (msg.type === 'draw' && room) {
        broadcast(room, JSON.stringify(msg), ws);
      }
    } catch {}
  });
  ws.on('close', () => {
    if (room && rooms.has(room)) {
      rooms.get(room).delete(ws);
      if (rooms.get(room).size === 0) rooms.delete(room);
    }
  });
});

server.listen(port, () => {
  console.log('Smudge server listening on', port);
});
