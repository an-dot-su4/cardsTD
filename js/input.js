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
          game.placing = null;
          game.selected = existing;
        } else {
          game.placeTower(game.placing, col, row);
          // keep the card armed so several towers can be placed in a row
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

    // right-click / long area outside cancels placement
    canvas.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
      game.placing = null;
    });
  };

})(window.CTD);
