BLUEPRINT.scene('mutex', {
  title: 'How a lock stops lost updates',
  fig: 5,
  size: [640, 320],
  parts: [
    { id: 'gA', kind: 'gear', at: [52, 80], size: [34, 34], teeth: 9 },
    { id: 'a', kind: 'box', at: [150, 80], size: [104, 50], label: 'WORKER A', n: 1, lead: 'n', name: 'Worker A', note: 'reads the count, adds 1, writes it back' },
    { id: 'gB', kind: 'gear', at: [52, 240], size: [34, 34], teeth: 9 },
    { id: 'b', kind: 'box', at: [150, 240], size: [104, 50], label: 'WORKER B', n: 2, lead: 's', name: 'Worker B', note: 'does the same job at the same moment' },
    { id: 'dot', kind: 'dot', at: [290, 160] },
    { id: 'lock', kind: 'lock', at: [400, 152], size: [34, 42], open: 1, label: 'LOCK', n: 4, lead: 'n', name: 'Lock (mutex)', note: 'one holder at a time; the other waits, ~1 MS' },
    { id: 'count', kind: 'box', at: [540, 160], size: [116, 60], label: 'COUNT · 41', n: 3, lead: 'e', name: 'Counter', note: 'one shared number, 41 to start' }
  ],
  lines: [
    { id: 'sA', from: 'gA.e', to: 'a.w', heavy: true },
    { id: 'sB', from: 'gB.e', to: 'b.w', heavy: true },
    { id: 'aL', from: 'a.e', to: 'dot', bend: 'hv' },
    { id: 'bL', from: 'b.e', to: 'dot', bend: 'hv' },
    { id: 'l1', from: 'dot', to: 'lock.w+8' },
    { id: 'l2', from: 'lock.w+8', to: 'count.w' }
  ],
  steps: [
    {
      say: 'Two workers, A (1) and B (2), each add 1 to a shared counter (3) that reads 41.',
      draw: ['gA', 'sA', 'a', 'gB', 'sB', 'b', 'aL', 'bL', 'dot', 'l1', 'l2', 'count']
    },
    {
      say: 'Both read 41 at the same moment, and each works out 41 + 1 = 42.',
      run: [
        { on: 'l2', back: true, item: 'chip', text: '41', dur: 0.8 },
        { on: 'l1', back: true, item: 'chip', text: '41', dur: 0.5 },
        { on: 'aL', back: true, item: 'chip', text: '41', dur: 0.9 },
        { on: 'bL', back: true, item: 'chip', text: '41', dur: 0.9, with: true }
      ],
      spin: ['gA', 'gB'],
      then: { set: { a: { text: 'A · 41+1' }, b: { text: 'B · 41+1' } } }
    },
    {
      say: 'Both write 42 back, so one +1 is lost: the counter should say 43.',
      run: [
        { on: 'aL', item: 'chip', text: '42', dur: 0.9 },
        { on: 'bL', item: 'chip', text: '42', dur: 0.9, with: true },
        { on: 'l1', item: 'chip', text: '42', count: 2, gap: 0.25, dur: 0.5 },
        { on: 'l2', item: 'chip', text: '42', count: 2, gap: 0.25, dur: 0.8, arrive: { set: { count: { text: 'COUNT · 42' } } } }
      ],
      then: { fail: ['count'], note: { at: 'count.s', text: 'LOST UPDATE · 42, NOT 43', dy: 18 } },
      hold: 1.8
    },
    {
      say: 'So add a lock (4) on the way in, and run the same two updates again from 41.',
      draw: ['lock'],
      set: { count: { text: 'COUNT · 41' }, a: { text: 'WORKER A' }, b: { text: 'WORKER B' } }
    },
    {
      say: 'A shuts the lock and reads 41. B arrives, finds it shut, and has to wait.',
      run: [
        { on: 'aL', item: 'chip', text: 'A', dur: 0.8 },
        { on: 'l1', item: 'chip', text: 'A', dur: 0.5, arrive: { set: { lock: { open: 0 } }, glow: ['lock'], note: { at: 'lock.s', text: 'HELD BY A', dy: 34 } } },
        { on: 'bL', item: 'chip', text: 'B', dur: 0.7, span: [0, 0.82], stay: true, arrive: { note: { at: 'dot', text: 'B WAITS', dx: -8, dy: 26, anchor: 'end' } } },
        { on: 'l2', back: true, item: 'chip', text: '41', dur: 0.7, at: 1.6 },
        { on: 'l1', back: true, item: 'chip', text: '41', dur: 0.5 },
        { on: 'aL', back: true, item: 'chip', text: '41', dur: 0.8, arrive: { set: { a: { text: 'A · 41+1' } } } }
      ],
      spin: ['gA']
    },
    {
      say: 'A writes 42 and opens the lock. Only then does B read 42 and write 43.',
      run: [
        { on: 'aL', item: 'chip', text: '42', dur: 0.7 },
        { on: 'l1', item: 'chip', text: '42', dur: 0.4 },
        { on: 'l2', item: 'chip', text: '42', dur: 0.7, arrive: { set: { count: { text: 'COUNT · 42' }, lock: { open: 1 }, a: { text: 'WORKER A' } } } },
        { on: 'bL', item: 'chip', text: 'B', dur: 2.1, span: [0.82, 0.82], at: 0 },
        { on: 'bL', item: 'chip', text: 'B', dur: 0.3, span: [0.82, 1] },
        { on: 'l1', item: 'chip', text: 'B', dur: 0.4, arrive: { set: { lock: { open: 0 } }, glow: ['lock'] } },
        { on: 'l2', back: true, item: 'chip', text: '42', dur: 0.6 },
        { on: 'l1', back: true, item: 'chip', text: '42', dur: 0.4 },
        { on: 'bL', back: true, item: 'chip', text: '42', dur: 0.7, arrive: { set: { b: { text: 'B · 42+1' } } } },
        { on: 'bL', item: 'chip', text: '43', dur: 0.7 },
        { on: 'l1', item: 'chip', text: '43', dur: 0.4 },
        { on: 'l2', item: 'chip', text: '43', dur: 0.7, arrive: { set: { count: { text: 'COUNT · 43' }, lock: { open: 1 }, b: { text: 'WORKER B' } }, ok: ['count'] } }
      ],
      spin: ['gB'],
      then: {
        note: [
          { at: 'count.s', text: '43 · NOTHING LOST', dy: 18 },
          { at: 'lock.s', text: 'ONE AT A TIME', dy: 34 }
        ]
      },
      hold: 2.4
    }
  ]
});
