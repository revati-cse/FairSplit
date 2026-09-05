const {
  utilityOf,
  buildEnvyGraph,
  findCycle,
  rotateCycle,
  eliminateEnvyCycles,
  unenviedAgents,
} = require('./envyGraph');

describe('utilityOf', () => {
  it('sums valuations for the given agent over the bundle', () => {
    const valuations = { a: { alice: 5, bob: 2 }, b: { alice: -3, bob: 1 } };
    expect(utilityOf('alice', ['a', 'b'], valuations)).toBe(2);
    expect(utilityOf('bob', ['a', 'b'], valuations)).toBe(3);
  });

  it('treats missing entries as zero', () => {
    const valuations = { a: { alice: 5 } };
    expect(utilityOf('bob', ['a'], valuations)).toBe(0);
  });

  it('returns 0 for an empty bundle', () => {
    expect(utilityOf('alice', [], {})).toBe(0);
  });
});

describe('buildEnvyGraph', () => {
  it('creates an edge i->j when i strictly prefers j\'s bundle', () => {
    const agents = ['alice', 'bob'];
    const bundles = { alice: ['x'], bob: ['y'] };
    // alice values x at 1, y at 10 -> alice envies bob
    // bob values x at 1, y at 2 -> bob does not envy alice
    const valuations = {
      x: { alice: 1, bob: 1 },
      y: { alice: 10, bob: 2 },
    };
    const graph = buildEnvyGraph(agents, bundles, valuations);
    expect(graph.get('alice').has('bob')).toBe(true);
    expect(graph.get('bob').has('alice')).toBe(false);
  });

  it('creates no edge on ties (strict preference required)', () => {
    const agents = ['alice', 'bob'];
    const bundles = { alice: ['x'], bob: ['y'] };
    const valuations = { x: { alice: 5, bob: 5 }, y: { alice: 5, bob: 5 } };
    const graph = buildEnvyGraph(agents, bundles, valuations);
    expect(graph.get('alice').size).toBe(0);
    expect(graph.get('bob').size).toBe(0);
  });
});

describe('findCycle', () => {
  it('returns null for an acyclic graph', () => {
    const graph = new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['c'])],
      ['c', new Set()],
    ]);
    expect(findCycle(graph)).toBeNull();
  });

  it('detects a simple 3-cycle', () => {
    const graph = new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['c'])],
      ['c', new Set(['a'])],
    ]);
    const cycle = findCycle(graph);
    expect(cycle).not.toBeNull();
    expect(cycle.length).toBe(3);
    // verify it's actually a rotation of a->b->c->a
    const startIdx = cycle.indexOf('a');
    const rotated = [...cycle.slice(startIdx), ...cycle.slice(0, startIdx)];
    expect(rotated).toEqual(['a', 'b', 'c']);
  });

  it('detects a 2-cycle (mutual envy)', () => {
    const graph = new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['a'])],
    ]);
    const cycle = findCycle(graph);
    expect(cycle.length).toBe(2);
  });
});

describe('rotateCycle', () => {
  it('rotates bundles so each agent receives the bundle of the agent they envy', () => {
    const bundles = { a: ['1'], b: ['2'], c: ['3'] };
    const cycle = ['a', 'b', 'c']; // a envies b, b envies c, c envies a
    const result = rotateCycle(bundles, cycle);
    expect(result.a).toEqual(['2']);
    expect(result.b).toEqual(['3']);
    expect(result.c).toEqual(['1']);
  });

  it('handles a 2-cycle as a swap', () => {
    const bundles = { a: ['1'], b: ['2'] };
    const result = rotateCycle(bundles, ['a', 'b']);
    expect(result.a).toEqual(['2']);
    expect(result.b).toEqual(['1']);
  });

  it('does not mutate agents outside the cycle', () => {
    const bundles = { a: ['1'], b: ['2'], c: ['3'] };
    const result = rotateCycle(bundles, ['a', 'b']);
    expect(result.c).toEqual(['3']);
  });
});

describe('eliminateEnvyCycles', () => {
  it('leaves an already-acyclic allocation unchanged', () => {
    const agents = ['a', 'b'];
    const bundles = { a: ['x'], b: ['y'] };
    const valuations = { x: { a: 10, b: 1 }, y: { a: 1, b: 10 } };
    const result = eliminateEnvyCycles(agents, bundles, valuations);
    expect(result).toEqual(bundles);
  });

  it('resolves a 3-cycle so the resulting envy graph is acyclic', () => {
    const agents = ['a', 'b', 'c'];
    // Each agent values the *next* agent's single item far more than their own.
    const bundles = { a: ['x'], b: ['y'], c: ['z'] };
    const valuations = {
      x: { a: 1, b: 1, c: 100 }, // c envies a
      y: { a: 100, b: 1, c: 1 }, // a envies b
      z: { a: 1, b: 100, c: 1 }, // b envies c
    };
    const result = eliminateEnvyCycles(agents, bundles, valuations);
    const graph = buildEnvyGraph(agents, result, valuations);
    expect(findCycle(graph)).toBeNull();
  });

  it('resolves a mutual (2-agent) envy cycle', () => {
    const agents = ['a', 'b'];
    const bundles = { a: ['x'], b: ['y'] };
    const valuations = { x: { a: 1, b: 10 }, y: { a: 10, b: 1 } };
    const result = eliminateEnvyCycles(agents, bundles, valuations);
    expect(result.a).toEqual(['y']);
    expect(result.b).toEqual(['x']);
  });
});

describe('unenviedAgents', () => {
  it('returns agents with no incoming envy edge', () => {
    const agents = ['a', 'b', 'c'];
    const graph = new Map([
      ['a', new Set(['b'])],
      ['b', new Set()],
      ['c', new Set(['b'])],
    ]);
    expect(unenviedAgents(agents, graph)).toEqual(['a', 'c']);
  });

  it('returns all agents when there is no envy at all', () => {
    const agents = ['a', 'b'];
    const graph = new Map([
      ['a', new Set()],
      ['b', new Set()],
    ]);
    expect(unenviedAgents(agents, graph).sort()).toEqual(['a', 'b']);
  });
});
