BLUEPRINT.scene('circuit-breaker', {
  title: 'How a circuit breaker works',
  fig: 3,
  sheet: 'SHEET 1 OF 1',
  size: [800, 400],
  parts: [
    { id: 'checkout', kind: 'screen', at: [90, 200], size: [110, 80], label: 'CHECKOUT', n: 1, lead: 'nw', name: 'Checkout', note: 'the service that calls payments for every order' },
    { id: 'payzone', kind: 'zone', at: [650, 185], size: [170, 230], label: 'PAYMENT SERVICE' },
    { id: 'gear', kind: 'gear', at: [650, 120], size: [48, 48], teeth: 12 },
    { id: 'payment', kind: 'box', at: [650, 200], size: [110, 60], label: 'PAYMENTS', n: 2, lead: 'se', name: 'Payments', note: 'charges the card; ~80 ms on a good day, 30 s on a bad one' },
    { id: 'queue', kind: 'queue', at: [250, 200], size: [130, 30], slots: 5, count: 0, label: 'WAITING CALLS', n: 3, lead: 'ne', name: 'Waiting calls', note: 'requests stuck holding a thread while payments is slow' },
    { id: 'tank', kind: 'tank', at: [90, 316], size: [56, 70], level: 0.1, label: 'THREADS', n: 4, lead: 'w', name: 'Thread pool', note: '200 threads; every waiting call holds one' },
    { id: 'tclock', kind: 'clock', at: [250, 110], label: 'TIMEOUT', labelAt: 'n', n: 5, lead: 'nw', name: 'Timeout', note: 'each call gives up after 2 s' },
    { id: 'gauge', kind: 'gauge', at: [430, 300], value: 0, label: 'ERROR RATE', n: 6, lead: 'w', name: 'Error-rate gauge', note: 'share of the last 10 calls that failed; trips the breaker at 50%' },
    { id: 'valve', kind: 'valve', at: [430, 200], size: [36, 36], open: 1, n: 7, lead: 'sw', name: 'Breaker', note: 'a valve on the line: shut means fail at once, without calling' },
    { id: 'blabel', kind: 'label', at: [486, 232], label: 'BREAKER' },
    { id: 'lamp', kind: 'lamp', at: [515, 135], on: 0, label: 'TRIPPED', n: 8, lead: 'ne', name: 'Tripped lamp', note: 'lit while the breaker is shut' },
    { id: 'cool', kind: 'clock', at: [430, 110], label: 'COOL-DOWN', labelAt: 'n', n: 9, lead: 'ne', name: 'Cool-down', note: 'after 30 s shut, lets one trial call through (half-open)' }
  ],
  lines: [
    { id: 'a1', from: 'checkout.e', to: 'queue.w', kind: 'pipe' },
    { id: 'qthru', from: 'queue.w', to: 'queue.e', kind: 'pipe' },
    { id: 'a2', from: 'queue.e', to: 'valve.w', kind: 'pipe' },
    { id: 'vthru', from: 'valve.w', to: 'valve.e', kind: 'pipe' },
    { id: 'a3', from: 'valve.e', to: 'payment.w', kind: 'pipe' },
    { id: 'shaft', from: 'gear.s', to: 'payment.n', heavy: true },
    { id: 'tw', from: 'tclock.s', to: 'queue.n', kind: 'wire' },
    { id: 'pw', from: 'tank.n', to: 'checkout.s', kind: 'wire' },
    { id: 'gw', from: 'gauge.n', to: 'valve.s', kind: 'wire' },
    { id: 'cw', from: 'cool.s', to: 'valve.n', kind: 'wire' },
    { id: 'dimwait', from: [185, 252], to: [315, 252], kind: 'dim', label: 'UP TO 2 S' }
  ],
  steps: [
    {
      say: 'Checkout (1) asks payments (2) to charge $42, and the answer is back in ~80 ms.',
      draw: ['checkout', 'a1', 'qthru', 'a2', 'vthru', 'a3', 'payzone', 'payment', 'gear', 'shaft'],
      run: [
        { on: 'a1', item: 'chip', text: '$42', dur: 0.4, ease: 'linear' },
        { on: 'qthru', item: 'chip', text: '$42', dur: 0.4, ease: 'linear' },
        { on: 'a2', item: 'chip', text: '$42', dur: 0.4, ease: 'linear' },
        { on: 'vthru', item: 'chip', text: '$42', dur: 0.15, ease: 'linear' },
        { on: 'a3', item: 'chip', text: '$42', dur: 0.4, ease: 'linear', arrive: { ok: ['payment'] } },
        { on: 'a3', back: true, item: 'chip', text: 'PAID', dur: 0.4, ease: 'linear' },
        { on: 'vthru', back: true, item: 'chip', text: 'PAID', dur: 0.15, ease: 'linear' },
        { on: 'a2', back: true, item: 'chip', text: 'PAID', dur: 0.4, ease: 'linear' },
        { on: 'qthru', back: true, item: 'chip', text: 'PAID', dur: 0.4, ease: 'linear' },
        { on: 'a1', back: true, item: 'chip', text: 'PAID', dur: 0.4, ease: 'linear' }
      ],
      spin: ['gear'],
      note: { at: 'payment.s', text: '~80 MS', dy: 16 }
    },
    {
      say: 'But payments slows to a crawl, so calls pile up (3), each holding one of 200 threads (4).',
      view: [0, 80, 600, 300],
      draw: ['queue', 'pw', 'tank'],
      set: { payment: { text: 'PAYMENTS\nSLOW' } },
      run: [
        { on: 'a1', item: 'packet', count: 5, gap: 0.45, dur: 0.6, arrive: { set: { queue: { count: 5 }, tank: { level: 0.95 } } } }
      ],
      note: [{ at: 'payment.s', text: '30 S PER CALL', dy: 16 }, { at: 'tank.e', text: '190 OF 200 BUSY', dx: 10 }]
    },
    {
      say: 'Each one gives up at the 2 s timeout (5), and the shopper sees an error.',
      draw: ['tw', 'tclock', 'dimwait'],
      spin: ['tclock'],
      then: { fail: ['queue', 'checkout'], set: { checkout: { text: 'ERROR' } } }
    },
    {
      say: 'So a gauge (6) counts the failures: 6 of the last 10 calls failed.',
      view: [180, 80, 560, 280],
      draw: ['gw', 'gauge'],
      set: { checkout: { text: 'CHECKOUT' } },
      run: [
        { on: 'gw', back: true, item: 'bit', color: 'fail', count: 6, gap: 0.25, dur: 0.7, arrive: { set: { gauge: { value: 0.6 } } } }
      ],
      note: { at: 'gauge.e', text: '60% FAILING', dx: 8 }
    },
    {
      say: 'Past 50% the breaker (7) trips: the valve shuts and the lamp (8) lights.',
      draw: ['valve', 'blabel', 'lamp'],
      set: { valve: { open: 0 }, lamp: { on: 1 } },
      glow: ['valve'],
      note: { at: 'gauge.e', text: 'TRIP AT 50%', dx: 8 }
    },
    {
      say: 'Now calls fail at once, in 1 ms instead of 2 s, and payments gets room to recover.',
      set: { queue: { count: 0 }, tank: { level: 0.1 } },
      run: [
        { on: 'a1', item: 'chip', text: '$42', dur: 0.4, ease: 'linear' },
        { on: 'qthru', item: 'chip', text: '$42', dur: 0.4, ease: 'linear' },
        { on: 'a2', item: 'chip', text: '$42', dur: 0.4, ease: 'linear', arrive: { fail: ['valve'] } },
        { on: 'a2', back: true, item: 'chip', text: 'TRY LATER', color: 'fail', dur: 0.4, ease: 'linear' },
        { on: 'qthru', back: true, item: 'chip', text: 'TRY LATER', color: 'fail', dur: 0.4, ease: 'linear' },
        { on: 'a1', back: true, item: 'chip', text: 'TRY LATER', color: 'fail', dur: 0.4, ease: 'linear' }
      ],
      spin: ['gear'],
      then: { set: { payment: { text: 'PAYMENTS\nRECOVERING' } } },
      note: { at: [452, 262], text: 'FAIL FAST · 1 MS', anchor: 'start' }
    },
    {
      say: 'But it cannot stay shut, so after a 30 s cool-down (9) it opens a crack: half-open.',
      view: [180, 40, 600, 300],
      draw: ['cw', 'cool'],
      spin: ['cool'],
      then: { set: { valve: { open: 0.5 }, gauge: { value: 0 } }, glow: ['valve'], note: { at: [452, 262], text: 'HALF-OPEN', anchor: 'start' } }
    },
    {
      say: 'One trial charge goes through and succeeds in 80 ms, so the breaker closes again.',
      view: 'all',
      set: { payment: { text: 'PAYMENTS' } },
      run: [
        { on: 'a1', item: 'chip', text: 'TRIAL', dur: 0.4, ease: 'linear' },
        { on: 'qthru', item: 'chip', text: 'TRIAL', dur: 0.4, ease: 'linear' },
        { on: 'a2', item: 'chip', text: 'TRIAL', dur: 0.4, ease: 'linear' },
        { on: 'vthru', item: 'chip', text: 'TRIAL', dur: 0.15, ease: 'linear' },
        { on: 'a3', item: 'chip', text: 'TRIAL', dur: 0.4, ease: 'linear', arrive: { ok: ['payment'] } },
        { on: 'a3', back: true, item: 'chip', text: 'PAID', color: 'ok', dur: 0.4, ease: 'linear' },
        { on: 'vthru', back: true, item: 'chip', text: 'PAID', color: 'ok', dur: 0.15, ease: 'linear', arrive: { set: { valve: { open: 1 }, lamp: { on: 0 } }, ok: ['valve'] } }
      ],
      spin: ['gear']
    },
    {
      say: 'Shut fast while it fails, test with one call, and let traffic flow once it works.',
      run: [
        { on: 'a1', item: 'packet', count: 3, gap: 0.3, dur: 0.4, ease: 'linear' },
        { on: 'qthru', item: 'packet', count: 3, gap: 0.3, dur: 0.4, ease: 'linear' },
        { on: 'a2', item: 'packet', count: 3, gap: 0.3, dur: 0.4, ease: 'linear' },
        { on: 'vthru', item: 'packet', count: 3, gap: 0.3, dur: 0.15, ease: 'linear' },
        { on: 'a3', item: 'packet', count: 3, gap: 0.3, dur: 0.4, ease: 'linear' }
      ],
      spin: ['gear'],
      note: [
        { at: 'gauge.e', text: 'TRIP AT 50%', dx: 8 },
        { at: 'cool.w', text: 'RETRY AFTER 30 S', dx: -12 },
        { at: 'tank.e', text: 'THREADS FREE', dx: 10 },
        { at: 'payment.s', text: '~80 MS AGAIN', dy: 16 }
      ],
      hold: 2.6
    }
  ]
});
