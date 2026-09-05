const express = require('express');
const { createRoom, joinRoom, listMyRooms, getRoom } = require('../controllers/roomController');
const { requireAuth, requireRoomMembership } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/', createRoom);
router.post('/join', joinRoom);
router.get('/', listMyRooms);
router.get('/:roomId', requireRoomMembership, getRoom);

module.exports = router;
