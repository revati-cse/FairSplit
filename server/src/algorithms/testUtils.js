// Deterministic PRNG (mulberry32) so property-based tests are reproducible.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Build a random mixed-manna instance: some items are goods (positive
 * value to everyone within a range), some are chores (negative value to
 * everyone within a range), with per-agent noise so valuations differ.
 */
function randomInstance(rng, { numAgents, numItems }) {
  const agents = Array.from({ length: numAgents }, (_, k) => `agent-${k}`);
  const valuations = {};
  const items = Array.from({ length: numItems }, (_, k) => {
    const isChore = rng() < 0.5;
    const id = `item-${k}`;
    valuations[id] = {};
    for (const agent of agents) {
      const magnitude = randomInt(rng, 1, 10);
      valuations[id][agent] = isChore ? -magnitude : magnitude;
    }
    return { id, type: isChore ? 'chore' : 'good' };
  });
  return { agents, items, valuations };
}

module.exports = { makeRng, randomInt, randomInstance };
