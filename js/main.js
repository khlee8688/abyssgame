// ABYSS site (both pages). Nothing here is needed to read a page: without scripts everything is simply shown.
(function () {
  'use strict';

  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (selector, run) { Array.prototype.forEach.call(document.querySelectorAll(selector), run); };

  // ---- what the scroll drives ----
  // With motion turned down nothing below is set up: the page stays as its plain styles show it.
  var clamp = function (value) { return Math.min(Math.max(value, 0), 1); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var hero = document.querySelector('.hero');
  var driven = !calm;
  if (driven) { root.classList.add('dive'); }

  // 1. the first screen: the swim toward the hand, one still per step of the scroll
  var swim = null;
  if (driven && hero && hero.getAttribute('data-dive')) {
    var canvas = hero.querySelector('.hero-canvas');
    var pen = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (pen) {
      var count = parseInt(hero.getAttribute('data-frames'), 10) || 1;
      var folder = hero.getAttribute('data-dive');
      var stills = new Array(count);
      var shown = -1;
      var wanted = 0;
      var name = function (index) { return folder + ('00' + index).slice(-3) + '.jpg'; };
      var draw = function () {
        // the nearest still already here, looking back first so the swim never jumps ahead of itself
        var index = wanted;
        while (index > 0 && !(stills[index] && stills[index].ready)) { index--; }
        if (!(stills[index] && stills[index].ready)) {
          index = wanted;
          while (index < count - 1 && !(stills[index] && stills[index].ready)) { index++; }
        }
        var still = stills[index];
        if (!still || !still.ready || (index === shown && !swim.resized)) { return; }
        swim.resized = false;
        shown = index;
        var w = canvas.width, h = canvas.height;
        // fills the screen, a little large and a little low: dark water above it for the name
        var scale = Math.max(w / still.width, h / still.height) * 1.1;
        var dw = still.width * scale, dh = still.height * scale;
        pen.fillStyle = '#000';
        pen.fillRect(0, 0, w, h);
        pen.drawImage(still, (w - dw) / 2, (h - dh) / 2 + h * 0.08, dw, dh);
      };
      var size = function () {
        var ratio = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.round(canvas.clientWidth * ratio), h = Math.round(canvas.clientHeight * ratio);
        if (w && h && (canvas.width !== w || canvas.height !== h)) {
          canvas.width = w;
          canvas.height = h;
          swim.resized = true;
        }
      };
      var fetchStill = function (index, then) {
        var still = new Image();
        still.decoding = 'async';
        still.onload = function () { still.ready = true; draw(); if (then) { then(); } };
        still.onerror = function () { if (then) { then(); } };
        still.src = name(index);
        stills[index] = still;
      };
      swim = { resized: true, shown: function () { return shown; }, loaded: function () { return stills.filter(function (s) { return s && s.ready; }).length; } };
      size();
      // the first still at once, then every eighth so any place in the swim has something near it, then the rest
      var order = [0];
      var step, index;
      for (step = 8; step >= 1; step = step >> 1) {
        for (index = 0; index < count; index += step) { if (order.indexOf(index) < 0) { order.push(index); } }
      }
      var next = 0;
      var feed = function () { if (next < order.length) { fetchStill(order[next++], feed); } };
      feed(); feed(); feed(); feed();
      swim.to = function (progress) { wanted = Math.round(clamp(progress) * (count - 1)); draw(); };
      swim.size = size;
    }
  }

  // 2. how deep: a small readout counting to the depth the game gives, 5,200 m at the foot of the home page
  var depth = null;
  if (driven && document.body.classList.contains('home')) {
    depth = document.createElement('div');
    depth.className = 'depth';
    depth.setAttribute('aria-hidden', 'true');
    depth.innerHTML = 'DEPTH <b>0</b> M';
    document.body.appendChild(depth);
  }

  // 3. the game's lines. Every letter goes into a span of its own (a word stays in one piece so a line never
  //    breaks inside it); what the scroll then does with them is the line's data-fx:
  //      typed   written out letter by letter, a caret after the last one
  //      scatter the letters of the last sentence lie out of place and come to rest
  //      flicker comes on the way a lamp does, by itself, once the line is well up the screen
  //      focus   out of focus, drawn sharp
  //      cuts    three pieces, each there at once (data-cuts: the words a new piece begins with)
  var lines = [];
  // 0..1, the same on every visit
  var noise = function (n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  if (driven) {
    each('.said', function (line) {
      var kind = line.getAttribute('data-fx') || 'typed';
      var letters = [];
      var words = [];
      var sentences = 0;
      line.setAttribute('data-fx', kind);
      line.classList.remove('reveal');   // the scroll brings it in, not the fade other blocks come up with
      line.setAttribute('aria-label', line.textContent.replace(/\s+/g, ' ').trim());
      Array.prototype.slice.call(line.childNodes).forEach(function (node) {
        if (node.nodeType !== 3 || !node.textContent.trim()) { return; }
        var piece = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (word) {
          if (!word) { return; }
          if (/^\s+$/.test(word)) { piece.appendChild(document.createTextNode(' ')); return; }
          var holder = document.createElement('span');
          holder.className = 'word';
          holder.setAttribute('aria-hidden', 'true');
          word.split('').forEach(function (letter) {
            var span = document.createElement('span');
            span.className = 'ch';
            span.textContent = letter;
            span.sentence = sentences;
            if (letter === '\u201C' || letter === '\u201D') { span.classList.add('q'); }
            holder.appendChild(span);
            letters.push(span);
          });
          words.push(holder);
          piece.appendChild(holder);
        });
        line.replaceChild(piece, node);
        sentences++;
      });
      var pieces = 1;
      if (kind === 'scatter') {
        letters.forEach(function (span, index) {
          if (sentences > 1 && span.sentence < sentences - 1) { span.classList.add('held'); return; }
          span.style.setProperty('--dx', ((noise(index) - 0.5) * 1.5).toFixed(2));
          span.style.setProperty('--dy', ((noise(index + 50) - 0.5) * 2.8).toFixed(2));
          span.style.setProperty('--dr', Math.round((noise(index + 100) - 0.5) * 120));
        });
      }
      if (kind === 'cuts') {
        var starts = (line.getAttribute('data-cuts') || '').split(',').map(Number).filter(function (n) { return n > 0; });
        words.forEach(function (word, index) { word.piece = starts.filter(function (start) { return index >= start; }).length; });
        pieces = starts.length + 1;
      }
      lines.push({ element: line, kind: kind, letters: letters, words: words, pieces: pieces, state: -1, caret: null });
    });
  }

  // 4. the pictures; what the scroll does to one is its data-fx:
  //      lamp  (none given) a circle of it opens from its middle
  //      sink  the frame is a window the wall goes up past
  //      rings three discs of it turned out of place turn home
  //      beam  a small circle comes in from the side, reaches the fish, then opens
  //      sonar a wave goes out over the dark picture and shows what it passes
  //      hops  dark for a moment three times, and each time the figure is nearer
  var pictures = [];
  var nearness = [1, 1.15, 1.31, 1.5];
  var hop = function (picture) {
    picture.element.classList.add('dark');
    clearTimeout(picture.timer);
    picture.timer = setTimeout(function () {
      picture.element.style.setProperty('--near', nearness[picture.step]);
      picture.element.classList.remove('dark');
    }, 140);
  };
  if (driven) {
    each('.shot', function (element) {
      var kind = element.getAttribute('data-fx') || 'lamp';
      var image = element.querySelector('img');
      element.setAttribute('data-fx', kind);
      element.classList.remove('reveal');
      // the effects that need the picture more than once get it as extra layers, once the picture itself is here
      var names = kind === 'rings' ? ['ring a', 'ring b', 'ring c'] : kind === 'sonar' ? ['wave'] : [];
      if (names.length && image) {
        var layers = names.map(function (name) {
          var layer = document.createElement('span');
          layer.className = name;
          layer.setAttribute('aria-hidden', 'true');
          element.appendChild(layer);
          return layer;
        });
        var paint = function () {
          var address = 'url("' + (image.currentSrc || image.src) + '")';
          layers.forEach(function (layer) { layer.style.backgroundImage = address; });
        };
        // (a phone turned on its side gets the other cut of the picture: painted again whenever one arrives)
        image.addEventListener('load', paint);
        if (image.complete && image.naturalWidth) { paint(); }
      }
      pictures.push({ element: element, kind: kind, image: image, step: 0, timer: 0 });
    });
  }

  // 5. the trailer's frame opens from a slit
  var trailer = driven ? document.querySelector('.trailer') : null;

  var queued = false;
  var read = function () {
    queued = false;
    var y = window.scrollY;
    var tall = window.innerHeight;

    var through = hero ? clamp(y / Math.max(hero.offsetHeight - tall, 1)) : 1;
    // once the swim is over and the name is gone, the small name in the bar comes in
    root.classList.toggle('past-hero', hero ? through > 0.45 : true);
    // the light from above dies with the depth: all of it at the top of the home page, none at its foot
    var whole = clamp(y / Math.max(document.documentElement.scrollHeight - tall, 1));
    if (hero) { root.style.setProperty('--sea', (1 - whole).toFixed(3)); }
    if (!driven) { return; }

    if (hero) { hero.style.setProperty('--dive', through.toFixed(4)); }
    if (swim) { swim.to(through); }

    if (depth) {
      var meters = Math.round(5200 * whole).toString();
      depth.firstElementChild.nextSibling.textContent = ' M';
      depth.querySelector('b').textContent = meters.length > 3 ? meters.slice(0, -3) + ',' + meters.slice(-3) : meters;
    }

    lines.forEach(function (line) {
      var box = line.element.getBoundingClientRect();
      if (box.bottom < -tall || box.top > tall * 2) { return; }
      // 0 as the line clears the lower edge, 1 when it stands a little above the middle
      var middle = box.top + box.height / 2;
      var share = clamp((tall * 0.92 - middle) / (tall * 0.42));
      var style = line.element.style;
      var kind = line.kind;
      if (kind === 'typed') {
        var upTo = Math.round(share * line.letters.length);
        if (upTo === line.state) { return; }
        var from = Math.min(upTo, Math.max(line.state, 0)), to = Math.max(upTo, line.state), index;
        for (index = from; index < to; index++) { line.letters[index].classList.toggle('lit', index < upTo); }
        if (line.caret) { line.caret.classList.remove('at'); }
        line.caret = upTo > 0 && upTo < line.letters.length ? line.letters[upTo - 1] : null;
        if (line.caret) { line.caret.classList.add('at'); }
        line.state = upTo;
      } else if (kind === 'scatter') {
        style.setProperty('--t', ease(share).toFixed(3));
        style.setProperty('--h', clamp(share * 2.5).toFixed(3));
      } else if (kind === 'focus') {
        var sharp = ease(share);
        style.setProperty('--t', sharp.toFixed(3));
        line.element.classList.toggle('sharp', sharp > 0.995);
      } else if (kind === 'flicker') {
        if (share > 0.42) { line.element.classList.add('on'); } else if (share < 0.04) { line.element.classList.remove('on'); }
      } else if (kind === 'cuts') {
        var there = share < 0.12 ? 0 : Math.min(line.pieces, 1 + Math.floor((share - 0.12) / (0.66 / Math.max(line.pieces - 1, 1))));
        if (there === line.state) { return; }
        line.words.forEach(function (word) { word.classList.toggle('in', word.piece < there); });
        line.state = there;
      }
    });

    pictures.forEach(function (picture) {
      var kind = picture.kind;
      var box = picture.element.getBoundingClientRect();
      if (box.bottom < -tall * 0.5 || box.top > tall * 1.5) { return; }
      var style = picture.element.style;
      // 0 as its top edge comes on at the foot of the screen, 1 when its middle is at the screen's middle
      var share = clamp((tall - box.top) / (tall * 0.5 + box.height * 0.5));
      // the same for its middle: 0 as its middle comes on at the foot of the screen (for what should be seen whole)
      var mid = clamp((tall - box.top - box.height * 0.5) / (tall * 0.5));
      if (kind === 'lamp') {
        style.setProperty('--lamp', ease(share).toFixed(3));
      } else if (kind === 'sink') {
        // all the way across the screen, not only to its middle
        style.setProperty('--p', clamp((tall - box.top) / (tall + box.height)).toFixed(4));
        style.setProperty('--in', clamp(share * 2.2).toFixed(3));
      } else if (kind === 'rings') {
        style.setProperty('--p', ease(clamp(share / 0.94)).toFixed(4));
        style.setProperty('--in', clamp(share * 3).toFixed(3));
      } else if (kind === 'beam') {
        var seek = ease(clamp((mid - 0.05) / 0.55));    // the circle travels along the fish, tail to head
        var open = ease(clamp((mid - 0.6) / 0.4));      // and then opens
        // (where the fish is, in the wide picture; the upright cut shows its middle 45%)
        var across = 27 + 31 * seek - 9 * open;
        if (picture.image && picture.image.naturalHeight > picture.image.naturalWidth) { across = Math.max((across - 27.5) / 0.45, 6); }
        style.setProperty('--bx', across.toFixed(2) + '%');
        style.setProperty('--by', (50 - 2 * seek).toFixed(2) + '%');
        style.setProperty('--br', (0.16 + 0.05 * seek + 0.79 * open).toFixed(3));
      } else if (kind === 'sonar') {
        // the wave's front, as a share of the way from the diver's place to the farthest corner
        style.setProperty('--front', (-5 + 120 * clamp((mid - 0.2) / 0.6)).toFixed(2) + '%');
        style.setProperty('--lit', ease(clamp((mid - 0.7) / 0.3)).toFixed(3));
      } else if (kind === 'hops') {
        var step = mid < 0.2 ? 0 : mid < 0.55 ? 1 : mid < 0.9 ? 2 : 3;
        if (step !== picture.step) { picture.step = step; hop(picture); }
      }
    });

    if (trailer) {
      var slit = trailer.getBoundingClientRect();
      if (slit.bottom > -tall * 0.5 && slit.top < tall * 1.5) {
        trailer.style.setProperty('--p', ease(clamp((tall - slit.top) / (tall * 0.5 + slit.height * 0.5))).toFixed(3));
      }
    }

  };
  window.addEventListener('scroll', function () {
    if (!queued) { queued = true; requestAnimationFrame(read); }
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (swim) { swim.size(); }
    if (!queued) { queued = true; requestAnimationFrame(read); }
  });
  window.addEventListener('load', read);
  read();
  // for the site's own checks: what the swim is showing
  if (swim) { window.abyssSwim = swim; }

  // ---- things come up as they are reached ----
  var waiting = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !calm) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          seen.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    waiting.forEach(function (element) { seen.observe(element); });
  } else {
    waiting.forEach(function (element) { element.classList.add('in'); });
  }

  // ---- clips play while they are on screen and stop when they leave; a tap stops or starts one by hand ----
  // (nothing is fetched before a clip is near the screen: a phone on mobile data only loads what is looked at)
  var clips = Array.prototype.slice.call(document.querySelectorAll('video[data-auto]'));
  clips.forEach(function (clip) {
    clip.addEventListener('click', function () {
      if (clip.paused) { clip.dataset.held = ''; clip.play(); } else { clip.dataset.held = '1'; clip.pause(); }
    });
  });
  if ('IntersectionObserver' in window && !calm) {
    var onScreen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var clip = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!clip.dataset.held) {
            var started = clip.play();
            if (started && started.catch) { started.catch(function () { /* the still stays */ }); }
          }
        } else if (!clip.paused) {
          clip.pause();
        }
      });
    }, { threshold: [0, 0.5] });
    clips.forEach(function (clip) { onScreen.observe(clip); });
  } else {
    // no automatic playing: each clip gets the browser's own play button
    clips.forEach(function (clip) { clip.controls = true; });
  }

  // ---- the two stills of the camera look: the line between them follows the slider ----
  each('.compare', function (box) {
    var slider = box.querySelector('input');
    if (!slider) { return; }
    var set = function () { box.style.setProperty('--pos', slider.value + '%'); };
    slider.addEventListener('input', set);
    set();
  });

  // ---- the two recordings: one plays at a time; pressing the one that plays stops it ----
  var player = null;
  var playing = null;
  var stop = function () {
    if (player) { player.pause(); }
    if (playing) { playing.classList.remove('on'); playing.setAttribute('aria-pressed', 'false'); }
    playing = null;
  };
  each('.ear', function (button) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', function () {
      var same = playing === button;
      stop();
      if (same) { return; }
      player = new Audio(button.getAttribute('data-audio'));
      player.addEventListener('ended', stop);
      playing = button;
      button.classList.add('on');
      button.setAttribute('aria-pressed', 'true');
      var started = player.play();
      if (started && started.catch) { started.catch(stop); }
    });
  });

  // ---- the trailer: while video/trailer.mp4 is not there the frame says so; once it is, a player takes its place ----
  var frame = document.querySelector('.frame[data-video]');
  if (frame && /^https?:$/.test(location.protocol) && window.fetch) {
    var source = frame.getAttribute('data-video');
    fetch(source, { method: 'HEAD' }).then(function (answer) {
      var kind = answer.headers.get('content-type') || '';
      if (!answer.ok || kind.indexOf('video') !== 0) { return; }
      var still = frame.querySelector('img');
      var video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      if (still) { video.poster = still.getAttribute('src'); }
      video.src = source;
      frame.innerHTML = '';
      frame.appendChild(video);
      frame.classList.add('has-video');
    }).catch(function () { /* stays as the notice */ });
  }
})();
