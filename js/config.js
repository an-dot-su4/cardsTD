// cardsTD — game configuration: map, towers, enemies, waves.
// Playing-card motif tower defense (single player). No external assets.
window.CTD = window.CTD || {};
(function (CTD) {
  'use strict';

  var CELL = 40, COLS = 11, ROWS = 15;

  CTD.CONFIG = {
    CELL: CELL,
    COLS: COLS,
    ROWS: ROWS,
    W: COLS * CELL,
    H: ROWS * CELL,
    START_GOLD: 130,
    START_LIFE: 20,
    SELL_REFUND: 0.7,
    // enemy hp grows a little each wave so late waves stay tense
    HP_WAVE_SCALE: 0.10
  };

  // Path as a list of [col,row] waypoints. Cells between consecutive
  // waypoints (which always share a row or column) form the road.
  // First/last waypoints sit off-screen (spawn / goal).
  CTD.WAYPOINTS = [
    [1, -1], [1, 2], [9, 2], [9, 6], [1, 6], [1, 10], [9, 10], [9, 15]
  ];

  // Towers = playing-card soldiers. Levels advance the rank J -> Q -> K.
  CTD.TOWER_TYPES = {
    spade: {
      id: 'spade', name: 'スペード剣兵', suit: '♠', color: '#1a1a1a', atk: '単発',
      buildCost: 55, projSpeed: 300, hit: 'single', desc: '単発・装甲に強い',
      bonusVsArmored: 1.4, // soft edge: +40% vs armored enemies (never a penalty to others)
      levels: [
        { rank: 'J', damage: 20, range: 100, fireRate: 1.1 },
        { rank: 'Q', damage: 32, range: 108, fireRate: 1.2, upgradeCost: 50 },
        { rank: 'K', damage: 50, range: 116, fireRate: 1.3, upgradeCost: 90 }
      ]
    },
    diamond: {
      id: 'diamond', name: 'ダイヤ弓兵', suit: '♦', color: '#c62828', atk: '連射',
      buildCost: 45, projSpeed: 460, hit: 'single', desc: '連射・長射程で万能',
      levels: [
        { rank: 'J', damage: 6, range: 112, fireRate: 3.2 },
        { rank: 'Q', damage: 9, range: 122, fireRate: 3.8, upgradeCost: 45 },
        { rank: 'K', damage: 12, range: 132, fireRate: 4.5, upgradeCost: 80 }
      ]
    },
    club: {
      id: 'club', name: 'クラブ砲兵', suit: '♣', color: '#1a1a1a', atk: '範囲',
      buildCost: 60, projSpeed: 220, hit: 'splash', desc: '範囲・群れに強い',
      levels: [
        { rank: 'J', damage: 13, range: 90, fireRate: 1.0, splash: 55 },
        { rank: 'Q', damage: 20, range: 98, fireRate: 1.1, splash: 63, upgradeCost: 55 },
        { rank: 'K', damage: 30, range: 106, fireRate: 1.2, splash: 74, upgradeCost: 95 }
      ]
    }
  };
  CTD.TOWER_ORDER = ['spade', 'diamond', 'club'];

  // Enemies = invading card soldiers.
  CTD.ENEMY_TYPES = {
    number: { id: 'number', name: '数札兵', hp: 34, speed: 74, reward: 6, color: '#c62828', kind: 'pip' },
    shield: { id: 'shield', name: '盾持ち兵', hp: 120, speed: 44, reward: 13, color: '#37474f', kind: 'shield', armored: true },
    face: { id: 'face', name: '絵札の騎士', hp: 280, speed: 48, reward: 48, color: '#6a1b9a', kind: 'face', rank: 'K', armored: true },
    ace: { id: 'ace', name: 'エースの王', hp: 620, speed: 40, reward: 120, color: '#b8860b', kind: 'face', rank: 'A', armored: true }
  };

  // 10 waves of escalating pressure; face cards (mini-bosses) arrive late.
  CTD.WAVES = [
    [{ type: 'number', count: 5, interval: 1.1 }],
    [{ type: 'number', count: 10, interval: 0.7 }],
    [{ type: 'number', count: 6, interval: 0.6 }, { type: 'shield', count: 2, interval: 1.2 }],
    [{ type: 'shield', count: 5, interval: 1.0 }],
    [{ type: 'number', count: 12, interval: 0.5 }],
    [{ type: 'shield', count: 5, interval: 0.9 }, { type: 'number', count: 8, interval: 0.5 }],
    [{ type: 'number', count: 14, interval: 0.45 }],
    [{ type: 'shield', count: 8, interval: 0.8 }],
    [{ type: 'face', count: 1, interval: 1 }, { type: 'number', count: 12, interval: 0.5 }],
    [{ type: 'shield', count: 6, interval: 0.7 }, { type: 'face', count: 2, interval: 3.0 }, { type: 'ace', count: 1, interval: 1 }]
  ];

  // Stage 2: a longer, more winding road + tougher waves (existing enemies).
  var STAGE2_WAYPOINTS = [
    [5, -1], [5, 1], [1, 1], [1, 4], [9, 4], [9, 7], [1, 7],
    [1, 10], [9, 10], [9, 13], [5, 13], [5, 15]
  ];
  var STAGE2_WAVES = [
    [{ type: 'number', count: 8, interval: 0.7 }],
    [{ type: 'number', count: 12, interval: 0.55 }],
    [{ type: 'shield', count: 4, interval: 1.0 }, { type: 'number', count: 6, interval: 0.5 }],
    [{ type: 'number', count: 16, interval: 0.45 }],
    [{ type: 'shield', count: 8, interval: 0.8 }],
    [{ type: 'face', count: 1, interval: 1 }, { type: 'number', count: 10, interval: 0.5 }],
    [{ type: 'shield', count: 8, interval: 0.7 }, { type: 'number', count: 8, interval: 0.4 }],
    [{ type: 'number', count: 20, interval: 0.35 }],
    [{ type: 'face', count: 2, interval: 2.5 }, { type: 'shield', count: 6, interval: 0.7 }],
    [{ type: 'shield', count: 10, interval: 0.6 }, { type: 'number', count: 12, interval: 0.4 }],
    [{ type: 'face', count: 3, interval: 2.0 }],
    [{ type: 'number', count: 24, interval: 0.3 }, { type: 'shield', count: 8, interval: 0.5 }],
    [{ type: 'face', count: 3, interval: 1.5 }, { type: 'ace', count: 2, interval: 2.5 }]
  ];

  // Selectable stages. Stage 1 reuses the existing (tuning) map & waves.
  CTD.STAGES = [
    {
      id: 'stage1', name: 'ステージ1', subtitle: 'はじまりの王国（練習）',
      waypoints: CTD.WAYPOINTS, waves: CTD.WAVES,
      startGold: 130, startLife: 20, hpScale: 0.10, tutorial: true
    },
    {
      id: 'stage2', name: 'ステージ2', subtitle: '蛇の回廊（高難度）',
      waypoints: STAGE2_WAYPOINTS, waves: STAGE2_WAVES,
      startGold: 120, startLife: 20, hpScale: 0.13, tutorial: false
    }
  ];

})(window.CTD);
