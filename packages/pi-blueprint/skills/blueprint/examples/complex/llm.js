BLUEPRINT.scene('llm', {
  title: 'How a language model writes',
  fig: 4,
  sheet: 'SHEET 1 OF 1',
  size: [800, 400],
  parts: [
    { id: 'prompt', kind: 'screen', at: [70, 220], size: [110, 84], label: 'PROMPT', n: 1, lead: [-40, -62], name: 'Prompt', note: 'the text so far: "The cat sat on the"' },
    { id: 'press', kind: 'press', at: [190, 220], size: [50, 80], label: 'TOKENIZER', n: 2, lead: 'n', name: 'Tokenizer', note: 'cuts text into common pieces from a list of 50,257' },
    { id: 'embed', kind: 'cabinet', at: [290, 220], size: [60, 110], rows: 5, label: 'EMBEDDINGS', n: 3, lead: 'ne', name: 'Embeddings', note: 'one row of 768 numbers per token, learned in training' },
    { id: 'attn', kind: 'zone', at: [460, 220], size: [180, 150], label: 'ATTENTION ×12' },
    { id: 'g1', kind: 'gear', at: [410, 220], size: [48, 48], teeth: 10 },
    { id: 'g2', kind: 'gear', at: [460, 220], size: [48, 48], teeth: 10, angle: 18, rate: -0.7, n: 4, lead: 's', name: 'Attention layers', note: '12 layers; each mixes in what the other tokens say' },
    { id: 'g3', kind: 'gear', at: [510, 220], size: [48, 48], teeth: 10 },
    { id: 'scores', kind: 'cabinet', at: [600, 220], size: [56, 180], rows: 9, label: 'SCORES', n: 5, lead: 'ne', name: 'Scores', note: 'one score for every token in the vocabulary: 50,257' },
    { id: 'pick', kind: 'switch', at: [660, 220], size: [40, 48], outs: [-45, 0, 45], to: 1, label: 'SAMPLER', n: 6, lead: 'n', name: 'Sampler', note: 'draws one token, likely ones most often (temperature 0.8)' },
    { id: 'c0', kind: 'label', at: [752, 170], size: [64, 14], label: 'mat 41%' },
    { id: 'c1', kind: 'label', at: [752, 220], size: [64, 14], label: 'floor 12%' },
    { id: 'c2', kind: 'label', at: [752, 270], size: [64, 14], label: 'sofa 6%' }
  ],
  lines: [
    { id: 't1', from: 'prompt.e', to: 'press.w', arrow: true },
    { id: 't2', from: 'press.e', to: 'embed.w', arrow: true },
    { id: 't3', from: 'embed.e', to: 'g1.w', arrow: true },
    { id: 't4', from: 'g3.e', to: 'scores.w', arrow: true },
    { id: 't5', from: 'scores.e', to: 'pick.w' },
    { id: 's0', from: 'pick.e-20', to: 'c0.w', via: [[700, 200], [700, 170]] },
    { id: 's1', from: 'pick.e', to: 'c1.w' },
    { id: 's2', from: 'pick.e+20', to: 'c2.w', via: [[700, 240], [700, 270]] },
    { id: 'append', from: 'c0.n', to: 'prompt.n', via: [[752, 80], [70, 80]], arrow: true, label: 'APPEND, THEN GO AGAIN', labelPos: 0.5 },
    { id: 'dimvec', from: [262, 320], to: [318, 320], kind: 'dim', label: '768' }
  ],
  steps: [
    {
      say: 'You type “The cat sat on the” (1), but a model can only do sums on numbers.',
      view: [0, 60, 520, 260],
      draw: ['prompt'],
      then: { set: { prompt: { text: 'The cat sat\non the _' } } }
    },
    {
      say: 'So a tokenizer (2) cuts the text into five common pieces, each with an id.',
      draw: ['t1', 'press'],
      run: [
        { on: 't1', item: 'chip', text: 'The cat sat…', dur: 0.9, arrive: { set: { press: { down: 1 } } } }
      ],
      then: { set: { press: { down: 0 } }, note: { at: [150, 350], text: 'The · cat · sat · on · the', anchor: 'middle', keep: true } }
    },
    {
      say: 'Each id picks a row of 768 numbers (3), a rough sketch of what that piece means.',
      draw: ['t2', 'embed', 'dimvec'],
      run: [
        { on: 't2', item: 'chip', text: '464', dur: 0.45 },
        { on: 't2', item: 'chip', text: '3797', dur: 0.45 },
        { on: 't2', item: 'chip', text: '3332', dur: 0.45 },
        { on: 't2', item: 'chip', text: '319', dur: 0.45 },
        { on: 't2', item: 'chip', text: '262', dur: 0.45, arrive: { glow: ['embed'] } }
      ],
      note: { at: 'embed.n', text: '50,257 ROWS', dy: -10 }
    },
    {
      say: 'But "the" alone says nothing about cats, so attention layers (4) mix in the other words.',
      view: [200, 60, 600, 300],
      draw: ['t3', 'attn', 'g1', 'g2', 'g3'],
      run: [
        { on: 't3', item: 'packet', count: 5, gap: 0.2, dur: 0.6 },
        { from: 'g1.w', to: 'g3.e', item: 'packet', count: 5, gap: 0.2, dur: 1.6, ease: 'linear' }
      ],
      spin: ['g1', 'g2', 'g3'],
      note: { at: 'attn.s', text: 'cat + sat + on → the …?', dy: 16 }
    },
    {
      say: 'The last position is scored against every piece the model knows (5): 50,257 scores.',
      draw: ['t4', 'scores'],
      run: [
        { on: 't4', item: 'packet', dur: 0.7, arrive: { glow: ['scores'] } }
      ],
      spin: ['g1', 'g2', 'g3'],
      note: { at: 'scores.s', text: 'ONE PER TOKEN', dy: 34 }
    },
    {
      say: 'A sampler (6) draws one, likely ones most often: this time it is “mat”, at 41%.',
      view: [360, 80, 440, 220],
      draw: ['t5', 'pick', 's0', 's1', 's2', 'c0', 'c1', 'c2'],
      run: [
        { on: 't5', item: 'bit', dur: 0.5, arrive: { set: { pick: { to: 0 } } } },
        { on: 's0', item: 'chip', text: 'mat', dur: 0.6, arrive: { glow: ['c0'] } }
      ],
      note: { at: 'pick.s', text: 'TEMP 0.8', dy: 30 }
    },
    {
      say: '“mat” is added to the end, so the text now reads “The cat sat on the mat”.',
      view: 'all',
      draw: ['append'],
      run: [
        { on: 'append', item: 'chip', text: 'mat', dur: 2.0, arrive: { set: { prompt: { text: 'The cat sat\non the mat' } }, glow: ['prompt'] } }
      ]
    },
    {
      say: 'Then the whole machine runs again for the next piece, one token per pass.',
      set: { c0: { text: '. 52%' }, c1: { text: ', 14%' }, c2: { text: 'and 9%' }, pick: { to: 1 } },
      run: [
        { on: 't1', item: 'packet', dur: 0.4, ease: 'linear' },
        { on: 't2', item: 'packet', dur: 0.4, ease: 'linear' },
        { on: 't3', item: 'packet', dur: 0.4, ease: 'linear' },
        { from: 'g1.w', to: 'g3.e', item: 'packet', dur: 0.6, ease: 'linear' },
        { on: 't4', item: 'packet', dur: 0.4, ease: 'linear', arrive: { set: { pick: { to: 0 } } } },
        { on: 't5', item: 'bit', dur: 0.3 },
        { on: 's0', item: 'chip', text: '.', dur: 0.4 },
        { on: 'append', item: 'chip', text: '.', dur: 1.4, arrive: { set: { prompt: { text: 'The cat sat\non the mat.' } } } }
      ],
      spin: ['g1', 'g2', 'g3']
    },
    {
      say: 'A model writes by scoring every next piece, picking one, and feeding it back in.',
      glow: ['append'],
      then: { ok: ['prompt'] },
      note: [
        { at: 'attn.s', text: '12 LAYERS · 124M WEIGHTS', dy: 16 },
        { at: 'prompt.s', text: '1 PASS PER TOKEN', dy: 16 }
      ],
      hold: 2.6
    }
  ]
});
