// A job queue: the web app drops jobs in, a worker takes them out in order,
// and the queue absorbs a burst that would otherwise be turned away.
// qb is a short bridge where the queue will sit, so the first two steps show
// one unbroken line; step 3 erases it as the queue arrives.
BLUEPRINT.scene('queue', {
  title: 'How a job queue absorbs a burst',
  fig: 1,
  size: [640, 320],
  parts: [
    { id: 'app', kind: 'screen', at: [80, 150], size: [100, 70], label: 'WEB APP', n: 1, lead: 'n', name: 'Web app', note: 'takes photo uploads and needs each one resized' },
    { id: 'phone', kind: 'screen', at: [80, 262], size: [84, 56], label: 'PHONE', n: 5, lead: 'nw', name: 'Phone app', note: 'a second producer: it uploads photos into the same queue' },
    { id: 'junc', kind: 'dot', at: [180, 150] },
    { id: 'queue', kind: 'queue', at: [300, 150], size: [168, 32], slots: 6, label: 'QUEUE', n: 4, lead: 'n', name: 'Queue', note: 'a rack of 6 slots: jobs join at the back and leave from the front' },
    { id: 'gear', kind: 'gear', at: [520, 66], size: [40, 40] },
    { id: 'worker', kind: 'box', at: [520, 150], size: [96, 56], label: 'WORKER', n: 2, lead: 'ne', name: 'Worker', note: 'resizes one photo at a time, about 2 s each' },
    { id: 'book', kind: 'book', at: [520, 262], size: [74, 50], lines: 0, max: 10, labelAt: 'e', label: 'DONE', n: 3, lead: 'nw', name: 'Done log', note: 'one line for every photo that was finished' }
  ],
  lines: [
    { id: 'q1', from: 'app.e', to: 'junc', label: 'JOBS' },
    { id: 'q1b', from: 'junc', to: 'queue.w' },
    { id: 'p2', from: 'phone.e', to: 'junc', bend: 'hv' },
    { id: 'qb', from: 'queue.w', to: 'queue.e' },
    { id: 'q2', from: 'queue.e', to: 'worker.w', arrow: true },
    { id: 'shaft', from: 'gear.s', to: 'worker.n', heavy: true },
    { id: 'out', from: 'worker.s', to: 'book.n' },
    { id: 'span', from: [216, 222], to: [384, 222], kind: 'dim', label: '6 SLOTS' }
  ],
  steps: [
    {
      say: 'The web app (1) hands photo #1 to a worker (2), which resizes it and logs it done (3).',
      draw: ['app', 'q1', 'junc', 'q1b', 'qb', 'q2', 'worker', 'gear', 'shaft', 'out', 'book'],
      run: [
        { from: 'app.e', to: 'worker.w', item: 'chip', text: '#1', dur: 1.4, ease: 'linear', arrive: { glow: ['worker'] } },
        { on: 'out', item: 'packet', dur: 0.6, at: 2.4, arrive: { set: { book: { lines: 1 } } } }
      ],
      spin: ['gear'],
      note: { at: 'worker.e', text: '~2 S A JOB', dx: 8, dy: 22 }
    },
    {
      say: 'But at lunch 5 photos arrive at once. The worker is busy, so 4 are turned away.',
      run: [
        { from: 'app.e', to: 'worker.w', item: 'chip', text: '#2', dur: 1.2, ease: 'linear', arrive: { glow: ['worker'] } },
        { from: 'app.e', to: 'worker.w', item: 'packet', count: 4, gap: 0.2, dur: 1.2, ease: 'linear', arrive: { fail: ['worker'] } },
        { from: 'worker.w', to: 'app.e', item: 'packet', color: 'fail', count: 4, gap: 0.2, dur: 1.2, ease: 'linear' }
      ],
      spin: ['gear'],
      then: { note: { at: 'app.s', text: '4 LOST', dy: 18 } }
    },
    {
      say: 'So a queue (4) goes between them, where jobs can wait their turn.',
      erase: ['qb'],
      draw: ['queue', 'span'],
      glow: ['queue']
    },
    {
      say: 'Five photos land at once from the web app and a phone app (5). They wait in the queue.',
      draw: ['phone', 'p2'],
      run: [
        { on: 'q1', item: 'packet', dur: 0.3, at: 0 },
        { on: 'q1b', item: 'packet', dur: 0.25, arrive: { set: { queue: { count: 1 } } } },
        { on: 'q1', item: 'packet', dur: 0.3, at: 0.35 },
        { on: 'q1b', item: 'packet', dur: 0.25, arrive: { set: { queue: { count: 2 } } } },
        { on: 'p2', item: 'packet', dur: 0.8, at: 0 },
        { on: 'q1b', item: 'packet', dur: 0.25, arrive: { set: { queue: { count: 3 } } } },
        { on: 'q1', item: 'packet', dur: 0.3, at: 0.75 },
        { on: 'q1b', item: 'packet', dur: 0.25, arrive: { set: { queue: { count: 4 } } } },
        { on: 'p2', item: 'packet', dur: 0.8, at: 0.5 },
        { on: 'q1b', item: 'packet', dur: 0.25, arrive: { set: { queue: { count: 5 } } } }
      ],
      then: { note: { at: 'queue.s', text: '#2 · #3 · #4 · #5 · #6', dy: 100 }, set: { app: { text: 'READY' } } }
    },
    {
      say: 'The worker (2) takes them from the front, one at a time and in order: #2, #3, #4.',
      set: { queue: { count: 4 }, app: { text: 'WEB APP' } },
      run: [
        { on: 'q2', item: 'chip', text: '#2', dur: 0.6 },
        { on: 'out', item: 'packet', dur: 0.6, at: 1.2, arrive: { set: { book: { lines: 2 }, queue: { count: 3 } } } },
        { on: 'q2', item: 'chip', text: '#3', dur: 0.6 },
        { on: 'out', item: 'packet', dur: 0.6, arrive: { set: { book: { lines: 3 }, queue: { count: 2 } } } },
        { on: 'q2', item: 'chip', text: '#4', dur: 0.6 },
        { on: 'out', item: 'packet', dur: 0.6, arrive: { set: { book: { lines: 4 } } } }
      ],
      spin: ['gear']
    },
    {
      say: 'New jobs join at the back while the worker keeps a steady pace, and no job is lost.',
      set: { queue: { count: 1 } },
      run: [
        { on: 'q2', item: 'chip', text: '#5', dur: 0.6 },
        { on: 'p2', item: 'chip', text: '#7', dur: 0.8 },
        { on: 'q1b', item: 'chip', text: '#7', dur: 0.3, arrive: { set: { queue: { count: 2 } } } },
        { on: 'out', item: 'packet', dur: 0.6, arrive: { set: { book: { lines: 5 } } } }
      ],
      spin: ['gear'],
      note: [
        { at: 'queue.s', text: 'IN AT THE BACK · OUT AT THE FRONT\nA BURST OF 5 · 0 LOST', dy: 100 }
      ],
      hold: 2.4
    }
  ]
});
