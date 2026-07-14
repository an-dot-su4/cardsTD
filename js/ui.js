// cardsTD — DOM UI: tray, HUD, tower panel, overlays.
window.CTD = window.CTD || {};
(function (CTD) {
  'use strict';

  var RED = { '♥': true, '♦': true };
  var ATK_KEY = { '単発': 'single', '連射': 'rapid', '範囲': 'splash' };

  function el(id) { return document.getElementById(id); }

  // Express a pixel range in grid cells + a short 短/中/長 label.
  function rangeInfo(px) {
    var cells = (px / CTD.CONFIG.CELL).toFixed(1);
    var word = px < 100 ? '短' : (px <= 125 ? '中' : '長');
    return { cells: cells, word: word };
  }

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
        UI.coachDismissed = false; // show the coach again on a fresh run
        game.start();
      }
    });

    this.coachDismissed = false;
    el('coachClose').addEventListener('click', function () { UI.coachDismissed = true; });
    el('coachBody').innerHTML =
      '<b>あそびかた</b><br>' +
      '① 下のカードを選ぶ<br>' +
      '② 光るマスをタップ → <b>もう一度タップで配置</b>（白い円＝攻撃範囲）<br>' +
      '③ 〈ウェーブ開始〉で敵が進軍。倒してゴールドを稼ぎ、タワーをタップで強化<br>' +
      '♣クラブは着弾点の<b>まわりもまとめて攻撃</b>（黄色い円）';
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
      var r = rangeInfo(def.levels[0].range);
      card.innerHTML =
        '<div class="suit ' + (RED[def.suit] ? 'red' : '') + '">' + def.suit + '</div>' +
        '<div class="nm">' + def.name + '</div>' +
        '<div class="badge atk-' + ATK_KEY[def.atk] + '">' + def.atk + '</div>' +
        '<div class="spec">攻撃 ' + def.levels[0].damage + ' ／ 射程 ' + r.word + '<br>（約' + r.cells + 'マス）</div>' +
        '<div class="cost">🪙' + def.buildCost + '</div>';
      card.addEventListener('click', function () {
        if (game.phase === 'title' || game.phase === 'over' || game.phase === 'win') return;
        game.placing = (game.placing === id) ? null : id;
        game.pending = null;
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
    if (game.placing && game.pending) el('hint').textContent = 'もう一度タップで配置（円＝攻撃範囲）';
    else if (game.placing) el('hint').textContent = '光るマスをタップ（射程が表示されます）';
    else if (game.phase === 'wave') el('hint').textContent = '進行中… 敵を食い止めろ！';
    else if (game.canStartWave()) el('hint').textContent = 'タワーを配置して次のウェーブへ';
    else el('hint').textContent = '';

    // first-stage coach banner (before the very first wave)
    var showCoach = game.phase === 'build' && game.waveIndex < 0 &&
      !this.coachDismissed && game.towers.length === 0;
    el('coach').classList.toggle('hidden', !showCoach);

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
    var r = rangeInfo(lv.range);
    var atk = t.def.hit === 'splash' ? '範囲（周囲もダメージ）' : t.def.atk;
    el('towerInfo').innerHTML =
      '<b>' + t.def.suit + ' ' + t.def.name + '</b>（ランク ' + lv.rank + '）<br>' +
      '攻撃力 ' + lv.damage + ' ／ 連射 ' + lv.fireRate.toFixed(1) + '/秒<br>' +
      '射程 ' + r.word + '（約' + r.cells + 'マス）／ 攻撃 ' + atk;
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
