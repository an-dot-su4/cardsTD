// cardsTD — bootstrap: canvas sizing, game loop.
(function (CTD) {
  'use strict';

  var C = CTD.CONFIG;
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var game = new CTD.Game();
  CTD.game = game;

  function sizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = C.W * dpr;
    canvas.height = C.H * dpr;
    // fit within the board area while keeping aspect ratio
    var wrap = document.getElementById('boardWrap');
    var pad = 12;
    var availW = wrap.clientWidth - pad;
    var availH = wrap.clientHeight - pad;
    var scale = Math.min(availW / C.W, availH / C.H);
    if (!isFinite(scale) || scale <= 0) scale = 1;
    canvas.style.width = (C.W * scale) + 'px';
    canvas.style.height = (C.H * scale) + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', sizeCanvas);

  CTD.UI.init(game);
  CTD.initInput(game, canvas);
  sizeCanvas();

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!game.paused) {
      var steps = game.speed;
      for (var s = 0; s < steps; s++) game.update(dt);
    }
    ctx.clearRect(0, 0, C.W, C.H);
    CTD.drawScene(ctx, game);
    CTD.UI.refresh();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

})(window.CTD);
