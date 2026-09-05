const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    type: { type: String, enum: ['good', 'chore'], required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },

    // Optional monetary expense metadata (e.g. groceries, a subscription).
    isExpense: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    splitAmong: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Per-member subjective valuation magnitude (>= 0). The algorithm
    // negates this for chores, since valuations[itemId][agentId] must be
    // <= 0 for chores and >= 0 for goods.
    valuations: { type: Map, of: Number, default: {} },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    allocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Allocation', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

itemSchema.methods.signedValuationFor = function signedValuationFor(userId) {
  const magnitude = this.valuations.get(String(userId)) || 0;
  return this.type === 'chore' ? -Math.abs(magnitude) : Math.abs(magnitude);
};

// Serialize the valuations Map as a plain object so API consumers (the
// React frontend) can index it with `item.valuations[userId]` directly.
itemSchema.set('toJSON', { flattenMaps: true });

module.exports = mongoose.model('Item', itemSchema);
