// Incident / postmortem template. The story shape every incident sheet follows:
//
//   1 how it works on a normal day   2 the change or trigger   3 what broke, with a number
//   4 how it was noticed             5 what stopped the damage 6 recovery
//   7 the root cause, in plain words 8 the fix that prevents it ("So …")   9 the timeline
//
// Rules: blameless (systems and changes, never people), times in one time zone, real numbers from
// the incident (error rate, minutes, requests), and every fact traceable: list the links in
// `sources` (a postmortem doc, status page, ticket). The scenario below is an EXAMPLE: replace
// every part, number, time and caption with your incident's facts, then lint and render it.
BLUEPRINT.scene('incident', {
  title: 'Incident: checkout errors after a config change',
  fig: 1,
  size: [800, 400],
  sources: [
    ['Postmortem doc', 'https://example.com/postmortem'],
    ['Status page', 'https://example.com/status']
  ],
  parts: [
    { id: 'users', kind: 'screen', at: [90, 170], size: [110, 80], label: 'CUSTOMERS', n: 1, lead: 'nw', name: 'Customers', note: 'placing orders at checkout' },
    { id: 'app', kind: 'box', at: [330, 170], size: [124, 64], label: 'APP SERVERS', n: 2, lead: 'ne', name: 'App servers', note: 'take orders and save them to the database' },
    { id: 'wait', kind: 'queue', at: [330, 70], size: [130, 28], slots: 5, count: 0, labelAt: 'w', label: 'WAITING' },
    { id: 'db', kind: 'drum', at: [580, 170], size: [80, 80], label: 'DATABASE', n: 3, lead: 'ne', name: 'Database', note: 'accepts a limited number of connections at once' },
    { id: 'change', kind: 'box', at: [110, 330], size: [104, 44], label: 'CHANGE', muted: true },
    { id: 'config', kind: 'book', at: [330, 330], size: [80, 52], lines: 4, max: 8, labelAt: 'e', label: 'CONFIG', n: 4, lead: 'se', name: 'Config', note: 'the settings the app servers start with' },
    { id: 'check', kind: 'sieve', at: [215, 270], size: [58, 32], labelAt: 'n', label: 'CHECK', n: 7, lead: 'ne', leadLen: 16, name: 'Config check', note: 'blocks values outside a safe range before deploy' },
    { id: 'gauge', kind: 'gauge', at: [720, 90], size: [56, 56], value: 0.05, labelAt: 'n', label: 'ERROR RATE', n: 5, lead: 'w', name: 'Error-rate alarm', note: 'pages on-call above 5% for 2 minutes' },
    { id: 'bell', kind: 'bell', at: [720, 230], size: [40, 42], label: 'PAGER', n: 6, lead: 'w', name: 'Pager', note: 'wakes the on-call engineer' }
  ],
  lines: [
    { id: 'orders', from: 'users.e', to: 'app.w', label: 'ORDERS' },
    { id: 'pool', from: 'app.e', to: 'db.w', kind: 'pipe' },
    { id: 'queued', from: 'app.n', to: 'wait.s', kind: 'wire' },
    { id: 'reads', from: 'config.n', to: 'app.s', kind: 'wire' },
    { id: 'push', from: 'change.e', to: 'config.w' },
    { id: 'push2', from: 'change.n', to: 'check.w' },
    { id: 'push3', from: 'check.e', to: 'config.n-24' },
    { id: 'alarm', from: 'gauge.s', to: 'bell.n', kind: 'wire' }
  ],
  steps: [
    {
      say: 'On a normal day, orders from customers (1) go through the app servers (2) into the database (3).',
      draw: ['users', 'orders', 'app', 'pool', 'db', 'config', 'reads'],
      run: [{ on: 'orders', item: 'chip', text: 'order', dur: 0.8 }, { on: 'pool', item: 'chip', text: 'order', dur: 0.8, arrive: { ok: ['db'] } }],
      note: { at: 'pool', text: '200 CONNECTIONS', dy: -14 }
    },
    {
      say: 'At 14:02 a config change (4) cuts the database connection limit from 200 to 20.',
      draw: ['change', 'push'],
      run: [{ on: 'push', item: 'letter', dur: 1.0, arrive: { set: { config: { lines: 5 } }, glow: ['config'] } },
            { on: 'reads', item: 'bit', dur: 0.6 }],
      note: { at: 'pool', text: '20 CONNECTIONS', dy: -14 }
    },
    {
      say: 'Orders now wait for a free connection, and most time out. 38% of checkouts fail.',
      draw: ['queued', 'wait'],
      run: [{ on: 'orders', item: 'chip', text: 'order', count: 4, gap: 0.25, dur: 0.8 }],
      then: { set: { wait: { count: 5 }, gauge: { value: 0.62 } }, fail: ['app'] }
    },
    {
      say: 'At 14:06 the error-rate alarm (5) fires and the pager (6) wakes the on-call engineer.',
      draw: ['gauge', 'alarm', 'bell'],
      run: [{ on: 'alarm', item: 'bit', dur: 0.6, arrive: { ring: ['bell'] } }],
      note: { at: [712, 152], text: '38% FAILING', anchor: 'end' }
    },
    {
      say: 'At 14:11 the change is rolled back, and the limit goes back to 200.',
      run: [{ on: 'push', back: true, item: 'letter', dur: 0.9, arrive: { set: { config: { lines: 4 } } } },
            { on: 'reads', item: 'bit', dur: 0.6 }],
      note: { at: 'pool', text: '200 CONNECTIONS', dy: -14 }
    },
    {
      say: 'Waiting orders go through and the error rate drops back to normal within four minutes.',
      run: [{ on: 'pool', item: 'chip', text: 'order', count: 4, gap: 0.25, dur: 0.8 }],
      then: { set: { wait: { count: 0 }, gauge: { value: 0.05 } }, ok: ['app'] }
    },
    {
      say: 'Root cause: the new limit was copied from a test setting, and nothing checked it before deploy.',
      glow: ['push', 'config'],
      hold: 2.2
    },
    {
      say: 'So every config change now passes a check (7) that blocks limits outside the safe range.',
      erase: ['push'],
      draw: ['push2', 'check', 'push3'],
      run: [{ on: 'push2', item: 'letter', color: 'fail', dur: 0.8, arrive: { fail: ['check'] } }]
    },
    {
      say: 'Impact: 9 minutes of failed checkouts. The check would have stopped the change before it shipped.',
      note: { at: [560, 330], text: '14:02  LIMIT CHANGED TO 20\n14:06  ALARM FIRES\n14:11  ROLLED BACK\n14:15  ERROR RATE NORMAL', anchor: 'start' },
      hold: 3
    }
  ]
});
