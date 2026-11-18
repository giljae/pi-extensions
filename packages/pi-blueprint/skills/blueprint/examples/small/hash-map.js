// A hash map: a key goes through a hash press, the number it comes out as
// turns a switch, and the switch points at the one drawer (bucket) to open.
// The fan lines leave the switch's right side level with its contacts (outs at
// -30/-10/10/30 degrees) and run straight to each drawer.
BLUEPRINT.scene('hash-map', {
  title: 'How a hash map finds a key',
  fig: 1,
  size: [640, 320],
  parts: [
    { id: 'app', kind: 'screen', at: [70, 165], size: [92, 66], label: 'APP', n: 1, lead: 'n', name: 'App', note: 'wants the record stored under the key user:7' },
    { id: 'press', kind: 'press', at: [220, 165], size: [58, 82], label: 'HASH', n: 3, lead: 'n', name: 'Hash press', note: 'turns any key into a drawer number, the same number every time, in ~50 ns' },
    { id: 'sw', kind: 'switch', at: [350, 165], size: [48, 48], outs: [-30, -10, 10, 30], to: 1.5, label: 'SWITCH', n: 4, lead: 'n', name: 'Switch', note: 'points the way to the drawer whose number came out of the press' },
    { id: 'map', kind: 'zone', at: [550, 168], size: [124, 292] },
    { id: 'b0', kind: 'drawer', at: [540, 70], size: [84, 34], fill: 2, labelAt: 'e', label: '0', n: 2, lead: 'ne', name: 'Drawers', note: '4 buckets here; real maps keep thousands, and grow as they fill' },
    { id: 'b1', kind: 'drawer', at: [540, 135], size: [84, 34], fill: 1, labelAt: 'e', label: '1' },
    { id: 'b2', kind: 'drawer', at: [540, 200], size: [84, 34], fill: 1, labelAt: 'e', label: '2' },
    { id: 'b3', kind: 'drawer', at: [540, 265], size: [84, 34], fill: 2, labelAt: 'e', label: '3' }
  ],
  lines: [
    { id: 'in', from: 'app.e', to: 'press.w', label: 'KEY', labelPos: 0.4 },
    { id: 'mid', from: 'press.e', to: 'sw.w' },
    { id: 'f0', from: 'sw.e-17', to: 'b0.w', bend: 'straight' },
    { id: 'f1', from: 'sw.e-6', to: 'b1.w', bend: 'straight' },
    { id: 'f2', from: 'sw.e+6', to: 'b2.w', bend: 'straight' },
    { id: 'f3', from: 'sw.e+17', to: 'b3.w', bend: 'straight' }
  ],
  steps: [
    {
      say: 'The app (1) wants user:7. It could be in any drawer (2), so it opens them one by one.',
      draw: ['app', 'map', 'b0', 'b1', 'b2', 'b3'],
      run: [
        { from: 'app.e', to: 'b0.w', item: 'chip', text: 'user:7', dur: 1.2, arrive: { fail: ['b0'] } },
        { from: 'b0.w', to: 'b1.w', item: 'chip', text: 'user:7', dur: 0.7, arrive: { fail: ['b1'] } },
        { from: 'b1.w', to: 'b2.w', item: 'chip', text: 'user:7', dur: 0.7, arrive: { ok: ['b2'] } }
      ],
      then: { note: { at: [380, 296], text: '3 LOOKS · 1M DRAWERS ≈ 500K LOOKS', anchor: 'middle' } }
    },
    {
      say: 'So the key goes through a hash press (3), which always turns user:7 into the same 2.',
      draw: ['in', 'press'],
      run: [
        { on: 'in', item: 'chip', text: 'user:7', dur: 0.9, arrive: { set: { press: { down: 1 } } } }
      ],
      then: { set: { press: { down: 0, text: 'user:7 → 2' } } }
    },
    {
      say: 'The 2 sets a switch (4) to drawer 2, and the app goes straight there: one look.',
      draw: ['mid', 'sw', 'f0', 'f1', 'f2', 'f3'],
      run: [
        { on: 'mid', item: 'chip', text: '2', dur: 0.7, arrive: { set: { sw: { to: 2 } } } },
        { on: 'f2', item: 'chip', text: 'user:7', dur: 0.9, at: 1.4, arrive: { ok: ['b2'], glow: ['b2'] } }
      ],
      note: { at: [380, 296], text: '1 LOOK', anchor: 'middle' }
    },
    {
      say: 'Storing works the same way: user:3 comes out as 0, so it is filed in drawer 0.',
      set: { press: { text: 'HASH' } },
      run: [
        { on: 'in', item: 'chip', text: 'user:3', dur: 0.8, arrive: { set: { press: { down: 1 } } } },
        { on: 'mid', item: 'chip', text: '0', dur: 0.7, arrive: { set: { press: { down: 0, text: 'user:3 → 0' }, sw: { to: 0 } } } },
        { on: 'f0', item: 'chip', text: 'user:3', dur: 1.0, at: 2.4, arrive: { set: { b0: { fill: 3 } }, glow: ['b0'] } }
      ]
    },
    {
      say: 'But user:12 also comes out as 2, so it shares drawer 2: two keys there, still one drawer.',
      set: { press: { text: 'HASH' } },
      run: [
        { on: 'in', item: 'chip', text: 'user:12', dur: 0.8, arrive: { set: { press: { down: 1 } } } },
        { on: 'mid', item: 'chip', text: '2', dur: 0.7, arrive: { set: { press: { down: 0, text: 'user:12 → 2' }, sw: { to: 2 } } } },
        { on: 'f2', item: 'chip', text: 'user:12', dur: 1.0, at: 2.4, arrive: { set: { b2: { fill: 2 } }, glow: ['b2'] } }
      ],
      then: { note: { at: 'b2.s', text: 'A CLASH:\nCHECK 2 KEYS', dy: 16 } }
    },
    {
      say: 'One hash, one drawer: a lookup costs the same with 4 drawers or 4 million.',
      set: { press: { text: 'user:7 → 2' } },
      glow: ['press', 'sw', 'b2'],
      note: [
        { at: [380, 296], text: 'ALWAYS ~1 LOOK, HOWEVER BIG', anchor: 'middle' },
        { at: 'b2.s', text: 'user:7 · user:12', dy: 16 }
      ],
      hold: 2.4
    }
  ]
});
