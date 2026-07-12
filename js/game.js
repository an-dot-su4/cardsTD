// cardsTD — game state, entities and simulation.
window.CTD = window.CTD || {};
(function (CTD) {
  'use strict';

  var C = CTD.CONFIG;

  function center(col, row) {
    return { x: (col + 0.5) * C.CELL, y: (row + 0.5) * C.CELL };
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Build the road cell set and pixel path from the waypoints.
  function buildPath() {
    var wp = CTD.WAYPOINTS;
    var road = {};
    var pixels = [];
    for (var i = 0; i < wp.length; i++) {
      pixels.push(center(wp[i][0], wp[i][1]));
      if (i === 0) continue;
      var a = wp[i - 1], b = wp[i];
      var stepC = Math.sign(b[0] - a[0]);
      var stepR = Math.sign(b[1] - a[1]);
      var col = a[0], row = a[1];
      while (col !== b[0] || row !== b[1]) {
        if (row >= 0 && row < C.ROWS && col >= 0 && col < C.COLS) road[col + ',' + row] = true;
        col += stepC; row += stepR;
      }
      if (b[1] >= 0 && b[1] < C.ROWS && b[0] >= 0 && b[0] < C.COLS) road[b[0] + ',' + b[1]] = true;
    }
    return { road: Object.keys(road), roadSet: road, pixels: pixels };
  }

  function Game() {
    var path = buildPath();
    this.road = path.road;
    this.roadSet = path.roadSet;
    this.path = path.pixels;
    this.reset();
  }

  Game.prototype.reset = function () {
    this.gold = C.START_GOLD;
    this.life = C.START_LIFE;
    this.waveIndex = -1;       // -1 = not started yet
    this.phase = 'title';      // title | build | wave | over | win
    this.paused = false;
    this.speed = 1;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.occupied = {};        // "col,row" -> tower
    this.placing = null;       // tower type id being placed
    this.selected = null;      // selected tower for upgrade/sell
    this.hover = null;
    this.spawnQueue = [];      // pending {type, time}
    this.spawnClock = 0;
  };

  Game.prototype.start = function () {
    this.reset();
    this.phase = 'build';
  };

  Game.prototype.canBuildAt = function (col, row) {
    if (col < 0 || col >= C.COLS || row < 0 || row >= C.ROWS) return false;
    if (this.roadSet[col + ',' + row]) return false;
    if (this.occupied[col + ',' + row]) return false;
    return true;
  };

  Game.prototype.placeTower = function (typeId, col, row) {
    if (!this.canBuildAt(col, row)) return false;
    var def = CTD.TOWER_TYPES[typeId];
    if (this.gold < def.buildCost) return false;
    this.gold -= def.buildCost;
    var pos = center(col, row);
    var tower = { def: def, col: col, row: row, x: pos.x, y: pos.y, level: 0, cooldown: 0 };
    this.towers.push(tower);
    this.occupied[col + ',' + row] = tower;
    return true;
  };

  Game.prototype.upgradeCost = function (tower) {
    var next = tower.def.levels[tower.level + 1];
    return next ? next.upgradeCost : null;
  };

  Game.prototype.upgradeTower = function (tower) {
    var cost = this.upgradeCost(tower);
    if (cost == null || this.gold < cost) return false;
    this.gold -= cost;
    tower.level += 1;
    return true;
  };

  Game.prototype.sellTower = function (tower) {
    var spent = tower.def.buildCost;
    for (var i = 1; i <= tower.level; i++) spent += tower.def.levels[i].upgradeCost;
    this.gold += Math.floor(spent * C.SELL_REFUND);
    delete this.occupied[tower.col + ',' + tower.row];
    var idx = this.towers.indexOf(tower);
    if (idx >= 0) this.towers.splice(idx, 1);
    if (this.selected === tower) this.selected = null;
  };

  Game.prototype.canStartWave = function () {
    return this.phase === 'build' && this.waveIndex < CTD.WAVES.length - 1;
  };

  Game.prototype.startWave = function () {
    if (this.phase !== 'build') return;
    this.waveIndex += 1;
    var groups = CTD.WAVES[this.waveIndex];
    var t = 0;
    this.spawnQueue = [];
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      for (var i = 0; i < grp.count; i++) {
        this.spawnQueue.push({ type: grp.type, time: t });
        t += grp.interval;
      }
      t += 0.6; // small gap between groups
    }
    this.spawnClock = 0;
    this.phase = 'wave';
  };

  Game.prototype.spawnEnemy = function (typeId) {
    var def = CTD.ENEMY_TYPES[typeId];
    var start = this.path[0];
    var scale = 1 + Math.max(0, this.waveIndex) * C.HP_WAVE_SCALE;
    var hp = Math.round(def.hp * scale);
    var rank = def.rank || String(2 + Math.floor(Math.random() * 9)); // 2..10 for pips
    var suit = def.kind === 'face'
      ? '♠'
      : ['♥', '♦', '♣', '♠'][Math.floor(Math.random() * 4)];
    this.enemies.push({
      def: def, kind: def.kind, x: start.x, y: start.y,
      hp: hp, maxHp: hp, speed: def.speed, reward: def.reward,
      wp: 1, traveled: 0, suit: suit, rank: rank, phase: Math.random() * 6.28
    });
  };

  Game.prototype.update = function (dt) {
    if (this.phase !== 'wave') return;

    // spawn scheduled enemies
    this.spawnClock += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].time <= this.spawnClock) {
      this.spawnEnemy(this.spawnQueue.shift().type);
    }

    // move enemies
    for (var i = this.enemies.length - 1; i >= 0; i--) {
      var e = this.enemies[i];
      e.phase += dt * 9;
      var target = this.path[e.wp];
      var d = dist(e.x, e.y, target.x, target.y);
      var step = e.speed * dt;
      while (step >= d && e.wp < this.path.length - 1) {
        e.x = target.x; e.y = target.y; e.traveled += d;
        step -= d; e.wp += 1;
        target = this.path[e.wp];
        d = dist(e.x, e.y, target.x, target.y);
      }
      if (e.wp >= this.path.length - 1 && step >= d) {
        // reached the goal
        this.enemies.splice(i, 1);
        this.life -= 1;
        if (this.life <= 0) { this.life = 0; this.phase = 'over'; return; }
        continue;
      }
      var ang = Math.atan2(target.y - e.y, target.x - e.x);
      e.x += Math.cos(ang) * step;
      e.y += Math.sin(ang) * step;
      e.traveled += step;
    }

    // towers fire
    for (var ti = 0; ti < this.towers.length; ti++) {
      var t = this.towers[ti];
      var lv = t.def.levels[t.level];
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      var target2 = this.pickTarget(t, lv.range);
      if (!target2) continue;
      t.cooldown = 1 / lv.fireRate;
      this.projectiles.push({
        x: t.x, y: t.y, target: target2, tx: target2.x, ty: target2.y,
        speed: t.def.projSpeed, damage: lv.damage,
        splash: t.def.hit === 'splash' ? lv.splash : 0
      });
    }

    // projectiles
    for (var pi = this.projectiles.length - 1; pi >= 0; pi--) {
      var p = this.projectiles[pi];
      if (p.target && this.enemies.indexOf(p.target) >= 0) {
        p.tx = p.target.x; p.ty = p.target.y;
      }
      var pd = dist(p.x, p.y, p.tx, p.ty);
      var pstep = p.speed * dt;
      if (pstep >= pd) {
        this.impact(p);
        this.projectiles.splice(pi, 1);
      } else {
        var pa = Math.atan2(p.ty - p.y, p.tx - p.x);
        p.x += Math.cos(pa) * pstep;
        p.y += Math.sin(pa) * pstep;
      }
    }

    // effects
    for (var fi = this.effects.length - 1; fi >= 0; fi--) {
      this.effects[fi].life -= dt;
      if (this.effects[fi].life <= 0) this.effects.splice(fi, 1);
    }

    // wave cleared?
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      if (this.waveIndex >= CTD.WAVES.length - 1) {
        this.phase = 'win';
      } else {
        this.phase = 'build';
        this.gold += 25; // between-wave bonus
      }
    }
  };

  Game.prototype.pickTarget = function (tower, range) {
    var best = null, bestProg = -1;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (dist(tower.x, tower.y, e.x, e.y) <= range && e.traveled > bestProg) {
        best = e; bestProg = e.traveled;
      }
    }
    return best;
  };

  Game.prototype.impact = function (p) {
    if (p.splash) {
      this.effects.push({ x: p.tx, y: p.ty, r: p.splash, life: 0.25, max: 0.25 });
      for (var i = this.enemies.length - 1; i >= 0; i--) {
        var e = this.enemies[i];
        if (dist(p.tx, p.ty, e.x, e.y) <= p.splash) this.damage(e, p.damage, i);
      }
    } else if (p.target && this.enemies.indexOf(p.target) >= 0) {
      this.damage(p.target, p.damage, this.enemies.indexOf(p.target));
    }
  };

  Game.prototype.damage = function (enemy, amount, index) {
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      this.gold += enemy.reward;
      var idx = index != null ? index : this.enemies.indexOf(enemy);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }
  };

  CTD.Game = Game;

})(window.CTD);
