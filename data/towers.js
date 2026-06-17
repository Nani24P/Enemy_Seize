export const TOWERS = {
  arrow: {
    name: 'Arrow', icon: '➶', cost: 50, range: 130, damage: 18, fireRate: 0.55,
    color: '#d9f99d', dark: '#365314', role: 'Fast single-target', note: 'Cheap cleanup tower', projectile: 'bolt'
  },
  cannon: {
    name: 'Cannon', icon: '●', cost: 110, range: 115, damage: 40, fireRate: 1.15, splash: 54,
    color: '#fb923c', dark: '#7c2d12', role: 'Splash damage', note: 'Best on enemy groups', projectile: 'shell'
  },
  frost: {
    name: 'Frost', icon: '❄', cost: 95, range: 120, damage: 7, fireRate: 0.8, slow: 0.55, slowTime: 1.5,
    color: '#67e8f9', dark: '#155e75', role: 'Slow control', note: 'Place before damage', projectile: 'beam'
  },
  flame: {
    name: 'Flame', icon: '♨', cost: 135, range: 92, damage: 12, fireRate: 0.35, burn: 18, burnTime: 2.4,
    color: '#fb7185', dark: '#881337', role: 'Burn damage', note: 'Strong on long bends', projectile: 'flame'
  },
  storm: {
    name: 'Storm', icon: 'ϟ', cost: 190, range: 160, damage: 28, fireRate: 0.9, chain: 3,
    color: '#c084fc', dark: '#581c87', role: 'Chain hits', note: 'Late-game multi-hit', projectile: 'lightning'
  }
};
