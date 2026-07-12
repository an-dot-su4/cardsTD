// cardsTD — all canvas drawing. Units are rendered as playing cards
// wearing stick arms/legs and a little head, i.e. "card soldiers".
window.CTD = window.CTD || {};
(function (CTD) {
  'use strict';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // A card body with stick limbs + head, centred at (cx, cy).
  // opts: { w, h, suit, rank, ink, weapon, marching, phase }
  function drawSoldier(ctx, cx, cy, opts) {
    var w = opts.w, h = opts.h;
    var top = cy - h / 2, bot = cy + h / 2;
    var left = cx - w / 2, right = cx + w / 2;
    var ink = opts.ink || '#1a1a1a';
    var limb = '#3a2a1a';
    var lw = Math.max(1.4, w * 0.06);
    var swing = opts.marching ? Math.sin(opts.phase || 0) * (h * 0.12) : 0;

    ctx.save();
    ctx.lineWidth = lw;
    ctx.strokeStyle = limb;
    ctx.lineCap = 'round';

    // legs (behind body)
    var legY = bot;
    var legLen = h * 0.34;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.18, legY);
    ctx.lineTo(cx - w * 0.24, legY + legLen + swing);
    ctx.moveTo(cx + w * 0.18, legY);
    ctx.lineTo(cx + w * 0.24, legY + legLen - swing);
    ctx.stroke();
    // feet
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.24, legY + legLen + swing);
    ctx.lineTo(cx - w * 0.40, legY + legLen + swing);
    ctx.moveTo(cx + w * 0.24, legY + legLen - swing);
    ctx.lineTo(cx + w * 0.40, legY + legLen - swing);
    ctx.stroke();

    // arms
    var armY = top + h * 0.30;
    ctx.beginPath();
    ctx.moveTo(left, armY);
    ctx.lineTo(left - w * 0.32, armY + h * 0.22);
    ctx.stroke();
    if (opts.weapon) {
      // right arm raised holding a spear
      var handX = right + w * 0.30, handY = armY - h * 0.05;
      ctx.beginPath();
      ctx.moveTo(right, armY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      ctx.save();
      ctx.strokeStyle = '#6b4a2b';
      ctx.lineWidth = lw * 1.1;
      ctx.beginPath();
      ctx.moveTo(handX, handY - h * 0.55);
      ctx.lineTo(handX, handY + h * 0.30);
      ctx.stroke();
      // spear head
      ctx.fillStyle = '#c9ccd4';
      ctx.beginPath();
      ctx.moveTo(handX, handY - h * 0.72);
      ctx.lineTo(handX - w * 0.12, handY - h * 0.52);
      ctx.lineTo(handX + w * 0.12, handY - h * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(right, armY);
      ctx.lineTo(right + w * 0.32, armY + h * 0.22);
      ctx.stroke();
    }

    // head
    var headR = w * 0.26;
    var headY = top - headR * 0.9;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fillStyle = '#f3e2c7';
    ctx.fill();
    ctx.lineWidth = Math.max(1, lw * 0.7);
    ctx.strokeStyle = '#3a2a1a';
    ctx.stroke();

    // card body
    roundRect(ctx, left, top, w, h, Math.min(6, w * 0.18));
    ctx.fillStyle = '#fdfdf6';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, w * 0.07);
    ctx.strokeStyle = ink;
    ctx.stroke();

    // suit + rank
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = (h * 0.42).toFixed(0) + 'px serif';
    ctx.fillText(opts.suit, cx, cy + h * 0.04);
    if (opts.rank) {
      ctx.font = 'bold ' + (h * 0.24).toFixed(0) + 'px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.rank, left + w * 0.12, top + h * 0.06);
    }
    ctx.restore();
  }
  CTD.drawSoldier = drawSoldier;

  function drawBoard(ctx, game) {
    var C = CTD.CONFIG;
    // felt
    ctx.fillStyle = '#0f6b3f';
    ctx.fillRect(0, 0, C.W, C.H);
    // subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (var c = 0; c <= C.COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * C.CELL, 0); ctx.lineTo(c * C.CELL, C.H); ctx.stroke();
    }
    for (var r = 0; r <= C.ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * C.CELL); ctx.lineTo(C.W, r * C.CELL); ctx.stroke();
    }
    // road
    ctx.fillStyle = '#d8c39a';
    game.road.forEach(function (key) {
      var p = key.split(',');
      ctx.save();
      roundRect(ctx, +p[0] * C.CELL + 1, +p[1] * C.CELL + 1, C.CELL - 2, C.CELL - 2, 5);
      ctx.fill();
      ctx.restore();
    });
  }
  CTD.drawBoard = drawBoard;

  function drawPlacement(ctx, game) {
    if (!game.placing) return;
    var C = CTD.CONFIG;
    // shade buildable cells
    for (var col = 0; col < C.COLS; col++) {
      for (var row = 0; row < C.ROWS; row++) {
        if (game.canBuildAt(col, row)) {
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fillRect(col * C.CELL + 2, row * C.CELL + 2, C.CELL - 4, C.CELL - 4);
        }
      }
    }
    if (game.hover) {
      var hc = Math.floor(game.hover.x / C.CELL), hr = Math.floor(game.hover.y / C.CELL);
      var ok = game.canBuildAt(hc, hr) && game.gold >= CTD.TOWER_TYPES[game.placing].buildCost;
      ctx.fillStyle = ok ? 'rgba(80,220,120,0.35)' : 'rgba(230,70,70,0.35)';
      ctx.fillRect(hc * C.CELL + 1, hr * C.CELL + 1, C.CELL - 2, C.CELL - 2);
      var lv = CTD.TOWER_TYPES[game.placing].levels[0];
      drawRange(ctx, (hc + 0.5) * C.CELL, (hr + 0.5) * C.CELL, lv.range, ok);
    }
  }
  CTD.drawPlacement = drawPlacement;

  function drawRange(ctx, x, y, range, ok) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fillStyle = ok === false ? 'rgba(230,70,70,0.12)' : 'rgba(255,255,255,0.10)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();
    ctx.restore();
  }
  CTD.drawRange = drawRange;

  function drawTowers(ctx, game) {
    var C = CTD.CONFIG;
    game.towers.forEach(function (t) {
      var lv = t.def.levels[t.level];
      if (game.selected === t) drawRange(ctx, t.x, t.y, lv.range, true);
      drawSoldier(ctx, t.x, t.y - 2, {
        w: C.CELL * 0.62, h: C.CELL * 0.82,
        suit: t.def.suit, rank: lv.rank, ink: t.def.color, weapon: true
      });
    });
  }
  CTD.drawTowers = drawTowers;

  function drawEnemies(ctx, game) {
    game.enemies.forEach(function (e) {
      var w = e.kind === 'face' ? 24 : 20;
      var h = e.kind === 'face' ? 32 : 26;
      drawSoldier(ctx, e.x, e.y, {
        w: w, h: h, suit: e.suit, rank: e.rank, ink: e.def.color,
        marching: true, phase: e.phase
      });
      if (e.kind === 'shield') {
        // small shield in the left hand
        ctx.save();
        ctx.fillStyle = '#9aa7b3';
        ctx.strokeStyle = '#4a5560';
        ctx.lineWidth = 1.2;
        var sx = e.x - w * 0.7, sy = e.y;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy - 4);
        ctx.lineTo(sx + 6, sy + 3); ctx.lineTo(sx, sy + 8);
        ctx.lineTo(sx - 6, sy + 3); ctx.lineTo(sx - 6, sy - 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // hp bar
      var bw = w + 6, frac = Math.max(0, e.hp / e.maxHp);
      var by = e.y - h / 2 - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(e.x - bw / 2, by, bw, 4);
      ctx.fillStyle = frac > 0.5 ? '#5ed17a' : frac > 0.25 ? '#e6c453' : '#e64646';
      ctx.fillRect(e.x - bw / 2, by, bw * frac, 4);
    });
  }
  CTD.drawEnemies = drawEnemies;

  function drawProjectiles(ctx, game) {
    game.projectiles.forEach(function (p) {
      ctx.save();
      ctx.fillStyle = p.splash ? '#ffd54a' : '#fff2c2';
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.splash ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    // splash flashes
    game.effects.forEach(function (fx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, fx.life / fx.max);
      ctx.strokeStyle = '#ffd54a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.r * (1 - fx.life / fx.max) + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }
  CTD.drawProjectiles = drawProjectiles;

  CTD.drawScene = function (ctx, game) {
    drawBoard(ctx, game);
    drawPlacement(ctx, game);
    drawTowers(ctx, game);
    drawEnemies(ctx, game);
    drawProjectiles(ctx, game);
  };

})(window.CTD);
