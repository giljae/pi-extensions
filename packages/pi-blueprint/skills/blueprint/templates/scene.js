// A blueprint scene. Copy, rename the id, and replace the parts, lines and steps.
// Read references/craft.md first. Lint: node scripts/check.mjs this-file.js
BLUEPRINT.scene('my-scene', {
  title: 'How it works',
  fig: 1,
  size: [640, 320],
  parts: [
    // the thing the story starts from
    { id: 'client', kind: 'screen', at: [100, 180], label: 'APP', n: 1, lead: 'nw', name: 'App', note: 'what it is, in plain words' },
    // where the answer lives
    { id: 'store', kind: 'cabinet', at: [540, 180], size: [80, 100], label: 'STORE', n: 2, lead: 'e', name: 'Store', note: 'what it is, in plain words' }
  ],
  lines: [
    { id: 'wire1', from: 'client.e', to: 'store.w' }
  ],
  steps: [
    { say: 'Set the scene with one concrete thing (1).', draw: ['client', 'wire1', 'store'] },
    { say: 'Show the simple version working, and the problem it has.', run: [{ on: 'wire1', item: 'chip', text: '#42' }, { on: 'wire1', back: true }] },
    { say: 'So add the part that fixes it.', draw: [] },
    { say: 'Show the fix working, with a real number.', note: { at: 'store.n', text: '~2 MS' } }
  ]
});
