// A token-bucket rate limiter: a tank of tokens, a gate that takes one per
// request, and a clock that drips tokens back in.
// cb is a short bridge where the gate will stand, so step 1 shows one unbroken
// line; step 2 erases it as the gate arrives.
BLUEPRINT.scene('rate-limit', {
  title: 'How a token bucket rate limiter works',
  fig: 1,
  size: [640, 320],
  parts: [
    { id: 'client', kind: 'screen', at: [80, 220], size: [100, 70], label: 'CLIENT', n: 1, lead: 'n', name: 'Client', note: 'an app that sometimes fires off a burst of 20 requests in one second' },
    { id: 'tank', kind: 'tank', at: [330, 92], size: [56, 78], level: 1, labelAt: 'w', label: 'TOKENS', n: 4, lead: 'n', name: 'Token tank', note: 'holds at most 5 tokens; a full tank lets a burst of 5 straight through' },
    { id: 'gate', kind: 'gate', at: [300, 220], size: [76, 44], label: 'GATE', n: 3, lead: 'se', name: 'Gate', note: 'lets a request through only if it can take a token from the tank' },
    { id: 'clock', kind: 'clock', at: [450, 92], size: [46, 46], label: 'REFILL', n: 5, lead: 'n', name: 'Refill clock', note: 'drops one token back into the tank every 200 ms, so 5 a second' },
    { id: 'gauge', kind: 'gauge', at: [550, 112], size: [50, 50], value: 0.25, labelAt: 'e', label: 'LOAD' },
    { id: 'server', kind: 'box', at: [550, 220], size: [100, 60], label: 'SERVER', n: 2, lead: 'ne', name: 'Server', note: 'can answer about 5 requests a second before it slows down' }
  ],
  lines: [
    { id: 'c1', from: 'client.e', to: 'gate.w', label: 'REQUESTS' },
    { id: 'cb', from: 'gate.w', to: 'gate.e' },
    { id: 'c2', from: 'gate.e', to: 'server.w', arrow: true },
    { id: 'stalk', from: 'gauge.s', to: 'server.n' },
    { id: 'feed', from: 'tank.s', to: 'gate.n+30', kind: 'pipe' },
    { id: 'drip', from: 'clock.w', to: 'tank.e', kind: 'wire', arrow: true }
  ],
  steps: [
    {
      say: 'A client (1) sends the server (2) 20 requests in one second, and the server chokes.',
      draw: ['client', 'c1', 'cb', 'c2', 'server', 'stalk', 'gauge'],
      run: [
        { from: 'client.e', to: 'server.w', item: 'packet', count: 8, gap: 0.16, dur: 1.2, ease: 'linear', arrive: { set: { gauge: { value: 1 } }, fail: ['server'] } }
      ],
      note: { at: 'server.s', text: '20 REQ/S · COPES WITH 5', dy: 18 }
    },
    {
      say: 'So a gate (3) goes in front, fed by a tank (4) that holds 5 tokens.',
      erase: ['cb'],
      draw: ['gate', 'feed', 'tank'],
      set: { gauge: { value: 0.25 } },
      glow: ['tank'],
      note: { at: 'tank.e', text: '5 OF 5', dx: 10, dy: -30 }
    },
    {
      say: 'Each request takes one token to get through. Three requests, three tokens gone.',
      run: [
        { on: 'c1', item: 'chip', text: 'REQ 1', dur: 0.7, arrive: { set: { tank: { level: 0.8 } } } },
        { on: 'feed', item: 'bit', dur: 0.4, arrive: { set: { gate: { open: 1 } } } },
        { on: 'c2', item: 'chip', text: 'REQ 1', dur: 0.7, arrive: { set: { gate: { open: 0 } } } },
        { on: 'c1', item: 'chip', text: 'REQ 2', dur: 0.7, arrive: { set: { tank: { level: 0.6 } } } },
        { on: 'feed', item: 'bit', dur: 0.4, arrive: { set: { gate: { open: 1 } } } },
        { on: 'c2', item: 'chip', text: 'REQ 2', dur: 0.7, arrive: { set: { gate: { open: 0 } } } },
        { on: 'c1', item: 'chip', text: 'REQ 3', dur: 0.7, arrive: { set: { tank: { level: 0.4 } } } },
        { on: 'feed', item: 'bit', dur: 0.4, arrive: { set: { gate: { open: 1 } } } },
        { on: 'c2', item: 'chip', text: 'REQ 3', dur: 0.7, arrive: { set: { gate: { open: 0 } }, ok: ['server'] } }
      ],
      then: { note: { at: 'tank.e', text: '2 OF 5', dx: 10, dy: -30 } }
    },
    {
      say: 'Requests 4 and 5 take the last two tokens, but request 6 finds none and is turned away.',
      run: [
        { on: 'c1', item: 'chip', text: 'REQ 4', dur: 0.5, arrive: { set: { tank: { level: 0.2 }, gate: { open: 1 } } } },
        { on: 'c2', item: 'chip', text: 'REQ 4', dur: 0.5 },
        { on: 'c1', item: 'chip', text: 'REQ 5', dur: 0.5, arrive: { set: { tank: { level: 0 } } } },
        { on: 'c2', item: 'chip', text: 'REQ 5', dur: 0.5, arrive: { set: { gate: { open: 0 } } } },
        { on: 'c1', item: 'chip', text: 'REQ 6', dur: 0.7, arrive: { fail: ['gate'] } },
        { on: 'c1', back: true, item: 'chip', text: '429', color: 'fail', dur: 0.8 }
      ],
      then: { note: [{ at: 'tank.e', text: '0 OF 5', dx: 10, dy: -30 }, { at: [190, 250], text: '429 · TRY LATER', anchor: 'middle' }] }
    },
    {
      say: 'So a clock (5) drips a token back in every 200 ms, and request 6 gets through.',
      draw: ['clock', 'drip'],
      spin: ['clock'],
      run: [
        { on: 'drip', item: 'bit', dur: 0.6, arrive: { set: { tank: { level: 0.2 } } } },
        { on: 'drip', item: 'bit', dur: 0.6, arrive: { set: { tank: { level: 0.4 } } } },
        { on: 'c1', item: 'chip', text: 'REQ 6', dur: 0.7, arrive: { set: { tank: { level: 0.2 }, gate: { open: 1 } } } },
        { on: 'c2', item: 'chip', text: 'REQ 6', dur: 0.7, arrive: { set: { gate: { open: 0 } }, ok: ['server'] } }
      ],
      note: { at: 'clock.s', text: '+1 / 200 MS', dy: 30 }
    },
    {
      say: 'Bursts of up to 5 pass at once; after that, 5 a second, never more.',
      spin: ['clock'],
      run: [
        { on: 'drip', item: 'bit', dur: 0.6, arrive: { set: { tank: { level: 0.4 } } } },
        { on: 'drip', item: 'bit', dur: 0.6, arrive: { set: { tank: { level: 0.6 } } } }
      ],
      glow: ['tank', 'gate'],
      set: { gauge: { value: 0.5 } },
      note: [
        { at: 'clock.s', text: '+1 / 200 MS', dy: 30 },
        { at: 'tank.e', text: '3 OF 5', dx: 10, dy: -30 },
        { at: 'server.s', text: 'AT MOST 5 REQ/S', dy: 18 }
      ],
      hold: 2.4
    }
  ]
});
