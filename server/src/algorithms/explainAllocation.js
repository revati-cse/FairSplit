const { utilityOf } = require('./envyGraph');

/**
 * "Explain my allocation": for every pair of agents (i, j) where i envies
 * j's bundle, find a single item whose removal eliminates that envy. This
 * makes the EF1 (envy-free up to one item) guarantee concrete and visible
 * to end users.
 *
 * For mixed goods and chores, EF1 is defined two-sidedly (see README.md
 * and e.g. Aziz, Caragiannis, Igarashi & Walsh, 2022): the envy can be
 * eliminated either by
 *   (a) removing an item from the ENVIED agent's bundle ("if they didn't
 *       have the coffee maker, you wouldn't envy them"), or
 *   (b) removing an item from the ENVIER's OWN bundle ("if you didn't
 *       have to take out the trash, you wouldn't envy them").
 * Both are checked; whichever produces a valid witness is reported, with
 * `location` indicating which bundle it came from.
 *
 * If the allocation was produced by computeEF1Allocation, a witness is
 * always guaranteed to exist for every envious pair (that is precisely
 * what EF1 means). This module works on *any* allocation, though, so it
 * doubles as an EF1 auditor for allocations from other sources.
 *
 * @param {string[]} agents
 * @param {Record<string, string[]>} bundles - agentId -> item ids
 * @param {Record<string, Record<string, number>>} valuations - valuations[itemId][agentId]
 * @returns {{
 *   isEF1: boolean,
 *   perAgent: Record<string, Array<{
 *     envies: string,
 *     envyBefore: number,
 *     eliminatingItem: string|null,
 *     location: 'their-bundle'|'your-bundle'|null,
 *     envyAfterRemoval: number|null,
 *     resolved: boolean
 *   }>>
 * }}
 */
function explainAllocation(agents, bundles, valuations) {
  const perAgent = Object.fromEntries(agents.map((a) => [a, []]));
  let isEF1 = true;

  for (const i of agents) {
    const ownUtility = utilityOf(i, bundles[i], valuations);
    for (const j of agents) {
      if (i === j) continue;
      const otherUtility = utilityOf(i, bundles[j], valuations);
      const envyBefore = otherUtility - ownUtility;
      if (envyBefore <= 0) continue; // i does not envy j

      const witness = findEnvyEliminatingItem(i, bundles[i], bundles[j], valuations, ownUtility, otherUtility);
      const resolved = witness !== null;
      if (!resolved) isEF1 = false;

      perAgent[i].push({
        envies: j,
        envyBefore,
        eliminatingItem: witness ? witness.itemId : null,
        location: witness ? witness.location : null,
        envyAfterRemoval: witness ? witness.envyAfter : null,
        resolved,
      });
    }
  }

  return { isEF1, perAgent };
}

/**
 * Search both bundles for a single-item removal that eliminates i's envy
 * of j. Prefers whichever witness leaves the smallest (most negative)
 * residual gap, purely for a more convincing explanation; existence is
 * all that matters for the EF1 guarantee itself.
 */
function findEnvyEliminatingItem(i, bundleI, bundleJ, valuations, ownUtility, otherUtility) {
  let best = null;

  // (a) remove an item from the envied agent's bundle
  for (const itemId of bundleJ) {
    const valueToI = valueOf(itemId, i, valuations);
    const envyAfter = otherUtility - valueToI - ownUtility;
    if (envyAfter <= 0 && (best === null || envyAfter < best.envyAfter)) {
      best = { itemId, location: 'their-bundle', envyAfter };
    }
  }

  // (b) remove an item from the envier's own bundle
  for (const itemId of bundleI) {
    const valueToI = valueOf(itemId, i, valuations);
    const envyAfter = otherUtility - (ownUtility - valueToI);
    if (envyAfter <= 0 && (best === null || envyAfter < best.envyAfter)) {
      best = { itemId, location: 'your-bundle', envyAfter };
    }
  }

  return best;
}

function valueOf(itemId, agentId, valuations) {
  const row = valuations[itemId];
  return row && typeof row[agentId] === 'number' ? row[agentId] : 0;
}

module.exports = { explainAllocation };
