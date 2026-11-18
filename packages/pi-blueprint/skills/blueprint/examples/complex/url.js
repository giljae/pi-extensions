BLUEPRINT.scene('url', {
  title: 'What happens when you open a web page',
  fig: 1,
  size: [800, 400],
  parts: [
    { id: 'browser', kind: 'screen', at: [90, 220], size: [120, 86], label: 'BROWSER', n: 1, lead: 'se', name: 'Browser', note: 'turns a name into a page you can read' },
    { id: 'dns', kind: 'book', at: [250, 80], size: [90, 60], labelAt: 'e', label: 'DNS', lines: 6, max: 10, n: 2, lead: 'n', name: 'DNS', note: 'the address book that turns names into numbers' },
    { id: 'lock', kind: 'lock', at: [380, 220], size: [34, 42], open: 1, label: 'LOCK', n: 3, lead: 'n', name: 'TLS', note: 'a secret key both sides agree on, so nobody between can read along' },
    { id: 'zone', kind: 'zone', at: [640, 240], size: [250, 290], label: 'DATA CENTRE' },
    { id: 'gear', kind: 'gear', at: [600, 140], size: [44, 44], teeth: 12 },
    { id: 'server', kind: 'box', at: [600, 225], size: [124, 70], label: 'WEB SERVER', n: 4, lead: 'e', name: 'Web server', note: 'builds the page' },
    { id: 'db', kind: 'drum', at: [600, 330], size: [74, 60], labelAt: 'e', label: 'DATABASE', n: 5, lead: 'w', name: 'Database', note: 'holds what the page is made of' }
  ],
  lines: [
    { id: 'q', from: 'browser.n', to: 'dns.w' },
    { id: 't1', from: 'browser.e', to: 'lock.w', label: 'HTTPS' },
    { id: 't2', from: 'lock.e', to: 'server.w', kind: 'pipe' },
    { id: 'shaft', from: 'gear.s', to: 'server.n', heavy: true },
    { id: 'd', from: 'server.s', to: 'db.n' }
  ],
  steps: [
    {
      say: 'You type example.com into the browser (1) and press Enter.',
      draw: ['browser'],
      then: { set: { browser: { text: 'EXAMPLE.COM' } } }
    },
    {
      say: 'First it looks up the street address for that name in the address book, DNS (2).',
      draw: ['q', 'dns'],
      run: [
        { on: 'q', item: 'chip', text: 'example.com?', dur: 1.1, arrive: { glow: ['dns'] } },
        { on: 'q', back: true, item: 'chip', text: '93.184.215.14', dur: 1.1 }
      ],
      note: { at: 'dns.s', text: '~20 MS' }
    },
    {
      say: 'It calls that address, and both sides agree on a secret key so nobody in between can read along (3).',
      draw: ['t1', 'lock', 't2', 'zone', 'server'],
      run: [
        { on: 't1', item: 'key', dur: 0.8 },
        { on: 't2', item: 'key', dur: 0.8 },
        { on: 't2', back: true, item: 'key', dur: 0.8 },
        { on: 't1', back: true, item: 'key', dur: 0.8, arrive: { set: { lock: { open: 0 } } } }
      ],
      note: { at: [380, 292], text: '~50 MS', anchor: 'middle' }
    },
    {
      say: 'The request travels down the locked line to the web server (4).',
      view: ['lock', 'zone'],
      run: [
        { on: 't1', item: 'chip', text: 'GET /', dur: 0.8 },
        { on: 't2', item: 'chip', text: 'GET /', dur: 0.9, arrive: { glow: ['server'] } }
      ]
    },
    {
      say: 'The server asks the database (5) for what the page needs, and builds the page.',
      draw: ['gear', 'shaft', 'd', 'db'],
      run: [
        { on: 'd', item: 'chip', text: 'SELECT', dur: 0.8 },
        { on: 'd', back: true, item: 'packet', dur: 0.8 }
      ],
      spin: ['gear'],
      note: { at: 'gear.e', text: '~100 MS' }
    },
    {
      say: 'It sends the page back in pieces, all through the same locked line.',
      view: 'all',
      run: [
        { on: 't2', back: true, item: 'packet', count: 3, gap: 0.3, dur: 1.0 },
        { on: 't1', back: true, item: 'packet', count: 3, gap: 0.3, dur: 1.0 }
      ]
    },
    {
      say: 'The browser puts the pieces together and paints the page.',
      view: ['browser'],
      set: { browser: { text: 'HELLO!' } },
      glow: ['browser'],
      then: { ok: ['browser'] }
    },
    {
      say: 'All of that usually takes a fraction of a second.',
      view: 'all',
      note: { at: [400, 368], text: 'TOTAL · ~250 MS', anchor: 'middle' },
      hold: 2.4
    }
  ]
});
