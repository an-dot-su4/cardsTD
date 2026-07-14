// cardsTD — pointer input (mouse + touch via Pointer Events).
window.CTD = window.CTD || {};
(function (CTD) {
  'use strict';

  var C = CTD.CONFIG;

  function toLogical(canvas, clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (C.W / rect.width),
      y: (clientY - rect.top) * (C.H / rect.height)
    };
  }

  CTD.initInput = function (game, canvas) {
    function playable() {
      return game.phase === 'build' || game.phase === 'wave';
    }

    canvas.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      if (!playable()) return;
      var p = toLogical(canvas, ev.clientX, ev.clientY);
      var col = Math.floor(p.x / C.CELL), row = Math.floor(p.y / C.CELL);
      var existing = game.occupied[col + ',' + row];

      if (game.placing) {
        if (existing) {
          // tapping an existing tower selects it (to upgrade/sell) and disarms
          game.placing = null; game.pending = null;
          game.selected = existing;
          return;
        }
        if (!game.canBuildAt(col, row)) { game.pending = null; return; }

        // Mouse has a live hover range preview, so a single click places.
        // Touch/pen has no hover, so first tap previews the range, second tap
        // on the same cell confirms — the player always sees the range first.
        if (ev.pointerType === 'mouse') {
          game.placeTower(game.placing, col, row);
        } else if (game.pending && game.pending.col === col && game.pending.row === row) {
          if (game.placeTower(game.placing, col, row)) game.pending = null;
        } else {
          game.pending = { col: col, row: row }; // pending drives the range ring
        }
        return;
      }
      // otherwise: select a tower on that cell (if any)
      game.selected = existing || null;
    });

    canvas.addEventListener('pointermove', function (ev) {
      if (!playable()) return;
      game.hover = toLogical(canvas, ev.clientX, ev.clientY);
    });

    canvas.addEventListener('pointerleave', function () {
      game.hover = null;
    });

    // on touch, don't leave a stale hover ring after the finger lifts
    function clearTouchHover(ev) {
      if (ev.pointerType !== 'mouse') game.hover = null;
    }
    canvas.addEventListener('pointerup', clearTouchHover);
    canvas.addEventListener('pointercancel', clearTouchHover);

    // right-click / long area outside cancels placement
    canvas.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
      game.placing = null; game.pending = null;
    });
  };

})(window.CTD);
