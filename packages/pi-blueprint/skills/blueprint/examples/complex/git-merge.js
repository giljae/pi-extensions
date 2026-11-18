// git: commits go into a history book, a branch splits off, both sides add
// commits, and a merge commit with two parents joins them. One line changed
// on both sides is a conflict, and a person has to pick.
// Arrows point from a commit to its parent, the way git stores them.
BLUEPRINT.scene('git-merge', {
  title: 'How git merges two branches',
  fig: 4,
  size: [800, 400],
  parts: [
    { id: 'book', kind: 'book', at: [80, 220], size: [80, 56], label: 'HISTORY', lines: 0, max: 8, n: 1, lead: 'nw', name: 'History book', note: 'every commit on main, in order; 4 entries by the end' },
    { id: 'c1', kind: 'box', at: [200, 220], size: [60, 32], label: 'A1F', n: 2, lead: 'n', name: 'Commit', note: 'a saved snapshot of every file, named by a 40-character hash' },
    { id: 'c2', kind: 'box', at: [320, 220], size: [60, 32], label: 'B7E' },
    { id: 'zone', kind: 'zone', at: [490, 110], size: [240, 96], label: "RAVI'S BRANCH", n: 3, lead: 'ne', name: 'Branch', note: 'a second line of commits that splits off at B7E' },
    { id: 'f1', kind: 'box', at: [430, 120], size: [60, 32], label: '3E2' },
    { id: 'f2', kind: 'box', at: [550, 120], size: [60, 32], label: 'D04' },
    { id: 'c3', kind: 'box', at: [550, 220], size: [60, 32], label: '9CD' },
    { id: 'merge', kind: 'box', at: [690, 220], size: [64, 36], label: 'M5C', n: 4, lead: 'e', name: 'Merge commit', note: 'one commit with 2 parents, so both histories stay' },
    { id: 'ravi', kind: 'screen', at: [690, 335], size: [120, 70], label: 'RAVI', n: 5, lead: 'w', name: 'Person', note: 'picks the right line when both sides changed it' }
  ],
  lines: [
    { id: 'p1', from: 'c1.w', to: 'book.e', arrow: true },
    { id: 'p2', from: 'c2.w', to: 'c1.e', arrow: true, label: 'PARENT' },
    { id: 'pb', from: 'f1.w', to: 'c2.n', arrow: true },
    { id: 'pf', from: 'f2.w', to: 'f1.e', arrow: true },
    { id: 'p3', from: 'c3.w', to: 'c2.e', arrow: true, label: 'MAIN' },
    { id: 'm1', from: 'merge.w', to: 'c3.e', arrow: true },
    { id: 'm2', from: 'merge.n', to: 'f2.e', arrow: true },
    { id: 'ask', from: 'merge.s', to: 'ravi.n', kind: 'wire' },
    { id: 'span', from: [320, 278], to: [672, 278], kind: 'dim', label: 'COMPARED AGAINST B7E, WHERE THEY SPLIT' }
  ],
  steps: [
    {
      say: 'Asha saves price.txt as commit A1F (2), the first entry in the history book (1).',
      view: ['book', 'c1', 'c2'],
      draw: ['book', 'p1', 'c1'],
      run: [{ on: 'p1', item: 'chip', text: 'A1F', dur: 0.8, arrive: { set: { book: { lines: 1 } } } }],
      note: { at: 'c1.s', text: 'LINE 3 · ₹450' }
    },
    {
      say: 'Her next commit, B7E, points back to A1F, so the history is a chain.',
      draw: ['p2', 'c2'],
      run: [
        { on: 'p2', item: 'chip', text: 'B7E', dur: 0.8 },
        { on: 'p1', item: 'chip', text: 'B7E', dur: 0.6, arrive: { set: { book: { lines: 2 } } } }
      ],
      note: { at: 'c2.s', text: 'LINE 1 · TYPO FIXED' }
    },
    {
      say: 'Ravi wants to test a new price without touching main, so he starts a branch (3).',
      view: ['c2', 'zone'],
      draw: ['zone', 'pb', 'f1'],
      run: [{ on: 'pb', back: true, item: 'chip', text: '3E2', dur: 1.0, arrive: { glow: ['f1'] } }],
      note: { at: 'f1.s', text: 'TITLE ADDED' }
    },
    {
      say: 'Both sides keep going: Ravi sets line 3 to ₹549, Asha sets it to ₹499.',
      view: ['c2', 'zone', 'c3'],
      draw: ['pf', 'f2', 'p3', 'c3'],
      run: [
        { on: 'pf', back: true, item: 'chip', text: 'D04', dur: 0.8 },
        { on: 'p3', back: true, item: 'chip', text: '9CD', dur: 0.9 },
        { on: 'p3', item: 'chip', text: '9CD', dur: 0.6 },
        { on: 'p2', item: 'chip', text: '9CD', dur: 0.6 },
        { on: 'p1', item: 'chip', text: '9CD', dur: 0.5, arrive: { set: { book: { lines: 3 } } } }
      ],
      note: [{ at: 'f2.s', text: 'LINE 3 · ₹549', keep: true }, { at: 'c3.s', text: 'LINE 3 · ₹499', keep: true }]
    },
    {
      say: "To bring Ravi's work into main, git starts a merge commit (4) with two parents.",
      view: ['c2', 'zone', 'merge'],
      draw: ['m1', 'm2', 'merge'],
      run: [
        { on: 'm2', back: true, item: 'chip', text: 'D04', dur: 1.0 },
        { on: 'm1', back: true, item: 'chip', text: '9CD', dur: 1.0, with: true }
      ],
      then: { glow: ['merge'] }
    },
    {
      say: 'It compares both sides with B7E. The new title joins, but line 3 changed on both.',
      draw: ['span'],
      glow: ['c2'],
      then: { fail: ['merge'], glow: ['f2', 'c3'], note: { at: 'merge.n', text: 'CONFLICT · LINE 3', dx: -10, dy: -24, anchor: 'end' } },
      hold: 1.8
    },
    {
      say: 'Git cannot guess which price is right, so it stops and asks a person (5).',
      view: ['c2', 'merge', 'ravi'],
      draw: ['ask', 'ravi'],
      run: [{ on: 'ask', item: 'chip', text: 'LINE 3?', dur: 0.8, arrive: { ring: ['ravi'] } }],
      set: { ravi: { text: '₹499 OR ₹549' } },
      fail: ['merge']
    },
    {
      say: 'Ravi keeps ₹549, and the merge commit is written into the history book.',
      view: 'all',
      set: { ravi: { text: 'KEEP ₹549' } },
      run: [
        { on: 'ask', back: true, item: 'chip', text: '₹549', dur: 0.7, arrive: { ok: ['merge'] } },
        { on: 'm1', item: 'chip', text: 'M5C', dur: 0.6 },
        { on: 'p3', item: 'chip', text: 'M5C', dur: 0.8 },
        { on: 'p2', item: 'chip', text: 'M5C', dur: 0.6 },
        { on: 'p1', item: 'chip', text: 'M5C', dur: 0.5, arrive: { set: { book: { lines: 4 } }, glow: ['book'] } }
      ]
    },
    {
      say: 'Two lines of work, one history: the merge commit remembers both parents.',
      glow: ['m1', 'm2'],
      note: [
        { at: 'merge.n', text: '2 PARENTS · 9CD + D04', dx: -10, dy: -24, anchor: 'end' },
        { at: [80, 330], text: '4 COMMITS ON MAIN\n1 CONFLICT · FIXED BY HAND', anchor: 'start', dx: 0 }
      ],
      hold: 2.6
    }
  ]
});
