// The call stack: main() calls a(), which calls b(). Frames pile up on the
// stack and come off in reverse, each one remembering where to go back to.
// The frame names (f0–f2) and return notes (r1, r2) are label parts laid over
// the stack's plates; they start as ' ' because a label that starts empty can
// never be given text later.
BLUEPRINT.scene('call-stack', {
  title: 'How the call stack works',
  fig: 1,
  size: [640, 320],
  parts: [
    { id: 'prog', kind: 'screen', at: [100, 170], size: [120, 80], label: 'PROGRAM', n: 1, lead: 's', name: 'Program', note: 'runs one function at a time; the screen shows which' },
    { id: 'room', kind: 'zone', at: [380, 168], size: [132, 214] },
    { id: 'stack', kind: 'stack', at: [380, 170], size: [110, 200], max: 4, count: 0, label: 'STACK', n: 2, lead: 'ne', name: 'Call stack', note: 'a pile of frames, one per unfinished function; only the top one runs' },
    { id: 'f0', kind: 'label', at: [380, 243], size: [140, 14], label: ' ', n: 3, lead: 'w', leadLen: 16, name: 'Frame', note: "one function's own notes (its variables) and where to go back to" },
    { id: 'f1', kind: 'label', at: [380, 194], size: [96, 14], label: ' ' },
    { id: 'f2', kind: 'label', at: [380, 145], size: [96, 14], label: ' ' },
    { id: 'r1', kind: 'label', at: [262, 194], size: [100, 14], label: ' ', muted: true },
    { id: 'r2', kind: 'label', at: [262, 145], size: [100, 14], label: ' ', muted: true }
  ],
  lines: [
    { id: 'call', from: 'prog.n', via: [[100, 36], [380, 36]], to: 'stack.n', arrow: true, label: 'CALLS', labelPos: 0.45 },
    { id: 'rb', from: [435, 140], via: [[462, 140], [462, 190]], to: [435, 190], kind: 'wire', arrow: true, label: 'RETURNS 7' },
    { id: 'ra', from: [435, 198], via: [[462, 198], [462, 238]], to: [435, 238], kind: 'wire', arrow: true, label: 'RETURNS 9' }
  ],
  steps: [
    {
      say: 'The program (1) starts in main(), which gets a frame (3) on the stack (2) to hold its x = 1.',
      draw: ['prog', 'call', 'room', 'stack', 'f0'],
      set: { prog: { text: 'main()' } },
      run: [
        { on: 'call', item: 'chip', text: 'main()', dur: 1.3, arrive: { set: { stack: { count: 1 }, f0: { text: 'main · x=1' } } } }
      ]
    },
    {
      say: "main() calls a(). main isn't done, so a's frame goes on top, noting: back to main.",
      draw: ['f1', 'r1'],
      run: [
        { on: 'call', item: 'chip', text: 'a()', dur: 1.3, arrive: { set: { stack: { count: 2 }, f1: { text: 'a · y=2' }, r1: { text: 'back to main' }, prog: { text: 'a()' } } } }
      ]
    },
    {
      say: "a() calls b(), and b's frame goes on top. Only the top frame runs; the rest wait.",
      draw: ['f2', 'r2'],
      run: [
        { on: 'call', item: 'chip', text: 'b()', dur: 1.3, arrive: { set: { stack: { count: 3 }, f2: { text: 'b · z=3' }, r2: { text: 'back to a' }, prog: { text: 'b()' } } } }
      ],
      then: { glow: ['f2'], note: { at: [470, 149], text: 'DEPTH 3', anchor: 'start' } }
    },
    {
      say: 'b() ends and returns 7. Its frame comes off the top, and a() carries on with the 7.',
      draw: ['rb'],
      set: { stack: { count: 2 }, f2: { text: ' ' }, r2: { text: ' ' } },
      run: [
        { on: 'rb', item: 'chip', text: '7', dur: 1.2, arrive: { set: { f1: { text: 'a · y=2+7' }, prog: { text: 'a()' } }, glow: ['f1'] } }
      ]
    },
    {
      say: 'a() returns 9 the same way. Frames come off in the reverse order they went on.',
      draw: ['ra'],
      set: { stack: { count: 1 }, f1: { text: ' ' }, r1: { text: ' ' } },
      run: [
        { on: 'ra', item: 'chip', text: '9', dur: 1.2, arrive: { set: { f0: { text: 'main · x=9' }, prog: { text: 'main()' } }, glow: ['f0'] } }
      ]
    },
    {
      say: 'Last on, first off: the stack (2) always knows which function to go back to.',
      glow: ['stack'],
      note: [
        { at: [476, 96], text: 'OUT OF ROOM?\nSTACK OVERFLOW', anchor: 'start' },
        { at: [492, 252], text: 'ON:  main, a, b', anchor: 'start' },
        { at: [492, 266], text: 'OFF: b, a', anchor: 'start' }
      ],
      hold: 2.4
    }
  ]
});
