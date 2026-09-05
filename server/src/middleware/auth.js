const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function requireRoomMembership(req, res, next) {
  const Room = require('../models/Room');
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (!room.members.some((m) => m.toString() === req.userId)) {
    return res.status(403).json({ error: 'You are not a member of this room' });
  }
  req.room = room;
  next();
}

module.exports = { requireAuth, requireRoomMembership };
