BLUEPRINT.scene('load-balancer', {
  title: 'How a load balancer spreads the work',
  fig: 3,
  size: [640, 320],
  parts: [
    { id: 'users', kind: 'screen', at: [80, 160], size: [96, 70], label: 'USERS', n: 1, lead: 'sw', name: 'Users', note: 'send about 900 requests a second' },
    { id: 'lb', kind: 'switch', at: [260, 160], size: [56, 56], outs: [-40, 0, 40], to: 1, n: 4, lead: 'nw', name: 'Load balancer', note: 'a switch that sends each request to the next server in turn' },
    { id: 'lbl', kind: 'label', at: [220, 214], label: 'BALANCER' },
    { id: 'a', kind: 'box', at: [470, 160], size: [96, 50], label: 'SERVER A', n: 2, lead: 'nw', name: 'Server A', note: 'can handle about 400 requests a second' },
    { id: 'load', kind: 'gauge', at: [590, 160], size: [44, 44], value: 0.3, label: 'LOAD', labelAt: 'n', n: 3, lead: [30, -32], name: 'Load gauge', note: 'how busy server A is; past the thick top mark requests fail' },
    { id: 'b', kind: 'box', at: [470, 66], size: [96, 46], label: 'SERVER B', n: 5, lead: 'e', name: 'Server B', note: 'a copy of server A' },
    { id: 'c', kind: 'box', at: [470, 254], size: [96, 46], label: 'SERVER C', n: 6, lead: 'e', name: 'Server C', note: 'another copy of server A' }
  ],
  lines: [
    { id: 'in', from: 'users.e', to: 'lb.w', label: '900 / S', labelPos: 0.45 },
    { id: 'old', from: 'lb.w', to: 'a.w' },
    { id: 'la', from: 'lb.e', to: 'a.w' },
    { id: 'lbB', from: 'lb.n+13', to: 'b.w', bend: 'vh' },
    { id: 'lbC', from: 'lb.s+13', to: 'c.w', bend: 'vh' },
    { id: 'gw', from: 'a.e', to: 'load.w', kind: 'wire' }
  ],
  steps: [
    {
      say: 'Users (1) send requests, and every single one lands on server A (2).',
      draw: ['users', 'in', 'old', 'a'],
      run: [
        { on: 'in', item: 'packet', count: 3, gap: 0.3, dur: 0.8 },
        { on: 'old', item: 'packet', count: 3, gap: 0.3, dur: 0.8, with: true, at: 0.8 }
      ]
    },
    {
      say: 'At 900 a second its load (3) pins at the top, and requests start to fail.',
      draw: ['gw', 'load'],
      run: [
        { on: 'in', item: 'packet', count: 5, gap: 0.18, dur: 0.7 },
        { on: 'old', item: 'packet', count: 5, gap: 0.18, dur: 0.7, with: true, at: 0.7, arrive: { set: { load: { value: 0.97 } } } }
      ],
      then: { fail: ['a'], ring: ['load'], note: { at: 'load.s', text: '900 / 400 MAX', dy: 14 } }
    },
    {
      say: 'So a switch (4) goes in front, with two more servers, B (5) and C (6).',
      erase: ['old'],
      draw: ['lb', 'lbl', 'la', 'lbB', 'b', 'lbC', 'c']
    },
    {
      say: 'Request 1 goes to A, 2 to B, 3 to C, then round again: round-robin.',
      run: [
        { on: 'in', item: 'chip', text: '#1', dur: 0.6 },
        { on: 'la', item: 'chip', text: '#1', dur: 0.6, arrive: { glow: ['a'], set: { lb: { to: 0 } } } },
        { on: 'in', item: 'chip', text: '#2', dur: 0.6 },
        { on: 'lbB', item: 'chip', text: '#2', dur: 0.7, arrive: { glow: ['b'], set: { lb: { to: 2 } } } },
        { on: 'in', item: 'chip', text: '#3', dur: 0.6 },
        { on: 'lbC', item: 'chip', text: '#3', dur: 0.7, arrive: { glow: ['c'], set: { lb: { to: 1 } } } }
      ]
    },
    {
      say: 'Each server now carries a third, and A drops back under its limit.',
      run: [
        { on: 'in', item: 'packet', count: 3, gap: 0.25, dur: 0.6 },
        { on: 'la', item: 'packet', count: 3, gap: 0.25, dur: 0.6, with: true, at: 0.6, arrive: { set: { load: { value: 0.75 } } } },
        { on: 'lbB', item: 'packet', count: 3, gap: 0.25, dur: 0.7, with: true, at: 0.6 },
        { on: 'lbC', item: 'packet', count: 3, gap: 0.25, dur: 0.7, with: true, at: 0.6 }
      ],
      then: { ok: ['a', 'b', 'c'] },
      note: [
        { at: 'b.n', text: '300 / S', dy: -6 },
        { at: 'load.s', text: '300 / 400 MAX', dy: 14 },
        { at: 'c.s', text: '300 / S', dy: 14 }
      ],
      hold: 2.4
    }
  ]
});
