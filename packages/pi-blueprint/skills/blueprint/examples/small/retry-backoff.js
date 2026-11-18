BLUEPRINT.scene('retry-backoff', {
  title: 'Retry with exponential backoff',
  fig: 2,
  size: [640, 320],
  parts: [
    { id: 'app', kind: 'screen', at: [90, 170], label: 'APP', n: 1, lead: 'sw', name: 'App', note: 'sends order #42 and wants a yes' },
    { id: 'server', kind: 'box', at: [530, 170], size: [96, 56], label: 'SERVER', n: 2, lead: 'e', name: 'Server', note: 'saves orders, but turns work away when it is swamped' },
    { id: 'load', kind: 'tank', at: [530, 76], size: [44, 60], level: 0.95, label: 'LOAD', labelAt: 'w', n: 3, lead: 'e', name: 'Load', note: 'how full the server is; above ~80% it drops new requests' },
    { id: 'clock', kind: 'clock', at: [310, 70], label: 'BACKOFF', n: 4, lead: 'e', name: 'Backoff timer', note: 'makes the app wait 1 s, then 2 s, then 4 s before each retry' },
    { id: 'axis', kind: 'label', at: [116, 265], label: 'WAITS' }
  ],
  lines: [
    { id: 'call', from: 'app.e', to: 'server.w', label: 'POST /ORDER', labelPos: 0.62 },
    { id: 'gwire', from: 'load.s', to: 'server.n', kind: 'wire' },
    { id: 'cwire', from: 'app.n', to: 'clock.w', kind: 'wire', bend: 'vh' },
    { id: 'd1', from: [170, 265], to: [210, 265], kind: 'dim', label: '1 S' },
    { id: 'd2', from: [210, 265], to: [290, 265], kind: 'dim', label: '2 S' },
    { id: 'd3', from: [290, 265], to: [450, 265], kind: 'dim', label: '4 S' }
  ],
  steps: [
    {
      say: 'The app (1) sends order #42 to the server (2), but it is swamped (3) and drops it.',
      draw: ['app', 'call', 'server', 'gwire', 'load'],
      run: [{ on: 'call', item: 'chip', text: '#42', dur: 1.0, arrive: { fail: ['server'] } }],
      then: { note: { at: 'server.s', text: '503 · TOO BUSY', dy: 16 } }
    },
    {
      say: 'Retrying at once only piles on: three tries in a blink, all dropped, and the load climbs.',
      run: [{ on: 'call', item: 'chip', text: '#42', count: 3, gap: 0.22, dur: 0.6, arrive: { fail: ['server'], set: { load: { level: 1 } } } }],
      ring: ['load', 'server'],
      then: { note: { at: 'server.s', text: '3 TRIES IN 0.2 S', dy: 16 } }
    },
    {
      say: 'So a timer (4) makes the app wait 1 s first. The load eases, but not enough.',
      draw: ['cwire', 'clock', 'axis', 'd1'],
      spin: ['clock'],
      run: [
        { on: 'd1', item: 'bit', dur: 1.0, ease: 'linear', arrive: { set: { load: { level: 0.82 } } } },
        { on: 'call', item: 'chip', text: '#42', dur: 0.9, arrive: { fail: ['server'], note: { at: [210, 284], text: 'FAIL', anchor: 'middle', keep: true } } }
      ]
    },
    {
      say: 'So the next wait doubles to 2 s. Closer, but the server still turns #42 away.',
      draw: ['d2'],
      spin: ['clock'],
      run: [
        { on: 'd2', item: 'bit', dur: 1.6, ease: 'linear', arrive: { set: { load: { level: 0.62 } } } },
        { on: 'call', item: 'chip', text: '#42', dur: 0.9, arrive: { fail: ['server'], note: { at: [290, 284], text: 'FAIL', anchor: 'middle', keep: true } } }
      ]
    },
    {
      say: 'The wait doubles again to 4 s, the server catches up, and order #42 goes through.',
      draw: ['d3'],
      spin: ['clock'],
      run: [
        { on: 'd3', item: 'bit', dur: 2.6, ease: 'linear', arrive: { set: { load: { level: 0.35 } } } },
        { on: 'call', item: 'chip', text: '#42', dur: 0.9, arrive: { ok: ['server'], note: { at: [450, 284], text: 'OK', anchor: 'middle', keep: true } } },
        { on: 'call', back: true, item: 'chip', text: '200 OK', color: 'ok', dur: 0.9 }
      ],
      then: { set: { app: { text: 'SAVED' } }, ok: ['app'] }
    },
    {
      say: 'Waiting longer each time takes the pressure off, so a struggling server can recover.',
      set: { load: { level: 0.2 } },
      glow: ['d1', 'd2', 'd3'],
      note: [
        { at: [310, 302], text: '4 TRIES · 7 S OF WAITING', anchor: 'middle' },
        { at: 'clock.s', text: 'NEXT WAIT = 2 × LAST', dy: 26 }
      ],
      hold: 2.4
    }
  ]
});
