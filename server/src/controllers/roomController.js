const Room = require('../models/Room');
const { asyncHandler } = require('../utils/asyncHandler');

const createRoom = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const room = await Room.create({ name, members: [req.userId], createdBy: req.userId });
  res.status(201).json({ room });
});

const joinRoom = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: 'inviteCode is required' });

  const room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!room) return res.status(404).json({ error: 'No room found with that invite code' });

  if (!room.members.some((m) => m.toString() === req.userId)) {
    room.members.push(req.userId);
    await room.save();
  }
  res.json({ room });
});

const listMyRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ members: req.userId }).populate('members', 'name email');
  res.json({ rooms });
});

const getRoom = asyncHandler(async (req, res) => {
  const room = await req.room.populate('members', 'name email');
  res.json({ room });
});

module.exports = { createRoom, joinRoom, listMyRooms, getRoom };
