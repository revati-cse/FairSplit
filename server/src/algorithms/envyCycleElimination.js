const {
  buildEnvyGraph,
  eliminateEnvyCycles,
  unenviedAgents,
  nonEnviousAgents,
  utilityOf,
} = require('./envyGraph');

/**
 * Envy-cycle elimination algorithm (Lipton, Markakis, Mossel & Saberi, 2004),
 * extended to handle chores (disutility items) as well as goods — the
 * "mixed manna" setting — using the dual selection rule for chores that
 * appears in the fair-division literature on chore division via envy-graph
 * procedures (e.g. Bhaskar, Sricharan & Vaish, 2021; see README.md).
 *
 * Items are processed one at a time, in `order`. Every item carries a
 * `type` of 'good' or 'chore', which is fixed (the same for every agent —
 * agents can disagree on *how much* they like/dislike an item, but not on
 * whether it is a good or a chore). For each item:
 *
 *   1. Resolve any envy cycles in the current envy graph by rotating
 *      bundles around the cycle (every agent in a cycle strictly gains
 *      utility from taking the bundle they envy, so this always
 *      terminates, and it never introduces new envy — see README.md).
 *   2. Pick the recipient:
 *      - For a GOOD: among agents nobody currently envies (in-degree 0 in
 *        the now-acyclic envy graph), assign to whoever values it most.
 *        Giving a good only raises the recipient's own utility, so the
 *        only risk is someone else newly envying them — impossible if
 *        nobody envied them to begin with.
 *      - For a CHORE: among agents who currently envy nobody (out-degree
 *        0), assign to whoever is hurt least (highest, i.e. least
 *        negative, value). Giving a chore only lowers the recipient's own
 *        utility, so the only risk is the recipient newly envying someone
 *        else — impossible if they already envied no one.
 *
 * Both branches maintain the same EF1 invariant: whenever agent i envies
 * agent j's bundle, that envy can be eliminated by removing a single item
 * — either a good from j's bundle, or a chore from i's own bundle. See
 * `explainAllocation.js` for the checker that makes this concrete, and
 * README.md for the full proof sketch and citations.
 *
 * @param {Object} input
 * @param {string[]} input.agents - agent ids, must be non-empty
 * @param {Array<{id: string, type: 'good'|'chore'}>} input.items - items to allocate
 * @param {Record<string, Record<string, number>>} input.valuations -
 *   valuations[itemId][agentId] = signed value of that item to that agent.
 *   Must be >= 0 for every agent on a 'good' item and <= 0 for every agent
 *   on a 'chore' item (the sign is determined by the item's type; agents
 *   only vary in magnitude). Missing entries default to 0.
 * @param {string[]} [input.order] - optional processing order of item ids;
 *   defaults to the order items are given in. Order does not affect the
 *   EF1 guarantee, only which specific allocation is produced.
 * @returns {{
 *   bundles: Record<string, string[]>,
 *   trace: Array<{itemId: string, type: string, assignedTo: string, candidates: string[], cyclesResolved: number}>
 * }}
 */
function computeEF1Allocation({ agents, items, valuations, order }) {
  if (!Array.isArray(agents) || agents.length === 0) {
    throw new Error('computeEF1Allocation requires at least one agent');
  }
  const uniqueAgents = new Set(agents);
  if (uniqueAgents.size !== agents.length) {
    throw new Error('computeEF1Allocation requires unique agent ids');
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const processingOrder = order || items.map((item) => item.id);
  if (processingOrder.length !== itemsById.size) {
    throw new Error('order must contain exactly the ids present in items');
  }

  validateSignsMatchType(agents, itemsById, valuations);

  let bundles = Object.fromEntries(agents.map((a) => [a, []]));
  const trace = [];

  for (const itemId of processingOrder) {
    const item = itemsById.get(itemId);
    if (!item) {
      throw new Error(`Unknown item id in processing order: ${itemId}`);
    }
    if (item.type !== 'good' && item.type !== 'chore') {
      throw new Error(`Item ${itemId} must have type 'good' or 'chore'`);
    }

    const beforeCycleElimination = bundles;
    bundles = eliminateEnvyCycles(agents, bundles, valuations);
    const cyclesResolved = countRotations(agents, beforeCycleElimination, bundles);

    const graph = buildEnvyGraph(agents, bundles, valuations);
    const candidates = item.type === 'good' ? unenviedAgents(agents, graph) : nonEnviousAgents(agents, graph);

    let recipient = candidates[0];
    let bestValue = valueOf(itemId, recipient, valuations);
    for (const candidate of candidates.slice(1)) {
      const value = valueOf(itemId, candidate, valuations);
      if (value > bestValue) {
        bestValue = value;
        recipient = candidate;
      }
    }

    bundles = { ...bundles, [recipient]: [...bundles[recipient], itemId] };
    trace.push({
      itemId,
      type: item.type,
      assignedTo: recipient,
      candidates,
      cyclesResolved,
    });
  }

  return { bundles, trace };
}

function valueOf(itemId, agentId, valuations) {
  const row = valuations[itemId];
  return row && typeof row[agentId] === 'number' ? row[agentId] : 0;
}

function validateSignsMatchType(agents, itemsById, valuations) {
  for (const [itemId, item] of itemsById) {
    const row = valuations[itemId] || {};
    for (const agent of agents) {
      const value = typeof row[agent] === 'number' ? row[agent] : 0;
      if (item.type === 'good' && value < 0) {
        throw new Error(`Item ${itemId} is a good but has a negative valuation for agent ${agent}`);
      }
      if (item.type === 'chore' && value > 0) {
        throw new Error(`Item ${itemId} is a chore but has a positive valuation for agent ${agent}`);
      }
    }
  }
}

// Rotation count is informational only (for the trace/UI); it does not
// affect correctness. We approximate it by comparing bundle identity
// before/after, which is sufficient for surfacing "how much churn happened".
function countRotations(agents, before, after) {
  let changed = 0;
  for (const agent of agents) {
    if (before[agent] !== after[agent]) changed++;
  }
  return changed;
}

/**
 * Utility helper re-exported for convenience in API layers/tests.
 */
function bundleUtility(agentId, bundle, valuations) {
  return utilityOf(agentId, bundle, valuations);
}

module.exports = { computeEF1Allocation, bundleUtility };
