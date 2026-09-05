const Item = require('../models/Item');
const Allocation = require('../models/Allocation');
const { computeEF1Allocation } = require('../algorithms/envyCycleElimination');
const { explainAllocation } = require('../algorithms/explainAllocation');
const { computeBalancesFromExpenses, simplifyDebts } = require('../algorithms/debtSimplification');
const { buildAllocationInput } = require('../utils/buildAllocationInput');
const { asyncHandler } = require('../utils/asyncHandler');

const runAllocation = asyncHandler(async (req, res) => {
  const room = await req.room.populate('members', 'name email');
  const unassignedItems = await Item.find({ room: room._id, assignedTo: null });

  if (unassignedItems.length === 0) {
    return res.status(400).json({ error: 'No unassigned items to allocate' });
  }

  const { agents, items, valuations } = buildAllocationInput(room.members, unassignedItems);
  const { bundles, trace } = computeEF1Allocation({ agents, items, valuations });
  const { isEF1, perAgent } = explainAllocation(agents, bundles, valuations);

  const itemsById = new Map(unassignedItems.map((doc) => [String(doc._id), doc]));
  const assignments = [];
  for (const [agentId, itemIds] of Object.entries(bundles)) {
    for (const itemId of itemIds) {
      assignments.push({ item: itemId, user: agentId });
    }
  }

  const allocation = await Allocation.create({
    room: room._id,
    items: unassignedItems.map((doc) => doc._id),
    assignments,
    explanation: perAgent,
    trace,
    createdBy: req.userId,
  });

  await Promise.all(
    assignments.map(({ item, user }) =>
      itemsById.get(item).updateOne({ assignedTo: user, allocation: allocation._id })
    )
  );

  res.status(201).json({ allocation, isEF1 });
});

const listAllocations = asyncHandler(async (req, res) => {
  const allocations = await Allocation.find({ room: req.room._id }).sort({ createdAt: -1 });
  res.json({ allocations });
});

const getAllocation = asyncHandler(async (req, res) => {
  const allocation = await Allocation.findOne({ _id: req.params.allocationId, room: req.room._id })
    .populate('items')
    .populate('assignments.user', 'name email')
    .populate('assignments.item');
  if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
  res.json({ allocation });
});

const getSettleUp = asyncHandler(async (req, res) => {
  const room = await req.room.populate('members', 'name email');
  const expenseItems = await Item.find({ room: room._id, isExpense: true });

  const memberIds = room.members.map((m) => String(m._id));
  const expenses = expenseItems.map((doc) => ({
    paidBy: String(doc.paidBy),
    amount: doc.amount,
    splitAmong: doc.splitAmong.map(String),
  }));

  const balances = computeBalancesFromExpenses(memberIds, expenses);
  const transactions = simplifyDebts(balances);

  const memberById = Object.fromEntries(room.members.map((m) => [String(m._id), m]));
  res.json({
    balances: Object.fromEntries(Object.entries(balances).map(([id, amount]) => [id, { user: memberById[id], amount }])),
    transactions: transactions.map((t) => ({ from: memberById[t.from], to: memberById[t.to], amount: t.amount })),
  });
});

module.exports = { runAllocation, listAllocations, getAllocation, getSettleUp };
