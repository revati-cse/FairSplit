const Item = require('../models/Item');
const { asyncHandler } = require('../utils/asyncHandler');

const addItem = asyncHandler(async (req, res) => {
  const { type, name, description, isExpense, amount, paidBy, splitAmong } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  if (!['good', 'chore'].includes(type)) {
    return res.status(400).json({ error: "type must be 'good' or 'chore'" });
  }
  if (isExpense && (typeof amount !== 'number' || amount <= 0)) {
    return res.status(400).json({ error: 'expenses require a positive amount' });
  }

  const item = await Item.create({
    room: req.room._id,
    type,
    name,
    description: description || '',
    isExpense: Boolean(isExpense),
    amount: isExpense ? amount : 0,
    paidBy: isExpense ? paidBy || req.userId : null,
    splitAmong: isExpense ? splitAmong || req.room.members : [],
    createdBy: req.userId,
  });

  res.status(201).json({ item });
});

const listItems = asyncHandler(async (req, res) => {
  const items = await Item.find({ room: req.room._id }).sort({ createdAt: -1 });
  res.json({ items });
});

const submitValuation = asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (typeof value !== 'number' || value < 0) {
    return res.status(400).json({ error: 'value must be a non-negative number (magnitude of like/dislike)' });
  }

  const item = await Item.findOne({ _id: req.params.itemId, room: req.room._id });
  if (!item) return res.status(404).json({ error: 'Item not found in this room' });
  if (item.assignedTo) {
    return res.status(409).json({ error: 'Item has already been allocated' });
  }

  item.valuations.set(String(req.userId), value);
  await item.save();
  res.json({ item });
});

const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findOne({ _id: req.params.itemId, room: req.room._id });
  if (!item) return res.status(404).json({ error: 'Item not found in this room' });
  if (item.assignedTo) {
    return res.status(409).json({ error: 'Cannot delete an already-allocated item' });
  }
  await item.deleteOne();
  res.status(204).send();
});

module.exports = { addItem, listItems, submitValuation, deleteItem };
