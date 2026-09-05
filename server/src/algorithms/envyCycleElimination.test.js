const { computeEF1Allocation, bundleUtility } = require('./envyCycleElimination');
const { explainAllocation } = require('./explainAllocation');
const { makeRng, randomInstance } = require('./testUtils');

function allItemIdsAssignedExactlyOnce(bundles, items) {
  const assigned = Object.values(bundles).flat();
  const expected = items.map((i) => i.id);
  expect(assigned.slice().sort()).toEqual(expected.slice().sort());
}

describe('computeEF1Allocation - basic correctness', () => {
  it('throws on empty agents', () => {
    expect(() => computeEF1Allocation({ agents: [], items: [], valuations: {} })).toThrow();
  });

  it('throws on duplicate agent ids', () => {
    expect(() =>
      computeEF1Allocation({ agents: ['a', 'a'], items: [], valuations: {} })
    ).toThrow();
  });

  it('rejects an item whose valuation sign disagrees with its declared type', () => {
    const items = [{ id: 'i1', type: 'good' }];
    const valuations = { i1: { a: -5 } };
    expect(() => computeEF1Allocation({ agents: ['a'], items, valuations })).toThrow();
  });

  it('rejects an item missing a type', () => {
    const items = [{ id: 'i1' }];
    const valuations = { i1: { a: 5 } };
    expect(() => computeEF1Allocation({ agents: ['a'], items, valuations })).toThrow();
  });

  it('gives everything to a single agent', () => {
    const items = [{ id: 'i1', type: 'good' }, { id: 'i2', type: 'chore' }];
    const valuations = { i1: { solo: 5 }, i2: { solo: -3 } };
    const { bundles } = computeEF1Allocation({ agents: ['solo'], items, valuations });
    expect(bundles.solo.sort()).toEqual(['i1', 'i2']);
  });

  it('handles an empty item list', () => {
    const { bundles } = computeEF1Allocation({ agents: ['a', 'b'], items: [], valuations: {} });
    expect(bundles).toEqual({ a: [], b: [] });
  });

  it('assigns every item exactly once', () => {
    const items = [
      { id: 'i1', type: 'good' },
      { id: 'i2', type: 'chore' },
      { id: 'i3', type: 'good' },
      { id: 'i4', type: 'chore' },
    ];
    const valuations = {
      i1: { a: 5, b: 3 },
      i2: { a: -2, b: -8 },
      i3: { a: 1, b: 9 },
      i4: { a: -4, b: -1 },
    };
    const { bundles } = computeEF1Allocation({ agents: ['a', 'b'], items, valuations });
    allItemIdsAssignedExactlyOnce(bundles, items);
  });

  it('respects a custom processing order but still allocates every item', () => {
    const items = [
      { id: 'i1', type: 'good' },
      { id: 'i2', type: 'good' },
      { id: 'i3', type: 'chore' },
    ];
    const valuations = { i1: { a: 1, b: 2 }, i2: { a: 3, b: 1 }, i3: { a: -1, b: -2 } };
    const { bundles } = computeEF1Allocation({
      agents: ['a', 'b'],
      items,
      valuations,
      order: ['i3', 'i1', 'i2'],
    });
    allItemIdsAssignedExactlyOnce(bundles, items);
  });

  it('rejects an order that does not match the item set', () => {
    const items = [{ id: 'i1', type: 'good' }, { id: 'i2', type: 'good' }];
    expect(() =>
      computeEF1Allocation({ agents: ['a'], items, valuations: {}, order: ['i1'] })
    ).toThrow();
  });
});

describe('computeEF1Allocation - only goods (classic case)', () => {
  it('gives a good to the unenvied agent who values it most', () => {
    // Two agents, one very valuable good: whoever gets it first should be
    // whichever agent values it most, since both start unenvied.
    const items = [{ id: 'gold', type: 'good' }];
    const valuations = { gold: { a: 3, b: 9 } };
    const { bundles } = computeEF1Allocation({ agents: ['a', 'b'], items, valuations });
    expect(bundles.b).toContain('gold');
  });

  it('alternates fairly across many identical-value goods', () => {
    const items = Array.from({ length: 6 }, (_, k) => ({ id: `g${k}`, type: 'good' }));
    const valuations = {};
    for (const item of items) valuations[item.id] = { a: 1, b: 1 };
    const { bundles } = computeEF1Allocation({ agents: ['a', 'b'], items, valuations });
    expect(bundles.a.length).toBe(3);
    expect(bundles.b.length).toBe(3);
  });
});

describe('computeEF1Allocation - only chores', () => {
  it('distributes disutility so nobody envies by more than one chore', () => {
    const items = Array.from({ length: 5 }, (_, k) => ({ id: `c${k}`, type: 'chore' }));
    const valuations = {};
    for (const item of items) valuations[item.id] = { a: -4, b: -4 };
    const { bundles } = computeEF1Allocation({ agents: ['a', 'b'], items, valuations });
    const { isEF1 } = explainAllocation(['a', 'b'], bundles, valuations);
    expect(isEF1).toBe(true);
    expect(Math.abs(bundles.a.length - bundles.b.length)).toBeLessThanOrEqual(1);
  });

  it('assigns a chore to an agent even when only one candidate envies nobody', () => {
    // Regression test: after assigning a chore, the recipient's own utility
    // drops, which can make *them* newly envy someone else. EF1 must still
    // hold via the "remove the chore from your own bundle" witness.
    const items = [
      { id: 'g1', type: 'good' },
      { id: 'g2', type: 'good' },
      { id: 'c1', type: 'chore' },
    ];
    const valuations = {
      g1: { a: 8, b: 1 },
      g2: { a: 1, b: 9 },
      c1: { a: -7, b: -9 },
    };
    const { bundles } = computeEF1Allocation({ agents: ['a', 'b'], items, valuations });
    allItemIdsAssignedExactlyOnce(bundles, items);
    const { isEF1 } = explainAllocation(['a', 'b'], bundles, valuations);
    expect(isEF1).toBe(true);
  });
});

describe('computeEF1Allocation - mixed goods and chores', () => {
  it('produces an EF1 allocation on a small hand-built instance', () => {
    const agents = ['alice', 'bob', 'carol'];
    const items = [
      { id: 'tv', type: 'good' },
      { id: 'trash', type: 'chore' },
      { id: 'couch', type: 'good' },
      { id: 'dishes', type: 'chore' },
      { id: 'rug', type: 'good' },
    ];
    const valuations = {
      tv: { alice: 10, bob: 2, carol: 5 },
      trash: { alice: -1, bob: -5, carol: -2 },
      couch: { alice: 3, bob: 8, carol: 4 },
      dishes: { alice: -6, bob: -1, carol: -3 },
      rug: { alice: 2, bob: 2, carol: 9 },
    };
    const { bundles } = computeEF1Allocation({ agents, items, valuations });
    allItemIdsAssignedExactlyOnce(bundles, items);
    const { isEF1 } = explainAllocation(agents, bundles, valuations);
    expect(isEF1).toBe(true);
  });

  it('forces at least one envy-cycle rotation and still yields EF1', () => {
    // Constructed so that after the first few items, a 3-cycle must occur.
    const agents = ['a', 'b', 'c'];
    const items = [
      { id: 'i0', type: 'good' }, { id: 'i1', type: 'good' }, { id: 'i2', type: 'good' },
      { id: 'i3', type: 'good' }, { id: 'i4', type: 'good' }, { id: 'i5', type: 'good' },
    ];
    const valuations = {
      i0: { a: 5, b: 1, c: 1 },
      i1: { a: 1, b: 5, c: 1 },
      i2: { a: 1, b: 1, c: 5 },
      i3: { a: 1, b: 1, c: 20 }, // makes c strongly preferred by a and b
      i4: { a: 20, b: 1, c: 1 },
      i5: { a: 1, b: 20, c: 1 },
    };
    const { bundles, trace } = computeEF1Allocation({ agents, items, valuations });
    allItemIdsAssignedExactlyOnce(bundles, items);
    const { isEF1 } = explainAllocation(agents, bundles, valuations);
    expect(isEF1).toBe(true);
    expect(trace.length).toBe(items.length);
  });
});

describe('computeEF1Allocation - property-based EF1 verification', () => {
  const rng = makeRng(42);
  const configs = [
    { numAgents: 2, numItems: 5 },
    { numAgents: 3, numItems: 8 },
    { numAgents: 4, numItems: 12 },
    { numAgents: 5, numItems: 15 },
  ];

  for (const config of configs) {
    for (let trial = 0; trial < 15; trial++) {
      it(`is EF1 for a random instance (${config.numAgents} agents, ${config.numItems} items, trial ${trial})`, () => {
        const instance = randomInstance(rng, config);
        const { bundles } = computeEF1Allocation(instance);
        allItemIdsAssignedExactlyOnce(bundles, instance.items);
        const { isEF1, perAgent } = explainAllocation(instance.agents, bundles, instance.valuations);
        if (!isEF1) {
          // Provide a helpful failure message.
          throw new Error(`Allocation was not EF1: ${JSON.stringify(perAgent, null, 2)}`);
        }
        expect(isEF1).toBe(true);
      });
    }
  }
});

describe('bundleUtility', () => {
  it('re-exports utility computation', () => {
    const valuations = { x: { a: 4 } };
    expect(bundleUtility('a', ['x'], valuations)).toBe(4);
  });
});
