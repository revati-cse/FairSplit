const express = require('express');
const { addItem, listItems, submitValuation, deleteItem } = require('../controllers/itemController');
const { requireAuth, requireRoomMembership } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireRoomMembership);

router.post('/', addItem);
router.get('/', listItems);
router.put('/:itemId/valuation', submitValuation);
router.delete('/:itemId', deleteItem);

module.exports = router;
