/**
 * Convert Room members + unassigned Item documents into the plain-object
 * contract expected by computeEF1Allocation.
 */
function buildAllocationInput(members, itemDocs) {
  const agents = members.map((m) => String(m._id || m));
  const items = itemDocs.map((doc) => ({ id: String(doc._id), type: doc.type }));

  const valuations = {};
  for (const doc of itemDocs) {
    const itemId = String(doc._id);
    valuations[itemId] = {};
    for (const agent of agents) {
      valuations[itemId][agent] = doc.signedValuationFor(agent);
    }
  }

  return { agents, items, valuations };
}

module.exports = { buildAllocationInput };
