BLUEPRINT.scene('cache', {
  title: 'How a cache works',
  fig: 1,
  size: [640, 320],
  parts: [
    { id: 'app', kind: 'screen', at: [80, 180], label: 'APP', n: 1, lead: 'nw', name: 'App', note: 'asks for the same answer again and again' },
    { id: 'junc', kind: 'dot', at: [300, 180] },
    { id: 'drawer', kind: 'drawer', at: [300, 88], size: [84, 38], labelAt: 'n', label: 'CACHE', n: 2, name: 'Cache', note: 'a drawer by the door that keeps recent answers' },
    { id: 'store', kind: 'cabinet', at: [560, 180], size: [80, 110], rows: 4, label: 'DATABASE', n: 3, lead: 'e', name: 'Database', note: 'holds every answer, but each lookup is slow' },
    { id: 'gear', kind: 'gear', at: [560, 78], size: [40, 40] }
  ],
  lines: [
    { id: 'a1', from: 'app.e', to: 'junc' },
    { id: 'a2', from: 'junc', to: 'store.w' },
    { id: 'shaft', from: 'gear.s', to: 'store.n', heavy: true },
    { id: 'up', from: 'junc.n', to: 'drawer.s' }
  ],
  steps: [
    {
      say: 'The app (1) needs an answer that lives in the database (3).',
      draw: ['app', 'a1', 'junc', 'a2', 'store', 'gear', 'shaft']
    },
    {
      say: 'Every request makes the long trip, and every lookup is slow.',
      run: [
        { on: 'a1', item: 'chip', text: '#42', dur: 0.8 },
        { on: 'a2', item: 'chip', text: '#42', dur: 1.0 },
        { on: 'a2', back: true, dur: 1.0 },
        { on: 'a1', back: true, dur: 0.8 }
      ],
      spin: ['gear'],
      note: { at: 'gear.w', text: 'SLOW · ~120 MS' }
    },
    {
      say: 'So add a drawer (2) by the door that keeps recent answers.',
      draw: ['up', 'drawer']
    },
    {
      say: 'A request checks the drawer first. The first time, it is empty.',
      run: [
        { on: 'a1', item: 'chip', text: '#42', dur: 0.8 },
        { on: 'up', item: 'chip', text: '#42', dur: 0.6, arrive: { fail: ['drawer'] } }
      ]
    },
    {
      say: 'It fetches from the database and leaves a copy in the drawer.',
      run: [
        { on: 'up', back: true, item: 'chip', text: '#42', dur: 0.5 },
        { on: 'a2', item: 'chip', text: '#42', dur: 1.0 },
        { on: 'a2', back: true, dur: 1.0 },
        { on: 'up', dur: 0.5, arrive: { set: { drawer: { fill: 1 } } } },
        { on: 'up', back: true, dur: 0.5 },
        { on: 'a1', back: true, dur: 0.8 }
      ],
      spin: ['gear']
    },
    {
      say: 'Next time the answer comes straight from the drawer. No trip to the database.',
      run: [
        { on: 'a1', item: 'chip', text: '#42', dur: 0.8 },
        { on: 'up', item: 'chip', text: '#42', dur: 0.5, arrive: { ok: ['drawer'], glow: ['drawer'] } },
        { on: 'up', back: true, dur: 0.5 },
        { on: 'a1', back: true, dur: 0.8 }
      ],
      note: { at: 'drawer.e', text: 'FAST · ~2 MS' }
    }
  ]
});
