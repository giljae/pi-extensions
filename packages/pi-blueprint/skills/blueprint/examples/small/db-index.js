BLUEPRINT.scene('db-index', {
  title: 'How a database index finds a row',
  fig: 4,
  paper: 'linen',
  size: [640, 320],
  parts: [
    { id: 'query', kind: 'screen', at: [80, 222], size: [100, 70], label: 'FIND RUIZ', n: 1, lead: 'sw', name: 'Query', note: 'asks for one customer by name' },
    { id: 'table', kind: 'zone', at: [445, 212], size: [290, 150], label: 'CUSTOMERS · 1M ROWS', n: 2, lead: [0, -100], name: 'Table', note: 'a million customers, stored in the order they signed up' },
    { id: 'c1', kind: 'cabinet', at: [350, 222], size: [52, 86], rows: 5 },
    { id: 'c2', kind: 'cabinet', at: [440, 222], size: [52, 86], rows: 5 },
    { id: 'c3', kind: 'cabinet', at: [530, 222], size: [52, 86], rows: 5 },
    { id: 'book', kind: 'book', at: [220, 84], size: [80, 56], lines: 0, max: 8, label: 'INDEX', labelAt: 'n', n: 3, lead: 'sw', name: 'Index', note: 'names in A–Z order, each with its drawer; ~20 page turns for 1M rows' }
  ],
  lines: [
    { id: 'q', from: 'query.e', to: 'c1.w' },
    { id: 's12', from: 'c1.e', to: 'c2.w' },
    { id: 's23', from: 'c2.e', to: 'c3.w' },
    { id: 'iq', from: 'query.n', to: 'book.w', bend: 'vh' },
    { id: 'ptr', from: 'book.e', to: 'c3.n', bend: 'hv', kind: 'wire', arrow: true, label: 'POINTS TO', labelPos: 0.35 }
  ],
  steps: [
    {
      say: 'A query (1) needs the customer named Ruiz from a table (2) of a million.',
      draw: ['query', 'q', 'table', 'c1', 's12', 'c2', 's23', 'c3'],
      run: [{ on: 'q', item: 'chip', text: 'RUIZ?', dur: 1.0, arrive: { glow: ['table'] } }]
    },
    {
      say: 'With no map it opens every drawer in turn, and every search pays for the whole walk.',
      run: [
        { on: 'q', item: 'chip', text: 'RUIZ?', dur: 0.8, arrive: { glow: ['c1'], fail: ['c1'] } },
        { on: 's12', item: 'chip', text: 'RUIZ?', dur: 1.2, arrive: { glow: ['c2'], fail: ['c2'] } },
        { on: 's23', item: 'chip', text: 'RUIZ?', dur: 1.2, arrive: { glow: ['c3'], ok: ['c3'] } }
      ],
      then: { note: { at: [445, 304], text: '1,000,000 ROWS READ · ~2 S', anchor: 'middle' } },
      hold: 1.8
    },
    {
      say: 'So keep an index (3): a book of names in A–Z order, each with its drawer.',
      draw: ['iq', 'book', 'ptr'],
      set: { book: { lines: 7 } },
      then: { note: { at: 'book.s', text: 'RUIZ → CABINET 3', dy: 20 } }
    },
    {
      say: 'The query looks up Ruiz in the book, which points straight to cabinet 3.',
      run: [
        { on: 'iq', item: 'chip', text: 'RUIZ?', dur: 1.0, arrive: { glow: ['book'] } },
        { on: 'ptr', item: 'chip', text: 'C3', dur: 1.2, arrive: { glow: ['c3'], ok: ['c3'] } }
      ],
      then: { note: { at: [445, 304], text: '~20 PAGE TURNS · ~1 MS', anchor: 'middle' } }
    },
    {
      say: 'The price: each new customer is written in the book too, so saving is a little slower.',
      run: [
        { on: 'q', item: 'letter', dur: 1.0, arrive: { glow: ['c1'] } },
        { on: 'iq', item: 'letter', dur: 1.0, arrive: { set: { book: { lines: 8 } }, glow: ['book'] } }
      ],
      note: [
        { at: [445, 304], text: 'FIND · ~2 S → ~1 MS', anchor: 'middle' },
        { at: 'book.s', text: 'SAVE · +1 LINE', dy: 20 }
      ],
      hold: 2.6
    }
  ]
});
