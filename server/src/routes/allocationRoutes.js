const express = require('express');
const {
  runAllocation,
  listAllocations,
  getAllocation,
  getSettleUp,
} = require('../controllers/allocationController');
const { requireAuth, requireRoomMembership } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireRoomMembership);

router.post('/', runAllocation);
router.get('/', listAllocations);
router.get('/settle-up', getSettleUp);
router.get('/:allocationId', getAllocation);

module.exports = router;
