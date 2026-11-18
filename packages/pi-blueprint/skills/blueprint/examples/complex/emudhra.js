// The eMudhra certificate-authority key compromise, October 2026.
// Facts from Cloudflare, The Register, Help Net Security and eMudhra's own
// incident statement (see gallery notes). Kept to what those sources agree on.
BLUEPRINT.scene('emudhra', {
  title: 'The eMudhra key compromise',
  fig: 1,
  sources: [
    ['Cloudflare', 'https://blog.cloudflare.com/emudhra-certificate-compromise/'],
    ['The Register', 'https://www.theregister.com/security/2026/10/20/indian-certification-authority-emudhras-private-keys-compromised-one-of-them-was-the-number-4/5304312'],
    ['Help Net Security', 'https://www.helpnetsecurity.com/2026/10/21/emudhra-certificates-private-keys-compromised/'],
    ['eMudhra statement', 'https://emudhra.com/en/post/certificate-security-incident']
  ],
  size: [800, 400],
  parts: [
    { id: 'trust', kind: 'book', at: [100, 76], size: [80, 52], lines: 4, max: 8, labelAt: 'n', label: 'TRUST LIST' },
    { id: 'phone', kind: 'screen', at: [100, 210], size: [120, 86], label: 'PHONE', n: 1, lead: 'w', name: 'Your phone', note: 'checks every website’s certificate before it shows the padlock' },
    { id: 'bank', kind: 'box', at: [700, 210], size: [120, 64], label: 'YOURBANK.IN', n: 2, lead: 'ne', name: 'Website', note: 'proves who it is with a certificate signed by a certificate authority' },
    { id: 'cert', kind: 'letter', at: [700, 130], size: [44, 30], labelAt: 'e', label: 'CERT', muted: true },
    { id: 'zone', kind: 'zone', at: [395, 100], size: [330, 150], label: 'EMUDHRA · CERTIFICATE AUTHORITY' },
    { id: 'root', kind: 'box', at: [300, 95], size: [96, 48], hatch: false, label: 'ROOT G3', n: 3, lead: 's', name: 'Root', note: 'eMudhra’s top key, built into phones and browsers' },
    { id: 'inter', kind: 'box', at: [480, 95], size: [96, 48], label: 'SIGNER', n: 4, lead: 'ne', name: 'Intermediate signer', note: 'one of 8 keys the root vouched for; these sign website certificates' },
    { id: 'key', kind: 'key', at: [480, 142], size: [40, 16], label: 'PRIVATE KEY', n: 5, lead: 'e', leadLen: 16, name: 'Private key', note: 'the secret that makes a signature real; should be a random 384-bit number' },
    { id: 'stranger', kind: 'screen', at: [420, 350], size: [96, 62], label: 'STRANGER', n: 6, lead: 'e', name: 'Anyone', note: 'with the key, can sign a certificate for any website' },
    { id: 'makers', kind: 'tower', at: [250, 290], size: [36, 72], n: 7, lead: 'e', name: 'Browser makers', note: 'Chrome, Firefox, Apple and Microsoft push block lists to devices' }
  ],
  lines: [
    { id: 'shaft', from: 'phone.n', to: 'trust.s', heavy: true },
    { id: 'web', from: 'phone.e', to: 'bank.w', label: 'HTTPS' },
    { id: 'chain', from: 'root.e', to: 'inter.w', arrow: true, label: 'VOUCHES' },
    { id: 'sign', from: 'inter.e', to: 'cert.w', arrow: true, label: 'SIGNS', labelPos: 0.3 },
    { id: 'tie', from: 'trust.e', to: 'root.w', kind: 'wire' },
    { id: 'mitm', from: 'phone.s', to: 'stranger.w' },
    { id: 'push', from: 'phone.e+30', to: 'makers.w', kind: 'wire' }
  ],
  steps: [
    {
      say: 'Your phone (1) opens yourbank.in (2). First it asks: is this really the bank?',
      draw: ['phone', 'web', 'bank'],
      run: [{ on: 'web', item: 'chip', text: 'yourbank.in', dur: 1.2 }],
      then: { set: { phone: { text: 'YOURBANK.IN' } } }
    },
    {
      say: 'The site answers with a certificate: a signed note that says this really is yourbank.in.',
      draw: ['cert'],
      run: [{ on: 'web', back: true, item: 'letter', dur: 1.3, arrive: { glow: ['phone'] } }]
    },
    {
      say: 'The phone checks the signer (4). The root (3) vouches for it, and the root is on the phone’s trust list.',
      draw: ['zone', 'root', 'chain', 'inter', 'sign', 'trust', 'shaft', 'tie'],
      glow: ['sign', 'chain', 'tie'],
      then: { ok: ['phone'] }
    },
    {
      say: 'That signature only means something while the signer’s private key (5) stays secret.',
      view: ['zone'],
      draw: ['key'],
      note: { at: 'key.w', text: 'RANDOM 384-BIT NUMBER\n≈ 10¹¹⁵ GUESSES', dx: -14, dy: -2 }
    },
    {
      say: 'But a faulty script in April 2025 made 8 of eMudhra’s keys tiny numbers. One of them was 4.',
      set: { key: { text: 'KEY = 4' } },
      fail: ['key'],
      note: { at: 'key.w', text: 'EVERY KEY BELOW 256', dx: -14, dy: 3 },
      hold: 2.2
    },
    {
      say: 'Anyone could work the keys out from the public certificates, in under a second on a laptop.',
      view: 'all',
      draw: ['stranger'],
      run: [{ from: 'key.s', to: 'stranger.n', item: 'key', dur: 1.4, arrive: { glow: ['stranger'] } }],
      note: { at: [476, 318], text: 'IN < 1 SECOND', anchor: 'start' }
    },
    {
      say: 'With one, a stranger (6) can sign a fake yourbank.in certificate, and the phone would believe it.',
      view: ['phone', 'stranger', 'mitm'],
      draw: ['mitm'],
      run: [{ on: 'mitm', back: true, item: 'letter', color: 'fail', dur: 1.6, arrive: { fail: ['phone'] } }],
      then: { note: { at: 'phone.e', text: 'LOOKS GENUINE', dx: 8, dy: 30 } }
    },
    {
      say: 'So within days, the browser makers (7) blocked all 8 keys and pushed block lists to devices.',
      view: 'all',
      draw: ['push', 'makers'],
      light: ['makers'],
      run: [
        { on: 'push', back: true, item: 'letter', dur: 1.0, count: 2, gap: 0.4 },
        { on: 'mitm', back: true, item: 'letter', color: 'fail', span: [0, 0.55], dur: 1.2, arrive: { fail: ['stranger'], ok: ['phone'] } }
      ]
    },
    {
      say: 'Mozilla also stopped trusting the root (3), and eMudhra quit selling website certificates.',
      set: { root: { text: 'ROOT G3\nDISTRUSTED' }, trust: { lines: 3 } },
      fail: ['root'],
      note: { at: 'bank.s', text: '~30,000 SITE CERTIFICATES\nTO BE REPLACED', dy: 16 }
    },
    {
      say: 'No misuse has been confirmed. Keep your phone and browser updated so the block lists reach you.',
      note: [
        { at: [520, 292], text: '17 OCT  KEYS REPORTED\n17 OCT  BLOCKED IN FIREFOX\n18 OCT  KEYS REVOKED\n20 OCT  ROOT DISTRUSTED\n22 OCT  EMUDHRA EXITS TLS', anchor: 'start' }
      ],
      ok: ['phone'],
      hold: 3
    }
  ]
});
