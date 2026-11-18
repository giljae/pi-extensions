BLUEPRINT.scene('event-loop', {
  title: 'How the JavaScript event loop works',
  fig: 1,
  sheet: 'SHEET 1 OF 1',
  size: [800, 400],
  parts: [
    { id: 'script', kind: 'book', at: [90, 130], size: [100, 70], lines: 5, max: 5, label: 'MAIN.JS', labelAt: 'n', n: 1, lead: 'sw', name: 'Script', note: 'five lines: log A, setTimeout, fetch, a promise, log B' },
    { id: 'thread', kind: 'zone', at: [250, 215], size: [170, 330], label: 'MAIN THREAD' },
    { id: 'tray', kind: 'zone', at: [250, 146], size: [100, 128], label: 'CALL STACK' },
    { id: 'stack', kind: 'stack', at: [250, 154], size: [76, 100], max: 4, count: 0, n: 2, lead: 'e', leadLen: 30, name: 'Call stack', note: 'the one place code runs, one call at a time' },
    { id: 'console', kind: 'screen', at: [90, 320], size: [120, 80], label: 'CONSOLE', n: 3, lead: 'nw', name: 'Console', note: 'where log() prints; it ends up reading A B p t f' },
    { id: 'zone', kind: 'zone', at: [620, 145], size: [300, 210], label: 'BROWSER' },
    { id: 'clock', kind: 'clock', at: [690, 120], size: [46, 46], label: 'TIMER', labelAt: 'n', n: 4, lead: 'sw', name: 'Timer', note: 'the browser counts down setTimeout(t, 0) off the stack' },
    { id: 'tower', kind: 'tower', at: [560, 180], size: [40, 84], label: 'NETWORK', labelAt: 'e', n: 5, lead: [34, 28], name: 'Network', note: 'the browser waits ~80 ms for the fetch reply' },
    { id: 'tq', kind: 'queue', at: [450, 350], size: [150, 30], slots: 4, count: 0, label: 'TASK QUEUE', n: 6, lead: 'se', name: 'Task queue', note: 'timer and event callbacks wait here, one per turn' },
    { id: 'mq', kind: 'queue', at: [450, 290], size: [150, 30], slots: 4, count: 0, label: 'MICROTASKS', n: 7, lead: [44, -22], name: 'Microtask queue', note: 'promise callbacks wait here and always go first' },
    { id: 'loop', kind: 'wheel', at: [250, 320], size: [56, 56], label: 'EVENT LOOP', n: 8, lead: 'nw', name: 'Event loop', note: 'moves one callback onto the stack, but only when it is empty' }
  ],
  lines: [
    { id: 'run', from: 'script.e', to: 'stack.w-24', arrow: true },
    { id: 'out', from: 'stack.w+40', to: 'console.n', arrow: true },
    { id: 'toTimer', from: 'stack.e-34', to: 'clock.w', label: 'HAND OFF', labelPos: 0.3 },
    { id: 'toNet', from: 'stack.e+26', to: 'tower.w' },
    { id: 'timerCb', from: 'clock.e', to: 'tq.e', via: [[745, 120], [745, 350]], arrow: true },
    { id: 'netCb', from: 'tower.s', to: 'mq.e', arrow: true, label: '.THEN', labelPos: 0.55 },
    { id: 'promise', from: 'stack.e+45', to: 'mq.n', kind: 'wire', arrow: true },
    { id: 'fromMq', from: 'mq.w', to: 'loop.e-14' },
    { id: 'fromTq', from: 'tq.w', to: 'loop.e+14' },
    { id: 'feed', from: 'loop.n', to: 'stack.s', heavy: true, arrow: true }
  ],
  steps: [
    {
      say: 'Your script (1) runs on the call stack (2), one line at a time, and log(\'A\') prints A (3).',
      draw: ['script', 'run', 'thread', 'tray', 'stack', 'out', 'console'],
      run: [
        { on: 'run', item: 'chip', text: "log('A')", dur: 0.8, arrive: { set: { stack: { count: 2 } } } },
        { on: 'out', item: 'chip', text: 'A', dur: 0.9, arrive: { set: { console: { text: 'CONSOLE\nA' }, stack: { count: 1 } } } }
      ]
    },
    {
      say: 'But the stack can do only one thing, so setTimeout is handed to the browser\'s timer (4).',
      view: ['stack', 'zone'],
      draw: ['zone', 'toTimer', 'clock'],
      run: [
        { on: 'run', item: 'chip', text: 'setTimeout', dur: 0.8, arrive: { set: { stack: { count: 2 } } } },
        { on: 'toTimer', item: 'chip', text: 't · 0 ms', dur: 1.1, arrive: { set: { stack: { count: 1 } }, glow: ['clock'] } }
      ],
      spin: ['clock']
    },
    {
      say: 'fetch(\'/user\') is handed over too: the network (5) waits for the reply, not the stack.',
      draw: ['toNet', 'tower'],
      run: [
        { on: 'run', item: 'chip', text: 'fetch /user', dur: 0.8, arrive: { set: { stack: { count: 2 } } } },
        { on: 'toNet', item: 'chip', text: 'GET /user', dur: 1.1, arrive: { set: { stack: { count: 1 } } } }
      ],
      light: ['tower'],
      note: { at: 'tower.e', text: 'REPLY IN ~80 MS', dy: 26 }
    },
    {
      say: 'The timer is done at once, but the stack is still busy, so t waits in the task queue (6).',
      view: [200, 100, 600, 300],
      draw: ['timerCb', 'tq'],
      run: [
        { on: 'timerCb', item: 'chip', text: 't', dur: 1.5, arrive: { set: { tq: { count: 1 } } } }
      ],
      glow: ['stack'],
      note: { at: [262, 236], text: 'STILL BUSY', anchor: 'start' }
    },
    {
      say: 'Promise.resolve().then(p) puts p in a second line, the microtask queue (7).',
      draw: ['promise', 'mq'],
      run: [
        { on: 'run', item: 'chip', text: 'Promise', dur: 0.8, arrive: { set: { stack: { count: 2 } } } },
        { on: 'promise', item: 'chip', text: 'p', dur: 1.2, arrive: { set: { mq: { count: 1 }, stack: { count: 1 } } } }
      ]
    },
    {
      say: 'The script prints B and ends. Now, and only now, the stack is empty.',
      view: [0, 70, 620, 310],
      run: [
        { on: 'run', item: 'chip', text: "log('B')", dur: 0.8, arrive: { set: { stack: { count: 2 } } } },
        { on: 'out', item: 'chip', text: 'B', dur: 0.9, arrive: { set: { console: { text: 'CONSOLE\nA B' }, stack: { count: 0 } } } }
      ],
      then: { note: { at: [262, 236], text: 'EMPTY', anchor: 'start' }, ok: ['stack'] }
    },
    {
      say: 'So the event loop (8) turns, and microtasks go first: p moves onto the stack and runs.',
      draw: ['fromMq', 'fromTq', 'feed', 'loop'],
      run: [
        { on: 'fromMq', item: 'chip', text: 'p', dur: 0.8, arrive: { set: { mq: { count: 0 } } } },
        { on: 'feed', item: 'chip', text: 'p', dur: 0.8, arrive: { set: { stack: { count: 1 } } } },
        { on: 'out', item: 'chip', text: 'p', dur: 0.9, arrive: { set: { console: { text: 'CONSOLE\nA B p' }, stack: { count: 0 } } } }
      ],
      spin: ['loop']
    },
    {
      say: 'Only once the microtask queue is empty does the loop take t from the task queue.',
      run: [
        { on: 'fromTq', item: 'chip', text: 't', dur: 0.8, arrive: { set: { tq: { count: 0 } } } },
        { on: 'feed', item: 'chip', text: 't', dur: 0.8, arrive: { set: { stack: { count: 1 } } } },
        { on: 'out', item: 'chip', text: 't', dur: 0.9, arrive: { set: { console: { text: 'CONSOLE\nA B p t' }, stack: { count: 0 } } } }
      ],
      spin: ['loop']
    },
    {
      say: 'About 80 ms later the reply lands; its .then callback f queues as a microtask and runs.',
      view: 'all',
      draw: ['netCb'],
      run: [
        { on: 'netCb', item: 'chip', text: 'f', dur: 1.0, arrive: { set: { mq: { count: 1 } } } },
        { on: 'fromMq', item: 'chip', text: 'f', dur: 0.8, arrive: { set: { mq: { count: 0 } } } },
        { on: 'feed', item: 'chip', text: 'f', dur: 0.8, arrive: { set: { stack: { count: 1 } } } },
        { on: 'out', item: 'chip', text: 'f', dur: 0.9, arrive: { set: { console: { text: 'CONSOLE\nA B p t f' }, stack: { count: 0 } } } }
      ],
      light: ['tower'],
      spin: ['loop']
    },
    {
      say: 'One stack, one job at a time: callbacks wait in line until it is empty, microtasks first.',
      glow: ['loop', 'stack'],
      then: { ok: ['console'] },
      note: [
        { at: 'console.s', text: 'PRINTED: A B p t f', dy: 14 },
        { at: [244, 244], text: 'ONE PER TURN', anchor: 'end' }
      ],
      hold: 2.6
    }
  ]
});
