BLUEPRINT.scene('kafka', {
  title: 'How an event log with partitions works',
  fig: 2,
  sheet: 'SHEET 1 OF 1',
  paper: 'linen',
  size: [800, 400],
  parts: [
    { id: 'producer', kind: 'screen', at: [80, 200], size: [104, 76], label: 'CHECKOUT', n: 1, lead: 'nw', name: 'Producer', note: 'checkout emits one event per paid order, ~5,000 a second' },
    { id: 'topic', kind: 'zone', at: [362, 200], size: [136, 310], label: 'TOPIC: ORDERS' },
    { id: 'p0', kind: 'book', at: [372, 100], size: [96, 56], lines: 2, max: 8, label: 'PARTITION 0', n: 2, lead: [34, -32], name: 'Partition', note: 'P0, P1, P2: lists that only grow at the end, kept 7 days; each event has an offset' },
    { id: 'p1', kind: 'book', at: [372, 200], size: [96, 56], lines: 3, max: 8, label: 'PARTITION 1' },
    { id: 'p2', kind: 'book', at: [372, 300], size: [96, 56], lines: 2, max: 8, label: 'PARTITION 2' },
    { id: 'switch', kind: 'switch', at: [210, 200], size: [48, 48], outs: [-40, 0, 40], to: 1, label: 'KEY HASH', n: 3, lead: 'n', name: 'Key hash', note: 'hash(customer id) mod 3 picks the partition, so one customer stays in order' },
    { id: 'group', kind: 'zone', at: [590, 200], size: [140, 310], label: 'GROUP: BILLING' },
    { id: 'ca', kind: 'box', at: [590, 100], size: [104, 50], label: 'CONSUMER A', n: 4, lead: 'ne', name: 'Consumer', note: 'A, B and C share the group BILLING; each reads one partition' },
    { id: 'cb', kind: 'box', at: [590, 200], size: [104, 50], label: 'CONSUMER B' },
    { id: 'cc', kind: 'box', at: [590, 300], size: [104, 50], label: 'CONSUMER C' },
    { id: 'cab', kind: 'cabinet', at: [740, 200], size: [56, 96], rows: 3, label: 'OFFSETS', n: 5, lead: 'ne', name: 'Offset store', note: 'the next offset each consumer will read, saved after every batch' },
    { id: 'bell', kind: 'bell', at: [740, 316], label: 'REBALANCE', n: 6, lead: 'w', name: 'Rebalance', note: 'rings after 45 s without a heartbeat and hands partitions out again' }
  ],
  lines: [
    { id: 'feed', from: 'producer.e', to: 'switch.w', arrow: true },
    { id: 'k0', from: 'switch.e-22', to: 'p0.w' },
    { id: 'k1', from: 'switch.e', to: 'p1.w' },
    { id: 'k2', from: 'switch.e+22', to: 'p2.w' },
    { id: 'r0', from: 'p0.e', to: 'ca.w', arrow: true },
    { id: 'r1', from: 'p1.e', to: 'cb.w', arrow: true },
    { id: 'r2', from: 'p2.e', to: 'cc.w', arrow: true },
    { id: 'p1c', from: 'p1.e+16', to: 'cc.w-14', via: [[436, 216], [436, 286]], arrow: true, label: 'TAKEN OVER', labelPos: 0.25 },
    { id: 'c0', from: 'ca.e', to: 'cab.n', kind: 'wire' },
    { id: 'c1', from: 'cb.e', to: 'cab.w', kind: 'wire' },
    { id: 'c2', from: 'cc.e', to: 'cab.w+30', kind: 'wire', via: [[680, 300], [680, 230]] }
  ],
  steps: [
    {
      say: 'Checkout (1) emits an event per paid order, ~5,000 a second: too many for one machine.',
      view: [0, 40, 640, 320],
      draw: ['producer'],
      set: { producer: { text: 'CHECKOUT\n#1041 PAID' } },
      note: { at: 'producer.s', text: '~5,000 EVENTS / S', dy: 16 }
    },
    {
      say: 'So the log is split into three partitions (2), lists that only ever grow at the end.',
      draw: ['topic', 'p0', 'p1', 'p2'],
      note: { at: 'topic.s', text: 'ONE MACHINE EACH', dy: 16 }
    },
    {
      say: 'A hash of the customer id (3) picks the partition, so customer 7 always lands in P1.',
      draw: ['feed', 'switch', 'k0', 'k1', 'k2'],
      run: [
        { on: 'feed', item: 'chip', text: '#1041 · C7', dur: 0.8 },
        { on: 'k1', item: 'chip', text: '#1041 · C7', dur: 0.8, arrive: { set: { p1: { lines: 4 } }, glow: ['p1'] } }
      ],
      then: { note: { at: 'p1.n', text: 'OFFSET 3', dy: -8 } }
    },
    {
      say: 'Each new event gets the next number in its partition, its offset. Old ones never move.',
      run: [
        { on: 'feed', item: 'packet', dur: 0.5, arrive: { set: { switch: { to: 0 } } } },
        { on: 'k0', item: 'packet', dur: 0.7, arrive: { set: { p0: { lines: 3 } } } },
        { on: 'feed', item: 'packet', dur: 0.5, arrive: { set: { switch: { to: 2 } } } },
        { on: 'k2', item: 'packet', dur: 0.7, arrive: { set: { p2: { lines: 3 } } } },
        { on: 'feed', item: 'packet', dur: 0.5, arrive: { set: { switch: { to: 1 } } } },
        { on: 'k1', item: 'packet', dur: 0.7, arrive: { set: { p1: { lines: 5 } } } }
      ],
      then: { note: { at: 'p1.n', text: 'OFFSETS 0–4', dy: -8 } }
    },
    {
      say: 'Consumers (4) in the billing group each own one partition, so three read at once.',
      view: [160, 40, 640, 320],
      draw: ['group', 'ca', 'cb', 'cc', 'r0', 'r1', 'r2'],
      run: [
        { on: 'r0', item: 'packet', count: 3, gap: 0.3, dur: 0.9, arrive: { set: { ca: { text: 'CONSUMER A\nAT 3' } } } },
        { on: 'r1', item: 'packet', count: 3, gap: 0.3, dur: 0.9, with: true, arrive: { set: { cb: { text: 'CONSUMER B\nAT 5' } } } },
        { on: 'r2', item: 'packet', count: 3, gap: 0.3, dur: 0.9, with: true, arrive: { set: { cc: { text: 'CONSUMER C\nAT 3' } } } }
      ]
    },
    {
      say: 'But a consumer can crash, so each one saves its offset (5) after every batch.',
      draw: ['cab', 'c0', 'c1', 'c2'],
      run: [
        { on: 'c0', item: 'chip', text: 'P0:3', dur: 0.9 },
        { on: 'c1', item: 'chip', text: 'P1:5', dur: 0.9, with: true },
        { on: 'c2', item: 'chip', text: 'P2:3', dur: 0.9, with: true, arrive: { glow: ['cab'] } }
      ],
      note: { at: 'cab.s', text: 'NEXT TO READ', dy: 34 }
    },
    {
      say: 'Consumer B crashes, and orders 5, 6 and 7 pile up unread in P1.',
      view: 'all',
      set: { cb: { text: 'CONSUMER B\nDOWN' } },
      fail: ['cb'],
      run: [
        { on: 'feed', item: 'packet', count: 3, gap: 0.35, dur: 0.6 },
        { on: 'k1', item: 'packet', count: 3, gap: 0.35, dur: 0.7, arrive: { set: { p1: { lines: 8 } } } }
      ],
      then: { note: { at: 'p1.n', text: 'LAG · 3 EVENTS', dy: -8 } }
    },
    {
      say: 'After 45 s with no heartbeat, the group rebalances (6) and hands P1 to C.',
      view: [160, 40, 640, 320],
      draw: ['bell', 'p1c'],
      erase: ['r1'],
      ring: ['bell'],
      note: { at: 'cb.s', text: 'NO HEARTBEAT · 45 S', dy: 14 },
      then: { glow: ['p1c'] }
    },
    {
      say: 'C reads the offset B saved, 5, and resumes there, so no order is skipped.',
      run: [
        { on: 'c2', back: true, item: 'chip', text: 'P1:5', dur: 1.0, arrive: { glow: ['cc'] } },
        { on: 'p1c', item: 'packet', count: 3, gap: 0.3, dur: 1.0, arrive: { set: { cc: { text: 'C · P1 AT 8\nC · P2 AT 3' } } } }
      ],
      then: { ok: ['cc'] }
    },
    {
      say: 'Partitions split the writing, groups split the reading, and saved offsets survive crashes.',
      view: 'all',
      glow: ['p1', 'cab'],
      note: [
        { at: 'topic.s', text: 'KEPT 7 DAYS', dy: 16 },
        { at: 'group.s', text: 'RESUMED AT 5', dy: 16 }
      ],
      hold: 2.6
    }
  ]
});
