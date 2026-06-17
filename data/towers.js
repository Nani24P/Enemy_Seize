export const TOWERS = {
  arrow: { name: 'Arrow', cost: 50, range: 130, damage: 18, fireRate: 0.55, color: '#f8fafc', note: 'Fast single target' },
  cannon: { name: 'Cannon', cost: 110, range: 115, damage: 40, fireRate: 1.15, splash: 54, color: '#f97316', note: 'Splash damage' },
  frost: { name: 'Frost', cost: 95, range: 120, damage: 7, fireRate: 0.8, slow: 0.55, slowTime: 1.5, color: '#67e8f9', note: 'Slows enemies' },
  flame: { name: 'Flame', cost: 135, range: 92, damage: 12, fireRate: 0.35, burn: 18, burnTime: 2.4, color: '#fb7185', note: 'Damage over time' },
  storm: { name: 'Storm', cost: 190, range: 160, damage: 28, fireRate: 0.9, chain: 3, color: '#c084fc', note: 'Chain hits' }
};
