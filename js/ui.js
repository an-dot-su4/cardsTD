// cardsTD — DOM UI: tray, HUD, tower panel, overlays.
window.CTD = window.CTD || {};
(function (CTD) {
  'use strict';

  var RED = { '♥': true, '♦': true };

  function el(id) { return document.getElementById(id); }

  var UI = {};

  UI.init = function (game) {
    this.game = game;
    this.lastPhase = null;
    this.buildTray();

    el('startWaveBtn').addEventListener('click', function () {
      if (game.canStartWave()) game.startWave();
    });
    el('speedBtn').addEventListener('click', function () {
      game.speed = game.speed === 1 ? 2 : 1;
      el('speedBtn').textContent = 'x' + game.speed;
    });
    el('pauseBtn').addEventListener('click', function () {
      game.paused = !game.paused;
      el('pauseBtn').textContent = game.paused ? '▶' : '⏸';
    });
    el('upgradeBtn').addEventListener('click', function () {
      if (game.selected) game.upgradeTower(game.selected);
    });
    el('sellBtn').addEventListener('click', function () {
      if (game.selected) { game.sellTower(game.selected); game.selected = null; }
    });
    el('closeBtn').addEventListener('click', function () { game.selected = null; });

    el('overlay').addEventListener('click', function (ev) {
      if (ev.target && ev.target.dataset && ev.target.dataset.act === 'start') {
        game.start();
      }
    });
  };

  UI.buildTray = function () {
    var game = this.game;
    var tray = el('tray');
    tray.innerHTML = '';
    CTD.TOWER_ORDER.forEach(function (id) {
      var def = CTD.TOWER_TYPES[id];
      var card = document.createElement('div');
      card.className = 'tcard';
      card.dataset.id = id;
      card.innerHTML =
        '<div class="suit ' + (RED[def.suit] ? 'red' : '') + '">' + def.suit + '</div>' +
        '<div class="nm">' + def.name + '</div>' +
        '<div class="desc">' + def.desc + '</div>' +
        '<div class="cost">🪙' + def.buildCost + '</div>';
      card.addEventListener('click', function () {
        if (game.phase === 'title' || game.phase === 'over' || game.phase === 'win') return;
        game.placing = (game.placing === id) ? null : id;
        game.selected = null;
      });
      tray.appendChild(card);
    });
  };

  UI.refresh = function () {
    var game = this.game;
    el('life').textContent = game.life;
    el('gold').textContent = game.gold;
    el('wave').textContent = Math.max(0, game.waveIndex + 1);
    el('waveMax').textContent = CTD.WAVES.length;

    // tray selection / affordability
    var cards = el('tray').children;
    for (var i = 0; i < cards.length; i++) {
      var id = cards[i].dataset.id;
      var def = CTD.TOWER_TYPES[id];
      cards[i].classList.toggle('selected', game.placing === id);
      cards[i].classList.toggle('poor', game.gold < def.buildCost);
    }

    // start-wave button + hint
    var btn = el('startWaveBtn');
    btn.disabled = !game.canStartWave();
    if (game.phase === 'wave') el('hint').textContent = '進行中… 敵を食い止めろ！';
    else if (game.canStartWave()) el('hint').textContent = 'タワーを配置して次のウェーブへ';
    else el('hint').textContent = '';

    this.refreshPanel();
    this.refreshOverlay();
  };

  UI.refreshPanel = function () {
    var game = this.game, panel = el('towerPanel');
    var t = game.selected;
    if (!t || game.phase === 'title' || game.phase === 'over' || game.phase === 'win') {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    var lv = t.def.levels[t.level];
    var cost = game.upgradeCost(t);
    el('towerInfo').innerHTML =
      '<b>' + t.def.suit + ' ' + t.def.name + '</b>（ランク ' + lv.rank + '）<br>' +
      '攻撃力 ' + lv.damage + ' ／ 射程 ' + Math.round(lv.range) + ' ／ 連射 ' + lv.fireRate.toFixed(1) + '/秒';
    var up = el('upgradeBtn');
    if (cost == null) { up.textContent = '最大ランク'; up.disabled = true; }
    else { up.textContent = '強化 🪙' + cost; up.disabled = game.gold < cost; }
  };

  UI.refreshOverlay = function () {
    var game = this.game, ov = el('overlay');
    if (game.phase === this.lastPhase) return; // only rebuild on phase change
    this.lastPhase = game.phase;
    if (game.phase === 'title') {
      ov.classList.remove('hidden');
      ov.innerHTML =
        '<h1>♠ cardsTD ♥</h1>' +
        '<p>トランプ王国に攻め込むカード兵を、<br>トランプ兵士のタワーで食い止めよう。</p>' +
        '<p>カードをタップ → マスをタップで配置。<br>敵を倒してゴールドを稼ぎ、強化しよう。</p>' +
        '<button data-act="start">ゲーム開始</button>';
    } else if (game.phase === 'over') {
      ov.classList.remove('hidden');
      ov.innerHTML =
        '<p class="big">💀</p><h1>ゲームオーバー</h1>' +
        '<p>ウェーブ ' + (game.waveIndex + 1) + ' で王国は陥落した…</p>' +
        '<button data-act="start">もう一度</button>';
    } else if (game.phase === 'win') {
      ov.classList.remove('hidden');
      ov.innerHTML =
        '<p class="big">👑</p><h1>勝利！</h1>' +
        '<p>全ウェーブを防ぎ、王国を守り抜いた！</p>' +
        '<button data-act="start">もう一度</button>';
    } else {
      ov.classList.add('hidden');
    }
  };

  CTD.UI = UI;

})(window.CTD);
