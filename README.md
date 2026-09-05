# FairSplit

Envy-Free Expense & Chore Allocator for roommates. FairSplit models shared
expenses and chores as a single fair-division problem and computes an
**EF1 (envy-free up to one item)** allocation using a real implementation of
the **envy-cycle elimination algorithm** from the fair-division literature —
not an LLM guess. It also produces a minimum-transaction "settle up" summary
for actual money owed.

## Why fairness needs an algorithm, not a vibe

When you split an apartment's costs and chores, two very different — and
often conflated — problems show up:

1. **Who does/gets what?** Indivisible things (the good parking spot, taking
   out the trash, the one nice couch) have to go to *somebody*. People value
   them differently: one roommate hates dishes less than laundry; another
   would love the free concert tickets everyone else finds boring.
2. **Who owes whom money?** Shared purchases (groceries, a subscription) are
   paid for by one person up front and owed back by everyone else.

FairSplit treats (1) as a fair-division problem over **goods** (positive
value) and **chores** (negative value/disutility), and (2) as a classic
debt-simplification problem. They're solved with two different, precise
algorithms described below.

## Envy-freeness and why it usually can't be exact

An allocation is **envy-free (EF)** if no one would rather have someone
else's bundle than their own, according to their *own* valuation. EF is the
gold standard of fairness, but with **indivisible** items it frequently
doesn't exist at all:

> Two people, one item they both want. Whoever doesn't get it envies the
> other — no allocation of that single item can be envy-free.

Since exact envy-freeness can be provably impossible, fair-division theory
relaxes it to **EF1 (envy-free up to one item)**: agent *i* may envy agent
*j*, but only if removing **some single item** would eliminate that envy.
EF1 always exists for any number of agents and any additive valuations
(over goods, over chores, and — with more care — over a mix of both), and
it's the standard practical relaxation used by real fair-division systems
(e.g. Spliddit).

For **mixed** instances (goods and chores together), EF1 is defined
two-sidedly, matching the treatment in the mixed-manna fair-division
literature (Bogomolnaia, Moulin, Sandomirskiy & Yanovskaya, 2019; Aziz,
Caragiannis, Igarashi & Walsh, 2022): agent *i*'s envy of agent *j* is
eliminated if there's a single item whose removal fixes it, taken from
**either**:

- a good in *j*'s bundle ("if they didn't have the coffee maker, you
  wouldn't envy them"), or
- a chore in *i*'s **own** bundle ("if you didn't have to take out the
  trash yourself, you wouldn't envy them").

FairSplit's "explain my allocation" view (see below) surfaces exactly this
witness for every remaining envy relationship, so the guarantee isn't just
theoretical — you can see precisely which item is doing the work.

## The algorithm: envy-cycle elimination

`server/src/algorithms/` implements the classic **envy-cycle elimination**
algorithm (Lipton, Markakis, Mossel & Saberi, *"On Approximately Fair
Allocations of Indivisible Goods,"* EC 2004), extended to handle chores via
the dual selection rule used in the chore-division literature (e.g.
Bhaskar, Sricharan & Vaish, 2021).

Items are processed one at a time. At each step:

1. **Build the envy graph**: one node per agent, edge *i → j* if *i*
   currently prefers *j*'s bundle to their own.
2. **Eliminate envy cycles**: while the graph has a directed cycle, rotate
   bundles around it — each agent in the cycle hands their bundle to the
   agent they envy, and takes the bundle of the one before them. Every
   agent in a cycle strictly gains utility by definition of "envies," so
   this process is guaranteed to terminate, and — critically — it never
   *introduces* new envy (see proof sketch below).
3. **Assign the next item**:
   - If it's a **good**, give it to an agent nobody currently envies
     (in-degree 0 in the now-acyclic graph) — specifically, whichever such
     agent values it most. Giving a good only raises the recipient's own
     utility, so the only thing that could go wrong is someone else newly
     envying them, which can't happen if nobody envied them yet.
   - If it's a **chore**, give it to an agent who currently envies nobody
     (out-degree 0) — whichever such agent is hurt least. Giving a chore
     only lowers the recipient's own utility, so the only risk is the
     recipient newly envying someone else, which can't happen if they
     already envied no one.

Both branches maintain the same invariant inductively: whenever the
allocation is EF1 before adding an item, it's still EF1 after, with the
newly-added item itself always available as the eliminating witness for any
*newly created* envy. See the code comments in
`server/src/algorithms/envyCycleElimination.js` and
`server/src/algorithms/envyGraph.js` for the detailed argument, and
`envyCycleElimination.test.js` for **property-based tests** that verify EF1
holds on dozens of randomized instances (2–5 agents, 5–15 mixed items each),
not just hand-picked examples.

One modeling assumption: each item has an **objective type** (`good` or
`chore`) — its sign is fixed, though agents can disagree on *magnitude*
(how much they like/dislike it). This is what makes the dual selection rule
provably correct; fully agent-subjective signs (an item that's a good for
one roommate and a chore for another) is a harder, more theoretical variant
of mixed-manna fair division that FairSplit intentionally doesn't attempt.

### "Explain my allocation"

`server/src/algorithms/explainAllocation.js` takes a finished allocation and,
for every pair of agents where envy remains, searches both bundles for a
single item whose removal eliminates it (goods from the envied bundle,
chores from the envier's own bundle — see above). This is exactly what the
UI's "Explain my allocation" panel renders, in plain language: *"You envy
Priya. If she didn't have the standing desk, you wouldn't."*

## Settle-up: minimum-transaction debt simplification

Shared expenses (who paid, how much, split among whom) produce a **net
balance** per person: positive if they're owed money, negative if they owe
it. Naively, everyone would pay everyone else individually, but that's far
more transactions than necessary.

`server/src/algorithms/debtSimplification.js` implements the standard
greedy **min-cash-flow** heuristic (as used by apps like Splitwise): sort
people into creditors and debtors, then repeatedly match the largest
creditor with the largest debtor, transferring the smaller of the two
amounts and repeating until everyone is settled. This always produces at
most *n − 1* transactions for *n* people and runs in *O(n log n)*.

(Finding the *provably minimum* number of transactions in the worst case is
NP-hard — it's equivalent to a subset-sum-style partitioning problem — so
the greedy heuristic is the practical, standard choice; it's optimal or
near-optimal on all realistic roommate-sized instances.)

## Architecture

```
server/                     Node.js + Express + MongoDB + JWT
  src/algorithms/           Standalone, unit-tested fair-division logic
    envyGraph.js             envy graph, cycle detection, rotation
    envyCycleElimination.js  the EF1 allocation algorithm
    explainAllocation.js     EF1 witness finder ("explain my allocation")
    debtSimplification.js    balances + minimum-transaction settle-up
  src/models/                Mongoose schemas (User, Room, Item, Allocation)
  src/controllers/, routes/  REST API
  src/middleware/            JWT auth, room-membership checks, errors

client/                     React (Vite) + Tailwind CSS
  src/pages/                 Login, Register, Rooms, RoomDetail
  src/components/            Item entry, allocation results, envy
                              explanation, settle-up summary
```

### Data model

Expenses and chores are both modeled as **Items** belonging to a Room, with
a `type` of `good` or `chore`, and a per-member `valuations` map (a
non-negative magnitude; the algorithm applies the sign based on `type`). An
item can *additionally* be flagged `isExpense` with an `amount` and
`paidBy`, in which case it also feeds into the settle-up ledger — e.g.
"Groceries" is a good (everyone benefits somewhat, someone gets stuck being
responsible for the shopping) *and* a $60 expense split three ways.

## Running it

### Backend

```bash
cd server
cp .env.example .env   # set MONGO_URI and JWT_SECRET
npm install
npm run dev             # requires a running MongoDB instance
npm test                # runs the full algorithm + API test suite
```

### Frontend

```bash
cd client
npm install
npm run dev              # proxies /api to http://localhost:5000
```

### API overview

| Method & path | Description |
| --- | --- |
| `POST /api/auth/register`, `/login` | Account creation / JWT login |
| `POST /api/rooms`, `GET /api/rooms` | Create / list your rooms |
| `POST /api/rooms/join` | Join a room by invite code |
| `POST /api/rooms/:roomId/items` | Add a good/chore (optionally an expense) |
| `PUT /api/rooms/:roomId/items/:itemId/valuation` | Submit your valuation |
| `POST /api/rooms/:roomId/allocations` | Run EF1 allocation over unassigned items |
| `GET /api/rooms/:roomId/allocations/:id` | Fetch an allocation + its envy explanation |
| `GET /api/rooms/:roomId/allocations/settle-up` | Balances + minimum-transaction settle-up |

## Testing

The fair-division core is unit-tested independently of the API and UI:

- `envyGraph.test.js` — graph construction, cycle detection, rotation
- `envyCycleElimination.test.js` — correctness on hand-built goods-only,
  chores-only, and mixed instances, plus **60 randomized property-based
  trials** asserting the EF1 guarantee via `explainAllocation`
- `explainAllocation.test.js` — the witness-finding logic itself
- `debtSimplification.test.js` — balance computation and settle-up,
  including that every simplified transaction set fully zeroes all balances

```bash
cd server && npm test
```

## References

- Lipton, Markakis, Mossel & Saberi, *"On Approximately Fair Allocations of
  Indivisible Goods,"* EC 2004 — the original envy-cycle elimination
  algorithm for goods.
- Bhaskar, Sricharan & Vaish, *"On Approximate Envy-Freeness for Indivisible
  Chores and Mixed Resources,"* 2021 — the dual (chore) selection rule.
- Bogomolnaia, Moulin, Sandomirskiy & Yanovskaya, *"Dividing Bads under
  Additive Utilities,"* 2019 — mixed manna and the two-sided EF1 definition.
- Aziz, Caragiannis, Igarashi & Walsh, *"Fair Allocation of Indivisible
  Goods and Chores,"* 2022 (survey) — overview of EF1 for mixed manna.
- Caragiannis et al., *"The Unreasonable Fairness of Maximum Nash Welfare,"*
  2019 — broader context on EF1 as the standard practical relaxation.
