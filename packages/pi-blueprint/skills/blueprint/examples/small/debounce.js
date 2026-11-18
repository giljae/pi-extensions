// Debouncing a search box: key presses keep winding a timer back, and only
// when typing stops does one search go out.
// kc and kb are short bridges where the timer and the bell will sit, so the
// first two steps show one unbroken line; step 3 erases them as the parts arrive.
BLUEPRINT.scene('debounce', {
  title: 'How debouncing a search box works',
  fig: 1,
  size: [640, 320],
  parts: [
    { id: 'zone', kind: 'zone', at: [246, 170], size: [420, 230], label: 'IN THE BROWSER' },
    { id: 'search', kind: 'screen', at: [110, 170], size: [112, 76], label: 'SEARCH', n: 1, lead: 'n', name: 'Search box', note: 'sends what you have typed so far; you press a key about every 150 ms' },
    { id: 'clock', kind: 'clock', at: [270, 170], size: [50, 50], label: 'WAIT 300 MS', n: 3, lead: 'n', name: 'Timer', note: 'winds back to 300 ms on every key press and only fires when it runs out' },
    { id: 'bell', kind: 'bell', at: [400, 170], size: [40, 42], label: 'SEND', n: 4, lead: 'n', name: 'Bell', note: 'rings once when the timer runs out, and sends one search' },
    { id: 'gear', kind: 'gear', at: [550, 84], size: [40, 40] },
    { id: 'server', kind: 'box', at: [550, 170], size: [104, 60], label: 'SERVER', n: 2, lead: 'ne', name: 'Server', note: 'runs each search it is sent, ~80 ms of work every time' }
  ],
  lines: [
    { id: 'k1', from: 'search.e', to: 'clock.w', label: 'KEYS', labelPos: 0.45 },
    { id: 'kc', from: 'clock.w', to: 'clock.e' },
    { id: 'k2', from: 'clock.e', to: 'bell.w' },
    { id: 'kb', from: 'bell.w', to: 'bell.e' },
    { id: 'k3', from: 'bell.e', to: 'server.w', arrow: true },
    { id: 'shaft', from: 'gear.s', to: 'server.n', heavy: true },
    { id: 'quiet', from: [270, 246], to: [400, 246], kind: 'dim', label: '300 MS OF QUIET' }
  ],
  steps: [
    {
      say: 'You type "q" into the search box (1), and it asks the server (2) right away.',
      draw: ['zone', 'search', 'k1', 'kc', 'k2', 'kb', 'k3', 'server', 'gear', 'shaft'],
      set: { search: { text: 'q' } },
      run: [
        { from: 'search.e', to: 'server.w', item: 'chip', text: 'q', dur: 1.3, ease: 'linear', arrive: { set: { server: { text: 'SERVER\n1 SEARCH' } } } }
      ],
      spin: ['gear']
    },
    {
      say: 'But each key press sends its own search: five searches for one word, four wasted.',
      set: { search: { text: 'qu' } },
      run: [
        { from: 'search.e', to: 'server.w', item: 'chip', text: 'qu', dur: 0.9, ease: 'linear', arrive: { set: { server: { text: 'SERVER\n2 SEARCHES' }, search: { text: 'que' } } } },
        { from: 'search.e', to: 'server.w', item: 'chip', text: 'que', dur: 0.9, ease: 'linear', arrive: { set: { server: { text: 'SERVER\n3 SEARCHES' }, search: { text: 'quer' } } } },
        { from: 'search.e', to: 'server.w', item: 'chip', text: 'quer', dur: 0.9, ease: 'linear', arrive: { set: { server: { text: 'SERVER\n4 SEARCHES' }, search: { text: 'query' } } } },
        { from: 'search.e', to: 'server.w', item: 'chip', text: 'query', dur: 0.9, ease: 'linear', arrive: { set: { server: { text: 'SERVER\n5 SEARCHES' } }, fail: ['server'] } }
      ],
      spin: ['gear'],
      then: { note: { at: 'server.s', text: '5 × ~80 MS · 4 WASTED', dy: 18 } }
    },
    {
      say: 'So a timer (3) goes in the way, and a bell (4) that rings only when the timer runs out.',
      erase: ['kc', 'kb'],
      draw: ['clock', 'bell'],
      set: { search: { text: ' ' }, server: { text: 'SERVER' } },
      glow: ['clock', 'bell'],
      hold: 1.8
    },
    {
      say: 'Now each key press only winds the timer back to 300 ms. Nothing reaches the server.',
      set: { search: { text: 'q' } },
      run: [
        { on: 'k1', item: 'chip', text: 'q', dur: 0.7, arrive: { ring: ['clock'], set: { search: { text: 'qu' } } } },
        { on: 'k1', item: 'chip', text: 'qu', dur: 0.7, arrive: { ring: ['clock'], set: { search: { text: 'que' } } } },
        { on: 'k1', item: 'chip', text: 'que', dur: 0.7, arrive: { ring: ['clock'], set: { search: { text: 'quer' } } } },
        { on: 'k1', item: 'chip', text: 'quer', dur: 0.7, arrive: { ring: ['clock'], set: { search: { text: 'query' } } } },
        { on: 'k1', item: 'chip', text: 'query', dur: 0.7, arrive: { ring: ['clock'] } }
      ],
      spin: ['clock'],
      note: { at: 'server.s', text: 'NO SEARCHES YET', dy: 18 }
    },
    {
      say: 'You stop typing. After 300 ms the bell (4) rings, and one search for "query" goes out.',
      draw: ['quiet'],
      spin: ['clock', 'gear'],
      run: [
        { on: 'k2', item: 'chip', text: 'query', dur: 0.9, at: 1.4, arrive: { ring: ['bell'] } },
        { on: 'k3', item: 'chip', text: 'query', dur: 1.0, arrive: { set: { server: { text: 'SERVER\n1 SEARCH' } }, ok: ['server'] } }
      ]
    },
    {
      say: 'Five key presses, one search: the server only hears the word you finished.',
      glow: ['server'],
      note: [
        { at: 'server.s', text: '5 KEYS → 1 SEARCH', dy: 18 },
        { at: 'search.s', text: 'A KEY EVERY ~150 MS', dy: 18 }
      ],
      hold: 2.4
    }
  ]
});
