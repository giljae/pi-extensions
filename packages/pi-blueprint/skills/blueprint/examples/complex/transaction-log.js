// A database transaction and its write-ahead log: a ₹500 transfer touches two
// balances. A crash between the two writes loses money, so the plan goes into
// a log first (ending in COMMIT) and only then into the balances; after a
// crash, the log replays what was committed and skips what was not.
BLUEPRINT.scene('transaction-log', {
  title: 'How a database survives a crash',
  fig: 3,
  size: [800, 400],
  parts: [
    { id: 'phone', kind: 'screen', at: [80, 210], size: [110, 80], label: 'PAY RAVI\n₹500', n: 1, lead: 'n', name: 'Transfer', note: 'Asha sends Ravi ₹500: one change, two balances' },
    { id: 'db', kind: 'box', at: [245, 210], size: [100, 56], label: 'DATABASE', n: 2, lead: 'sw', name: 'Database', note: 'does each change one write at a time, ~1 MS each' },
    { id: 'power', kind: 'lamp', at: [245, 110], on: 1, label: 'POWER', labelAt: 'w', n: 5, lead: 'ne', name: 'Power', note: 'can fail between any two writes' },
    { id: 'j', kind: 'dot', at: [380, 210] },
    { id: 'disk', kind: 'zone', at: [600, 200], size: [300, 330], label: 'DISK' },
    { id: 'asha', kind: 'tank', at: [540, 132], size: [60, 88], level: 0.8, label: 'ASHA\n₹2,000', labelAt: 'n', n: 3, lead: 'w', name: "Asha's balance", note: 'starts at ₹2,000' },
    { id: 'ravi', kind: 'tank', at: [680, 132], size: [60, 88], level: 0.12, label: 'RAVI\n₹300', labelAt: 'n', n: 4, lead: 'w', name: "Ravi's balance", note: 'starts at ₹300' },
    { id: 'log', kind: 'book', at: [540, 300], size: [84, 56], lines: 0, max: 10, label: 'LOG', n: 6, lead: 'sw', name: 'Write-ahead log', note: 'the plan, written before any balance changes and ended with COMMIT' },
    { id: 'gear', kind: 'gear', at: [680, 300], size: [44, 44], teeth: 12, label: 'REPLAY', n: 7, lead: 'se', name: 'Replayer', note: 'on restart, finishes every committed plan and skips the rest' }
  ],
  lines: [
    { id: 'req', from: 'phone.e', to: 'db.w' },
    { id: 'pw', from: 'power.s', to: 'db.n', kind: 'wire' },
    { id: 'w0', from: 'db.e', to: 'j' },
    { id: 'ja', from: 'j', to: 'asha.s', bend: 'hv' },
    { id: 'jr', from: 'j', to: 'ravi.s-12', bend: 'hv', label: 'WRITE', labelPos: 0.62 },
    { id: 'jl', from: 'j.s', to: 'log.w', label: 'FIRST', labelPos: 0.5 },
    { id: 'shaft', from: 'log.e', to: 'gear.w', heavy: true },
    { id: 'rep', from: 'gear.n+12', to: 'ravi.s+12' }
  ],
  steps: [
    {
      say: 'Asha sends Ravi ₹500 (1). The database (2) holds both balances (3) and (4).',
      draw: ['phone', 'req', 'db', 'w0', 'j', 'ja', 'jr', 'disk', 'asha', 'ravi'],
      run: [{ on: 'req', item: 'chip', text: '₹500', dur: 1.0, arrive: { glow: ['db'] } }],
      note: { at: [600, 236], text: 'TOTAL ₹2,300', anchor: 'middle', dx: 0 }
    },
    {
      say: "It takes Asha's ₹500 first: her ₹2,000 becomes ₹1,500.",
      view: ['db', 'asha', 'ravi'],
      run: [
        { on: 'w0', item: 'chip', text: '−₹500', dur: 0.7 },
        { on: 'ja', item: 'chip', text: '−₹500', dur: 0.9, arrive: { set: { asha: { level: 0.6, text: 'ASHA\n₹1,500' } } } }
      ]
    },
    {
      say: 'Then the power (5) fails before Ravi gets his ₹500, and the money is simply gone.',
      draw: ['power', 'pw'],
      run: [
        { on: 'w0', item: 'chip', text: '+₹500', dur: 0.6 },
        { on: 'jr', item: 'chip', text: '+₹500', color: 'fail', dur: 0.9, span: [0, 0.55], arrive: { set: { power: { on: 0 } }, fail: ['ravi', 'power'] } }
      ],
      then: { note: { at: [610, 236], text: 'TOTAL ₹1,800 · ₹500 LOST', anchor: 'middle', dx: 0 } },
      hold: 1.8
    },
    {
      say: 'So, starting over, the database first writes the whole plan into a log (6).',
      view: ['db', 'disk'],
      draw: ['jl', 'log'],
      set: { power: { on: 1 }, asha: { level: 0.8, text: 'ASHA\n₹2,000' } },
      run: [
        { on: 'jl', item: 'chip', text: 'ASHA −500', dur: 0.9, arrive: { set: { log: { lines: 1 } } } },
        { on: 'jl', item: 'chip', text: 'RAVI +500', dur: 0.9, arrive: { set: { log: { lines: 2 } } } },
        { on: 'jl', item: 'chip', text: 'COMMIT', dur: 0.9, arrive: { set: { log: { lines: 3 } }, glow: ['log'] } }
      ],
      note: { at: 'log.n', text: '3 LINES · ~1 MS', dy: -8 }
    },
    {
      say: 'Only then does it change the balances, and once again the power fails halfway.',
      run: [
        { on: 'ja', item: 'chip', text: '−₹500', dur: 0.9, arrive: { set: { asha: { level: 0.6, text: 'ASHA\n₹1,500' } } } },
        { on: 'jr', item: 'chip', text: '+₹500', color: 'fail', dur: 0.9, span: [0, 0.55], arrive: { set: { power: { on: 0 } }, fail: ['ravi', 'power'] } }
      ],
      hold: 1.6
    },
    {
      say: 'On restart, the replayer (7) reads the log, finds COMMIT, and finishes the +₹500.',
      view: ['j', 'log', 'gear', 'asha', 'ravi'],
      draw: ['shaft', 'gear', 'rep'],
      set: { power: { on: 1 } },
      spin: ['gear'],
      glow: ['log'],
      run: [{ on: 'rep', item: 'chip', text: '+₹500', dur: 1.2, at: 0.6, arrive: { set: { ravi: { level: 0.32, text: 'RAVI\n₹800' } }, ok: ['ravi'] } }]
    },
    {
      say: 'A plan cut off before its COMMIT is skipped, so nothing is ever half-done.',
      run: [
        { on: 'jl', item: 'chip', text: 'ASHA −200', dur: 0.9, arrive: { set: { log: { lines: 4 } } } },
        { on: 'jl', item: 'chip', text: 'COMMIT', color: 'fail', dur: 0.9, span: [0, 0.5], arrive: { set: { power: { on: 0 } }, fail: ['power'] } }
      ],
      then: { set: { power: { on: 1 } }, spin: ['gear'], note: { at: 'log.n', text: 'NO COMMIT · SKIPPED', dy: -8 } },
      hold: 1.8
    },
    {
      say: 'Log first, then balances: after any crash, the log says exactly what to finish.',
      view: 'all',
      glow: ['log', 'jl'],
      note: [
        { at: [600, 236], text: 'TOTAL ₹2,300 · NOTHING LOST', anchor: 'middle', dx: 0 },
        { at: 'phone.s', text: 'ASHA ₹1,500 · RAVI ₹800', dy: 20 }
      ],
      hold: 2.6
    }
  ]
});
