const { explainAllocation } = require('./explainAllocation');
const { computeEF1Allocation } = require('./envyCycleElimination');

describe('explainAllocation', () => {
  it('reports no envy entries when there is no envy', () => {
    const agents = ['a', 'b'];
    const bundles = { a: ['x'], b: ['y'] };
    const valuations = { x: { a: 10, b: 1 }, y: { a: 1, b: 10 } };
    const { isEF1, perAgent } = explainAllocation(agents, bundles, valuations);
    expect(isEF1).toBe(true);
    expect(perAgent.a).toEqual([]);
    expect(perAgent.b).toEqual([]);
  });

  it('finds the eliminating item for straightforward envy', () => {
    const agents = ['a', 'b'];
    // b's bundle has two items; a envies b overall, but removing 'big' fixes it.
    const bundles = { a: ['small'], b: ['med', 'big'] };
    const valuations = {
      small: { a: 2, b: 2 },
      med: { a: 1, b: 1 },
      big: { a: 10, b: 1 },
    };
    const { isEF1, perAgent } = explainAllocation(agents, bundles, valuations);
    expect(isEF1).toBe(true);
    expect(perAgent.a).toHaveLength(1);
    expect(perAgent.a[0].envies).toBe('b');
    expect(perAgent.a[0].eliminatingItem).toBe('big');
    expect(perAgent.a[0].envyAfterRemoval).toBeLessThanOrEqual(0);
  });

  it('flags isEF1=false when no single item removal can eliminate envy', () => {
    const agents = ['a', 'b'];
    const bundles = { a: [], b: ['x', 'y'] };
    // a envies b by 10; removing either single item only reduces envy to 5.
    const valuations = { x: { a: 5, b: 1 }, y: { a: 5, b: 1 } };
    const { isEF1, perAgent } = explainAllocation(agents, bundles, valuations);
    expect(isEF1).toBe(false);
    expect(perAgent.a[0].resolved).toBe(false);
    expect(perAgent.a[0].eliminatingItem).toBeNull();
  });

  it('handles chores: removing a chore from the envied agent bundle can also eliminate envy', () => {
    // Envy toward someone who was given a chore that i also dislikes: if
    // i envies j but j's bundle contains a chore i dislikes even more,
    // removing that chore only makes j's bundle *more* attractive, so it
    // cannot be the eliminating item; this test ensures we don't
    // incorrectly select a chore as a witness when it wouldn't help.
    const agents = ['a', 'b'];
    const bundles = { a: ['goodA'], b: ['goodB', 'chore'] };
    const valuations = {
      goodA: { a: 4, b: 4 },
      goodB: { a: 6, b: 6 },
      chore: { a: -1, b: -1 },
    };
    // a's utility: 4. b's bundle valued by a: 6 - 1 = 5. envy = 1.
    // Removing 'goodB' (value 6 to a): remaining chore only = -1, envyAfter = -1-4 <0 -> resolved.
    // Removing 'chore' (value -1 to a): remaining goodB = 6, envyAfter = 6-4=2 -> not resolved by this item.
    const { perAgent } = explainAllocation(agents, bundles, valuations);
    expect(perAgent.a[0].eliminatingItem).toBe('goodB');
  });

  it('produces a resolved explanation for every envious pair on an EF1-guaranteed allocation', () => {
    const agents = ['a', 'b', 'c', 'd'];
    const valuations = {};
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const items = Array.from({ length: 10 }, (_, k) => {
      const id = `i${k}`;
      valuations[id] = {};
      const isChore = rand() < 0.5;
      for (const agent of agents) {
        const mag = 1 + Math.floor(rand() * 9);
        valuations[id][agent] = isChore ? -mag : mag;
      }
      return { id, type: isChore ? 'chore' : 'good' };
    });
    const { bundles } = computeEF1Allocation({ agents, items, valuations });
    const { isEF1, perAgent } = explainAllocation(agents, bundles, valuations);
    expect(isEF1).toBe(true);
    for (const agent of agents) {
      for (const entry of perAgent[agent]) {
        expect(entry.resolved).toBe(true);
      }
    }
  });
});
