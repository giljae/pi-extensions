// "Sign in with Google" (OAuth 2.0, authorization code flow): the app never
// sees your password. You sign in at the provider, the app gets a short code,
// swaps it (with its own secret) for a token, and uses the token to fetch
// your profile. Linen paper, for variety.
BLUEPRINT.scene('oauth', {
  title: 'How "Sign in with Google" works',
  fig: 2,
  paper: 'linen',
  size: [800, 400],
  parts: [
    { id: 'browser', kind: 'screen', at: [110, 320], size: [130, 84], label: 'PIZZAPAL.IN', n: 1, lead: 'nw', name: 'Your browser', note: 'the only place your password is ever typed' },
    { id: 'app', kind: 'box', at: [330, 135], size: [120, 60], label: 'PIZZAPAL\nSERVER', n: 2, lead: 'sw', name: 'The app', note: 'wants to know who you are, never learns your password' },
    { id: 'google', kind: 'zone', at: [650, 200], size: [220, 330], label: 'GOOGLE', n: 3, lead: 'ne', name: 'Provider', note: 'already knows you; vouches for you to the app' },
    { id: 'login', kind: 'gate', at: [650, 320], size: [64, 40], label: 'SIGN-IN PAGE', n: 4, lead: 'e', name: 'Sign-in page', note: 'checks your password and hands back a code valid for 10 minutes' },
    { id: 'secret', kind: 'key', at: [330, 62], size: [40, 16], label: 'SECRET', labelAt: 'w', n: 5, lead: 'ne', name: 'App secret', note: 'a password only the app server and Google know, e.g. 40 characters' },
    { id: 'desk', kind: 'box', at: [650, 80], size: [116, 44], label: 'TOKEN DESK', n: 6, lead: 'e', name: 'Token desk', note: 'swaps code + secret for a token that lasts 1 hour' },
    { id: 'profile', kind: 'cabinet', at: [650, 180], size: [76, 60], rows: 3, label: 'PROFILE', labelAt: 'e', n: 7, lead: 's', name: 'Profile', note: 'your name and email; a token opens only what you allowed' }
  ],
  lines: [
    { id: 'up', from: 'browser.n', to: 'app.s' },
    { id: 'pw', from: 'browser.e', to: 'login.w', label: 'HTTPS · GOOGLE ONLY', labelPos: 0.42 },
    { id: 'swap', from: 'app.e-12', to: 'desk.w', labelPos: 0.82 },
    { id: 'own', from: 'secret.s', to: 'app.n', kind: 'wire' },
    { id: 'fetch', from: 'app.e+12', to: 'profile.w', labelPos: 0.82 }
  ],
  steps: [
    {
      say: 'You tap "Sign in with Google" on PizzaPal (1), a site you have never used before.',
      view: ['browser', 'app', 'secret'],
      draw: ['browser'],
      then: { set: { browser: { text: 'SIGN IN WITH\nGOOGLE' } }, glow: ['browser'] }
    },
    {
      say: 'Its server (2) could just ask for your Google password, but then it could read your mail.',
      draw: ['up', 'app'],
      run: [{ on: 'up', item: 'chip', text: 'PASSWORD', color: 'fail', dur: 1.1, arrive: { fail: ['app'] } }],
      note: { at: 'app.e', text: 'FULL ACCESS · FOREVER', dx: 10 }
    },
    {
      say: 'So the server sends you to Google (3) instead, to its own sign-in page (4).',
      view: 'all',
      draw: ['google', 'pw', 'login'],
      run: [
        { on: 'up', back: true, item: 'chip', text: 'GO TO GOOGLE', dur: 1.0 },
        { on: 'pw', item: 'ball', dur: 1.2, arrive: { glow: ['login'] } }
      ]
    },
    {
      say: 'You type your password only there; the gate opens and Google hands back a short code.',
      view: ['browser', 'login'],
      run: [
        { on: 'pw', item: 'chip', text: 'PASSWORD', dur: 1.2, arrive: { set: { login: { open: 1 } }, ok: ['login'] } },
        { on: 'pw', back: true, item: 'chip', text: 'CODE 4/0AX', dur: 1.2 }
      ],
      note: { at: [532, 300], text: 'CODE · VALID 10 MIN', anchor: 'end', dx: 0 }
    },
    {
      say: 'The browser passes the code up, but a code alone opens nothing without the secret (5).',
      view: ['browser', 'app', 'secret'],
      draw: ['secret', 'own'],
      run: [{ on: 'up', item: 'chip', text: 'CODE 4/0AX', dur: 1.1, arrive: { glow: ['app'] } }],
      then: { glow: ['secret'] }
    },
    {
      say: "So the server swaps code + secret at Google's token desk (6) for a token.",
      view: ['app', 'secret', 'desk'],
      draw: ['swap', 'desk'],
      run: [
        { on: 'swap', item: 'chip', text: 'CODE+SECRET', dur: 1.3, arrive: { glow: ['desk'] } },
        { on: 'swap', back: true, item: 'key', dur: 1.2 }
      ],
      note: { at: 'desk.s', text: 'TOKEN · LASTS 1 HOUR' }
    },
    {
      say: 'With the token, the server fetches just your name and email from your profile (7).',
      view: ['app', 'desk', 'profile'],
      draw: ['fetch', 'profile'],
      run: [
        { on: 'fetch', item: 'key', dur: 1.2, arrive: { glow: ['profile'] } },
        { on: 'fetch', back: true, item: 'chip', text: 'ASHA · EMAIL', dur: 1.2, arrive: { ok: ['app'] } }
      ]
    },
    {
      say: 'You are signed in, and PizzaPal (2) never once saw your Google password.',
      view: 'all',
      run: [{ on: 'up', back: true, item: 'chip', text: 'HI ASHA', dur: 1.0, arrive: { set: { browser: { text: 'HI, ASHA' } }, ok: ['browser'] } }],
      glow: ['pw'],
      note: [
        { at: [390, 344], text: 'YOUR PASSWORD TRAVELS ONLY HERE', anchor: 'middle', dx: 0 },
        { at: [400, 250], text: 'APP GETS:\nCODE → TOKEN → PROFILE', anchor: 'start', dx: 0 }
      ],
      hold: 2.6
    }
  ]
});
