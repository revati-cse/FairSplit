/**
 * Envy-graph utilities shared by the envy-cycle elimination algorithm and
 * the allocation explainer.
 *
 * An "envy graph" has one node per agent and a directed edge i -> j whenever
 * agent i strictly prefers agent j's current bundle to their own (using
 * agent i's own valuation function). These utilities work for signed item
 * values (goods are positive, chores are negative), since "envy" is just a
 * utility comparison regardless of sign.
 */

/**
 * Sum of an agent's valuations over a bundle of item ids.
 * @param {string} agentId
 * @param {string[]} bundle - item ids
 * @param {Record<string, Record<string, number>>} valuations - valuations[itemId][agentId]
 * @returns {number}
 */
function utilityOf(agentId, bundle, valuations) {
  let total = 0;
  for (const itemId of bundle) {
    const row = valuations[itemId];
    total += row && typeof row[agentId] === 'number' ? row[agentId] : 0;
  }
  return total;
}

/**
 * Build the envy graph for the current bundles.
 * @param {string[]} agents
 * @param {Record<string, string[]>} bundles - agentId -> item ids
 * @param {Record<string, Record<string, number>>} valuations
 * @returns {Map<string, Set<string>>} adjacency list, edge i -> j means i envies j
 */
function buildEnvyGraph(agents, bundles, valuations) {
  const graph = new Map(agents.map((a) => [a, new Set()]));
  for (const i of agents) {
    const ownUtility = utilityOf(i, bundles[i], valuations);
    for (const j of agents) {
      if (i === j) continue;
      const otherUtility = utilityOf(i, bundles[j], valuations);
      if (otherUtility > ownUtility) {
        graph.get(i).add(j);
      }
    }
  }
  return graph;
}

/**
 * Find a directed cycle in the envy graph, if one exists, via DFS.
 * @param {Map<string, Set<string>>} graph
 * @returns {string[]|null} cycle as an ordered list of agent ids
 *   (cycle[0] envies cycle[1], cycle[1] envies cycle[2], ..., last envies cycle[0]),
 *   or null if the graph is acyclic.
 */
function findCycle(graph) {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map();
  for (const node of graph.keys()) color.set(node, WHITE);
  const stack = [];

  function dfs(node) {
    color.set(node, GRAY);
    stack.push(node);
    for (const neighbor of graph.get(node)) {
      if (color.get(neighbor) === WHITE) {
        const found = dfs(neighbor);
        if (found) return found;
      } else if (color.get(neighbor) === GRAY) {
        const cycleStart = stack.indexOf(neighbor);
        return stack.slice(cycleStart);
      }
    }
    stack.pop();
    color.set(node, BLACK);
    return null;
  }

  for (const node of graph.keys()) {
    if (color.get(node) === WHITE) {
      const found = dfs(node);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Rotate bundles along an envy cycle: each agent in the cycle receives the
 * bundle of the agent they envy. Mutates and returns a new bundles map.
 * @param {Record<string, string[]>} bundles
 * @param {string[]} cycle - as returned by findCycle
 * @returns {Record<string, string[]>} new bundles object
 */
function rotateCycle(bundles, cycle) {
  const next = { ...bundles };
  const oldBundles = cycle.map((agent) => bundles[agent]);
  for (let k = 0; k < cycle.length; k++) {
    const agent = cycle[k];
    const enviedBundle = oldBundles[(k + 1) % cycle.length];
    next[agent] = enviedBundle;
  }
  return next;
}

/**
 * Eliminate all envy cycles by repeatedly finding and rotating a cycle.
 * Each rotation strictly increases the total utility of the agents in the
 * cycle (every agent in a cycle envies the next, so taking their bundle is
 * a strict improvement), so this process is guaranteed to terminate.
 * @param {string[]} agents
 * @param {Record<string, string[]>} bundles
 * @param {Record<string, Record<string, number>>} valuations
 * @returns {Record<string, string[]>} acyclic bundles
 */
function eliminateEnvyCycles(agents, bundles, valuations) {
  let current = bundles;
  const MAX_ITERATIONS = agents.length * agents.length + 10;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const graph = buildEnvyGraph(agents, current, valuations);
    const cycle = findCycle(graph);
    if (!cycle) return current;
    current = rotateCycle(current, cycle);
  }
  throw new Error('Envy cycle elimination did not converge; this indicates a bug in valuations input.');
}

/**
 * Agents with no incoming envy edge, i.e. nobody currently envies them.
 * A non-empty DAG always has at least one such node ("source"). Used to
 * pick who receives the next *good*: giving a good only raises the
 * recipient's own utility, so the only thing that can go wrong is someone
 * else newly envying them — which is impossible if nobody envied them yet.
 * @param {string[]} agents
 * @param {Map<string, Set<string>>} graph
 * @returns {string[]}
 */
function unenviedAgents(agents, graph) {
  const envied = new Set();
  for (const edges of graph.values()) {
    for (const target of edges) envied.add(target);
  }
  return agents.filter((a) => !envied.has(a));
}

/**
 * Agents with no outgoing envy edge, i.e. they currently envy nobody.
 * A non-empty DAG always has at least one such node ("sink"). Used to pick
 * who receives the next *chore*: giving a chore only lowers the
 * recipient's own utility, so the only thing that can go wrong is the
 * recipient newly envying someone else — which is impossible if they
 * already envied no one (their utility was already >= everyone else's,
 * from their own point of view).
 * @param {string[]} agents
 * @param {Map<string, Set<string>>} graph
 * @returns {string[]}
 */
function nonEnviousAgents(agents, graph) {
  return agents.filter((a) => graph.get(a).size === 0);
}

module.exports = {
  utilityOf,
  buildEnvyGraph,
  findCycle,
  rotateCycle,
  eliminateEnvyCycles,
  unenviedAgents,
  nonEnviousAgents,
};
