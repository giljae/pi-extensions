BLUEPRINT.scene('compiler', {
  title: 'How a compiler turns text into a program',
  fig: 6,
  size: [800, 400],
  parts: [
    { id: 'src', kind: 'screen', at: [90, 80], size: [110, 66], label: 'X = 2 + 3', n: 1, lead: 'e', name: 'Source code', note: 'the line you typed: 9 characters of plain text' },
    { id: 'lex', kind: 'hopper', at: [90, 190], size: [64, 50], label: 'LEXER', labelAt: 'e', n: 2, lead: 'w', name: 'Lexer', note: 'chops text into words, skipping spaces' },
    { id: 'toks', kind: 'queue', at: [225, 300], size: [110, 30], slots: 5, count: 0, label: 'TOKENS', n: 3, lead: 'n', name: 'Tokens', note: 'the words in order: x, =, 2, +, 3' },
    { id: 'parser', kind: 'box', at: [355, 300], size: [84, 50], label: 'PARSER', n: 4, lead: 'sw', name: 'Parser', note: 'follows the grammar to decide what belongs with what' },
    { id: 'root', kind: 'box', at: [355, 110], size: [28, 24], label: '=', n: 5, lead: 'ne', name: 'Syntax tree', note: 'who does what: + runs first, = stores its result' },
    { id: 'tx', kind: 'box', at: [300, 165], size: [28, 24], label: 'X' },
    { id: 'plus', kind: 'box', at: [410, 165], size: [28, 24], label: '+' },
    { id: 'two', kind: 'box', at: [380, 222], size: [28, 24], label: '2' },
    { id: 'three', kind: 'box', at: [440, 222], size: [28, 24], label: '3' },
    { id: 'check', kind: 'sieve', at: [480, 300], label: 'CHECKER', n: 6, lead: 'n', name: 'Type checker', note: 'rejects trees that mean nothing, like 2 + "hi"' },
    { id: 'gen', kind: 'press', at: [600, 300], label: 'CODE GEN', n: 7, lead: 'n', name: 'Code generator', note: 'flattens the tree into steps a chip can follow' },
    { id: 'code', kind: 'book', at: [720, 300], lines: 0, max: 6, label: 'MACHINE\nCODE', n: 8, lead: 'nw', name: 'Machine code', note: '3 instructions, 12 bytes' },
    { id: 'gear', kind: 'gear', at: [720, 60], size: [36, 36], teeth: 12 },
    { id: 'cpu', kind: 'box', at: [720, 140], size: [90, 56], label: 'CPU', n: 9, lead: 'w', name: 'Processor', note: 'runs one instruction per tick, ~3 GHZ' }
  ],
  lines: [
    { id: 's0', from: 'src.s', to: 'lex.n' },
    { id: 's1', from: 'lex.s', to: 'toks.w', bend: 'vh' },
    { id: 's2', from: 'toks.e', to: 'parser.w' },
    { id: 'build', from: 'parser.n', to: 'root.s', kind: 'wire' },
    { id: 'e1', from: 'root.s', to: 'tx.n', bend: 'straight' },
    { id: 'e2', from: 'root.s', to: 'plus.n', bend: 'straight' },
    { id: 'e3', from: 'plus.s', to: 'two.n', bend: 'straight' },
    { id: 'e4', from: 'plus.s', to: 'three.n', bend: 'straight' },
    { id: 's3', from: 'parser.e', to: 'check.w' },
    { id: 's4', from: 'check.e', to: 'gen.w' },
    { id: 's5', from: 'gen.e', to: 'code.w' },
    { id: 's6', from: 'code.n', to: 'cpu.s', label: 'RUN' },
    { id: 'shaft', from: 'gear.s', to: 'cpu.n', heavy: true },
    { id: 'front', from: [58, 384], to: [397, 384], kind: 'dim', label: 'FRONT END · UNDERSTANDS' },
    { id: 'back', from: [449, 384], to: [757, 384], kind: 'dim', label: 'BACK END · PRODUCES' }
  ],
  steps: [
    {
      say: 'You type x = 2 + 3 (1), but to the machine it is just nine characters.',
      view: ['src', 'lex', 'toks'],
      draw: ['src'],
      then: { note: { at: 'src.n', text: '9 CHARACTERS · NO MEANING', dy: -8 } }
    },
    {
      say: 'So a lexer (2) chops it into tokens (3), but a flat row says nothing about order.',
      draw: ['s0', 'lex', 's1', 'toks'],
      run: [
        { on: 's0', item: 'chip', text: 'x = 2 + 3', dur: 0.9 },
        { on: 's1', item: 'chip', text: 'x', dur: 0.9, arrive: { set: { toks: { count: 1 } } } },
        { on: 's1', item: 'chip', text: '=', dur: 0.9, at: 1.25, arrive: { set: { toks: { count: 2 } } } },
        { on: 's1', item: 'chip', text: '2', dur: 0.9, at: 1.6, arrive: { set: { toks: { count: 3 } } } },
        { on: 's1', item: 'chip', text: '+', dur: 0.9, at: 1.95, arrive: { set: { toks: { count: 4 } } } },
        { on: 's1', item: 'chip', text: '3', dur: 0.9, at: 2.3, arrive: { set: { toks: { count: 5 } } } }
      ],
      then: { note: { at: 'toks.s', text: 'x · = · 2 · + · 3', dy: 28 } }
    },
    {
      say: 'So a parser (4) reads the tokens and works out which ones belong together.',
      view: ['toks', 'parser', 'root', 'three'],
      draw: ['s2', 'parser'],
      run: [
        { on: 's2', item: 'chip', text: 'x', dur: 0.7, arrive: { set: { toks: { count: 4 } } } },
        { on: 's2', item: 'chip', text: '=', dur: 0.7, at: 0.35, arrive: { set: { toks: { count: 3 } } } },
        { on: 's2', item: 'chip', text: '2', dur: 0.7, at: 0.7, arrive: { set: { toks: { count: 2 } } } },
        { on: 's2', item: 'chip', text: '+', dur: 0.7, at: 1.05, arrive: { set: { toks: { count: 1 } } } },
        { on: 's2', item: 'chip', text: '3', dur: 0.7, at: 1.4, arrive: { set: { toks: { count: 0 } }, glow: ['parser'] } }
      ]
    },
    {
      say: 'It builds a tree (5): first add 2 and 3, then store the sum in x.',
      draw: ['build', 'root', 'e1', 'tx', 'e2', 'plus', 'e3', 'two', 'e4', 'three'],
      run: [
        { on: 'build', item: 'bit', dur: 0.8, arrive: { glow: ['plus', 'two', 'three'] } },
        { on: 'build', item: 'bit', dur: 0.8, arrive: { glow: ['root', 'tx'] } }
      ],
      then: { note: [{ at: 'plus.e', text: '1ST · 2 + 3', dx: 8 }, { at: 'root.e', text: '2ND · STORE IN X', dx: 8 }] }
    },
    {
      say: 'But a tree can still be nonsense, like 2 + "hi", so a checker (6) tests it.',
      view: ['root', 'parser', 'check', 'code'],
      draw: ['s3', 'check'],
      run: [
        { on: 's3', item: 'chip', text: '2+"HI"', color: 'fail', dur: 0.9, arrive: { fail: ['check'] } },
        { on: 's3', back: true, item: 'chip', text: '2+"HI"', color: 'fail', dur: 0.9 }
      ],
      then: { note: { at: 'check.s', text: 'CANNOT ADD TEXT TO A NUMBER', dy: 32 } }
    },
    {
      say: 'Our tree passes: 2 and 3 are both numbers, so the sum is a number too.',
      run: [{ on: 's3', item: 'chip', text: 'TREE', dur: 0.9, arrive: { ok: ['check'], glow: ['two', 'three'] } }],
      then: { note: { at: 'check.s', text: 'NUMBER + NUMBER → NUMBER', dy: 32 } }
    },
    {
      say: 'But a chip cannot read a tree, so a code generator (7) presses it into steps.',
      draw: ['s4', 'gen'],
      run: [{ on: 's4', item: 'chip', text: 'TREE', dur: 0.9, arrive: { set: { gen: { down: 1 } } } }],
      then: { set: { gen: { down: 0 } } }
    },
    {
      say: 'Out come three machine instructions (8): LOAD 2, ADD 3, STORE x.',
      draw: ['s5', 'code'],
      run: [{ on: 's5', item: 'packet', count: 3, gap: 0.35, dur: 0.7, arrive: { set: { code: { lines: 3 } } } }],
      then: { note: { at: [640, 196], text: 'LOAD  2\nADD   3\nSTORE X', anchor: 'middle' } },
      hold: 1.8
    },
    {
      say: 'The processor (9) runs them one by one, and x becomes 5.',
      view: 'all',
      draw: ['s6', 'cpu', 'shaft', 'gear'],
      spin: ['gear'],
      run: [{ on: 's6', item: 'packet', count: 3, gap: 0.45, dur: 0.8, arrive: { glow: ['cpu'] } }],
      then: { set: { cpu: { text: 'X = 5' } }, ok: ['cpu'] }
    },
    {
      say: 'Each stage turns the last one\'s output into something closer to what a chip runs.',
      draw: ['front', 'back'],
      note: { at: [400, 30], text: 'TEXT → TOKENS → TREE → CHECKED TREE → INSTRUCTIONS', anchor: 'middle' },
      hold: 2.8
    }
  ]
});
