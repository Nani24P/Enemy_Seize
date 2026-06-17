export const MAPS = [
  {
    id: 'grass',
    name: 'Forest Trail',
    icon: '🌲',
    theme: ['#16331f', '#2a6a38', '#8ddf67'],
    description: 'Lush forest bends with roomy build clearings.',
    veggieIcons: ['🍅', '🥕', '🍉'],
    wavesToWin: 10,
    path: [[18,304],[156,304],[156,90],[430,90],[430,448],[714,448],[714,170],[944,170]],
    pads: [[92,214],[236,224],[328,324],[350,30],[516,334],[604,248],[796,246],[808,82],[790,470],[252,470]]
  },
  {
    id: 'desert',
    name: 'Dune Split',
    icon: '🏜️',
    theme: ['#5a3715', '#a76a16', '#f6c453'],
    description: 'Twin desert roads merge near the oasis ruins.',
    veggieIcons: ['🧅', '🥕', '🎃'],
    wavesToWin: 12,
    path: [[18,132],[228,132],[228,250],[420,250],[420,404],[710,404],[710,236],[944,236]],
    secondPath: [[18,416],[228,416],[228,250],[420,250],[420,404],[710,404],[710,236],[944,236]],
    pads: [[112,258],[294,180],[302,346],[492,164],[528,320],[622,472],[792,334],[824,122],[676,108],[192,40]]
  },
  {
    id: 'ice',
    name: 'Frost Loop',
    icon: '🧊',
    theme: ['#123d5a', '#0ea4c5', '#abf2ff'],
    description: 'A wide icy loop with lots of slow-and-burn value.',
    veggieIcons: ['🫛', '🧅', '🍈'],
    wavesToWin: 14,
    path: [[18,270],[174,270],[174,76],[716,76],[716,458],[244,458],[244,270],[944,270]],
    pads: [[90,168],[270,184],[438,188],[600,182],[786,188],[774,360],[590,360],[420,356],[318,520],[122,388],[860,424]]
  },
  {
    id: 'lava',
    name: 'Molten Cross',
    icon: '🌋',
    theme: ['#501515', '#b42828', '#ff8e6b'],
    description: 'Hot crossings and risky corners across molten ground.',
    veggieIcons: ['🌶️', '🫑', '🎃'],
    wavesToWin: 16,
    path: [[18,282],[220,282],[220,86],[492,86],[492,452],[762,452],[762,258],[944,258]],
    pads: [[104,196],[292,206],[392,24],[400,268],[578,340],[676,512],[842,352],[674,162],[854,92]]
  },
  {
    id: 'temple',
    name: 'Temple Maze',
    icon: '🏛️',
    theme: ['#241d54', '#6a39b8', '#d9adff'],
    description: 'The grand final maze with long walls and deep turns.',
    veggieIcons: ['🥔', '🧄', '🎃'],
    wavesToWin: 18,
    path: [[18,72],[886,72],[886,184],[100,184],[100,304],[790,304],[790,436],[208,436],[208,522],[944,522]],
    pads: [[108,24],[280,122],[476,28],[714,124],[820,244],[604,246],[386,248],[180,250],[182,382],[360,382],[556,488],[846,476],[654,526]]
  }
];
