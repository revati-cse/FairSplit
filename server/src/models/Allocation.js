const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
    assignments: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    // Snapshot of explainAllocation() output at the time the allocation was
    // computed, keyed by user id, so the "explain my allocation" view is
    // reproducible even if items/valuations change afterward.
    explanation: { type: mongoose.Schema.Types.Mixed, default: {} },
    trace: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Allocation', allocationSchema);
