export const TOWERS = {
  arrow: {
    name: 'Arrow', icon: '🏹', cost: 50, range: 132, damage: 18, fireRate: 0.55,
    color: '#d9f99d', dark: '#365314', role: 'Fast single-target', note: 'Cheap cleanup tower', projectile: 'bolt',
    strategy: 'Best near exits and along long straight lanes.'
  },
  cannon: {
    name: 'Cannon', icon: '💣', cost: 110, range: 118, damage: 40, fireRate: 1.15, splash: 58,
    color: '#fb923c', dark: '#7c2d12', role: 'Splash damage', note: 'Best on enemy groups', projectile: 'shell',
    strategy: 'Place at choke points and corners for max splash.'
  },
  frost: {
    name: 'Frost', icon: '❄️', cost: 95, range: 122, damage: 7, fireRate: 0.8, slow: 0.55, slowTime: 1.5,
    color: '#67e8f9', dark: '#155e75', role: 'Slow control', note: 'Place before damage', projectile: 'beam',
    strategy: 'Lead enemy packs into your cannon or flame kill zone.'
  },
  flame: {
    name: 'Flame', icon: '🔥', cost: 135, range: 96, damage: 12, fireRate: 0.35, burn: 18, burnTime: 2.4,
    color: '#fb7185', dark: '#881337', role: 'Burn damage', note: 'Strong on long bends', projectile: 'flame',
    strategy: 'Use on long curves where enemies stay in range.'
  },
  storm: {
    name: 'Storm', icon: '⚡', cost: 190, range: 164, damage: 28, fireRate: 0.9, chain: 3,
    color: '#c084fc', dark: '#581c87', role: 'Chain hits', note: 'Late-game multi-hit', projectile: 'lightning',
    strategy: 'Use late game to connect clustered veggie waves.'
  }
};
