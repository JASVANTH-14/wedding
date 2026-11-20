(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  //  FRAME MAPPING – Exclude 113-187 and 215-230 from display
  // ═══════════════════════════════════════════════════════════
  const VISIBLE_FRAMES = [];
  for (let i = 1; i <= 230; i++) {
    if (i >= 113 && i <= 187) continue;
    if (i >= 215 && i <= 230) continue;
    VISIBLE_FRAMES.push(i); // 1-indexed original frame numbers
  }
  const TOTAL_VISIBLE = VISIBLE_FRAMES.length; // 139

  const LERP_FACTOR = 0.2;

  function getFramePath(origFrame) {
    return 'images/ezgif-frame-' + String(origFrame).padStart(3, '0') + '.jpg';
  }

  // Map visible index → original 1-indexed frame number
  function origFrame(visIdx) {
    return VISIBLE_FRAMES[Math.min(Math.max(Math.round(visIdx), 0), TOTAL_VISIBLE - 1)];
  }

  // ═══════════════════════════════════════════════════════════
  //  CANVAS
  // ═══════════════════════════════════════════════════════════
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const imageCache = {};
  let currentFrame = 0;
  let targetFrame = 0;
  let lastDrawnOrig = -1;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tw = Math.round(window.innerWidth * dpr);
    const th = Math.round(window.innerHeight * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      lastDrawnOrig = -1;
    }
  }

  function drawCover(img) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(img, 0, 0, iw, ih, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh);
  }

  function renderCanvas() {
    const visIdx = Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_VISIBLE - 1);
    const orig = origFrame(visIdx);

    // Try exact frame, else find closest loaded
    let bestOrig = orig;
    if (!imageCache[orig] || !imageCache[orig].complete || !imageCache[orig].naturalWidth) {
      let found = false;
      for (let off = 1; off < TOTAL_VISIBLE; off++) {
        const li = visIdx - off, ri = visIdx + off;
        if (li >= 0) {
          const lo = origFrame(li);
          if (imageCache[lo] && imageCache[lo].complete && imageCache[lo].naturalWidth) { bestOrig = lo; found = true; break; }
        }
        if (ri < TOTAL_VISIBLE) {
          const ro = origFrame(ri);
          if (imageCache[ro] && imageCache[ro].complete && imageCache[ro].naturalWidth) { bestOrig = ro; found = true; break; }
        }
      }
      if (!found) return;
    }

    if (bestOrig === lastDrawnOrig) return;
    drawCover(imageCache[bestOrig]);
    lastDrawnOrig = bestOrig;
  }

  // ═══════════════════════════════════════════════════════════
  //  SCROLL
  // ═══════════════════════════════════════════════════════════
  function updateScroll(immediate) {
    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(Math.max(scrollTop / maxScroll, 0), 1) : 0;
    targetFrame = progress * (TOTAL_VISIBLE - 1);
    if (immediate) currentFrame = targetFrame;
  }

  // ═══════════════════════════════════════════════════════════
  //  GOOGLE CALENDAR LINK
  // ═══════════════════════════════════════════════════════════
  function calendarURL() {
    // 14 Jan 2027, 10:30 AM IST → UTC = 05:00 AM → 20270114T050000Z to 20270114T070000Z
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent('Arjun & Anu – Wedding')
      + '&dates=20270114T050000Z/20270114T070000Z'
      + '&details=' + encodeURIComponent('Wedding of Arjun & Anu')
      + '&location=' + encodeURIComponent("St. Antony's Church, Coonoor, Tamil Nadu, India");
  }

  // ═══════════════════════════════════════════════════════════
  //  COUNTDOWN
  // ═══════════════════════════════════════════════════════════
  const WEDDING_DATE = new Date('2027-01-14T10:30:00+05:30');

  function tickCountdown() {
    const now = new Date();
    let diff = WEDDING_DATE - now;
    if (diff < 0) diff = 0;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const dEl = document.getElementById('cd-days');
    const hEl = document.getElementById('cd-hours');
    const mEl = document.getElementById('cd-minutes');
    const sEl = document.getElementById('cd-seconds');
    if (dEl) dEl.textContent = String(days).padStart(3, '0');
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(mins).padStart(2, '0');
    if (sEl) sEl.textContent = String(secs).padStart(2, '0');
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION OPACITY ENGINE – All text synced to original frames
  // ═══════════════════════════════════════════════════════════
  function clamp01(v) { return Math.min(Math.max(v, 0), 1); }
  function fadeIn(f, start, end) { return clamp01((f - start) / (end - start)); }
  function fadeOut(f, start, end) { return clamp01(1 - (f - start) / (end - start)); }

  function setOpacity(el, o) {
    if (!el) return;
    const val = o.toFixed(3);
    el.style.opacity = val;
    el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
    // Enable pointer events for clickable sections
    if (o > 0.3 && (el.querySelector('.cta-btn') || el.classList.contains('cta-btn'))) {
      el.style.pointerEvents = 'auto';
    } else if (!el.classList.contains('music-btn')) {
      el.style.pointerEvents = 'none';
    }
  }

  // Story paragraphs – 9 paragraphs across frames 40-102 (63 frames)
  const STORY_COUNT = 9;
  const STORY_START = 40;
  const STORY_END = 102;

  function updateAllSections() {
    const f = origFrame(Math.round(currentFrame)); // current original frame 1-indexed

    // Helpers for smooth transitions using fractional original frame
    // We use a fractional value based on VISIBLE index interpolation
    const visIdx = currentFrame;
    // Find exact fractional original frame by interpolation
    const lo = Math.floor(visIdx);
    const hi = Math.ceil(visIdx);
    const frac = visIdx - lo;
    const fLo = (lo >= 0 && lo < TOTAL_VISIBLE) ? VISIBLE_FRAMES[lo] : VISIBLE_FRAMES[0];
    const fHi = (hi >= 0 && hi < TOTAL_VISIBLE) ? VISIBLE_FRAMES[hi] : VISIBLE_FRAMES[TOTAL_VISIBLE - 1];
    const ff = fLo + (fHi - fLo) * frac; // fractional original frame

    // 1. Title 1: ARJUN & ANU – visible frames 1-17, fade out 17-18.2
    let o1 = 0;
    if (ff <= 17) o1 = 1;
    else if (ff < 18.2) o1 = fadeOut(ff, 17, 18.2);
    setOpacity(document.getElementById('title-1'), o1);

    // 2. Title 2: WE'RE GETTING MARRIED – fade in 18.6-21, hold 21-23, fade out 23-24.5
    let o2 = 0;
    if (ff >= 18.6 && ff <= 21) o2 = fadeIn(ff, 18.6, 21);
    else if (ff > 21 && ff <= 23) o2 = 1;
    else if (ff > 23 && ff < 24.5) o2 = fadeOut(ff, 23, 24.5);
    setOpacity(document.getElementById('title-2'), o2);

    // 3. Save The Date – fade in 23.5-24, hold 24-26, fade out 26-27
    let o3 = 0;
    if (ff >= 23.5 && ff < 24) o3 = fadeIn(ff, 23.5, 24);
    else if (ff >= 24 && ff <= 26) o3 = 1;
    else if (ff > 26 && ff < 27) o3 = fadeOut(ff, 26, 27);
    setOpacity(document.getElementById('save-date-1'), o3);

    // 4. Countdown – fade in 27-28, hold 28-30, fade out 30-31
    let o4 = 0;
    if (ff >= 27 && ff < 28) o4 = fadeIn(ff, 27, 28);
    else if (ff >= 28 && ff <= 30) o4 = 1;
    else if (ff > 30 && ff < 31) o4 = fadeOut(ff, 30, 31);
    setOpacity(document.getElementById('countdown'), o4);

    // 5. Save Button – fade in 32-33, hold 33-37, fade out 37-38
    let o5 = 0;
    if (ff >= 32 && ff < 33) o5 = fadeIn(ff, 32, 33);
    else if (ff >= 33 && ff <= 37) o5 = 1;
    else if (ff > 37 && ff < 38) o5 = fadeOut(ff, 37, 38);
    setOpacity(document.getElementById('save-btn-section'), o5);

    // 6. Love Story – container visible 39-103
    const storyEl = document.getElementById('love-story');
    let oStory = 0;
    if (ff >= 39 && ff < 40) oStory = fadeIn(ff, 39, 40);
    else if (ff >= 40 && ff <= 103) oStory = 1;
    else if (ff > 103 && ff < 105) oStory = fadeOut(ff, 103, 105);

    // Story title visibility
    const storyTitleEl = storyEl ? storyEl.querySelector('.story-title') : null;
    if (storyTitleEl) {
      let oST = 0;
      if (ff >= 39 && ff < 40) oST = fadeIn(ff, 39, 40);
      else if (ff >= 40 && ff <= 44) oST = 1;
      else if (ff > 44 && ff < 46) oST = fadeOut(ff, 44, 46);
      storyTitleEl.style.opacity = oST.toFixed(3);
    }

    setOpacity(storyEl, oStory);

    // Story paragraphs – progressive reveal
    const paragraphs = document.querySelectorAll('.story-p');
    const storyRange = STORY_END - STORY_START; // 62
    const paraWindow = storyRange / STORY_COUNT; // ~6.9 frames per paragraph

    paragraphs.forEach(function(p, idx) {
      const pStart = STORY_START + idx * paraWindow;
      const pFadeIn = pStart + 1.5;
      const pEnd = pStart + paraWindow;
      const pFadeOut = pEnd + 0.5;

      let op = 0;
      if (ff >= pStart && ff < pFadeIn) op = fadeIn(ff, pStart, pFadeIn);
      else if (ff >= pFadeIn && ff <= pEnd) op = 1;
      else if (ff > pEnd && ff < pFadeOut) op = fadeOut(ff, pEnd, pFadeOut);

      p.style.opacity = op.toFixed(3);
    });

    // 7. Bride – fade in 106.5-108, hold 108-109, fade out 109-109.8
    let o7 = 0;
    if (ff >= 106.5 && ff < 108) o7 = fadeIn(ff, 106.5, 108);
    else if (ff >= 108 && ff <= 109) o7 = 1;
    else if (ff > 109 && ff < 109.8) o7 = fadeOut(ff, 109, 109.8);
    setOpacity(document.getElementById('bride'), o7);

    // 8. Groom – fade in 109.5-110, hold 110-112, fade out 112-112.8
    let o8 = 0;
    if (ff >= 109.5 && ff < 110) o8 = fadeIn(ff, 109.5, 110);
    else if (ff >= 110 && ff <= 112) o8 = 1;
    else if (ff > 112 && ff < 112.8) o8 = fadeOut(ff, 112, 112.8);
    setOpacity(document.getElementById('groom'), o8);

    // 9. Holy Matrimony – fade in 187-188, hold 188-194, fade out 194-195
    const hmEl = document.getElementById('holy-matrimony');
    let o9 = 0;
    if (ff >= 187 && ff < 188) o9 = fadeIn(ff, 187, 188);
    else if (ff >= 188 && ff <= 194) o9 = 1;
    else if (ff > 194 && ff < 195) o9 = fadeOut(ff, 194, 195);
    setOpacity(hmEl, o9);
    // Blur background opacity for venue
    const hmBlur = hmEl ? hmEl.querySelector('.venue-bg-blur') : null;
    if (hmBlur) hmBlur.style.opacity = (o9 * 0.85).toFixed(3);

    // 10. Reception – fade in 194.5-195, hold 195-207, fade out 207-208
    const rcEl = document.getElementById('reception');
    let o10 = 0;
    if (ff >= 194.5 && ff < 195) o10 = fadeIn(ff, 194.5, 195);
    else if (ff >= 195 && ff <= 207) o10 = 1;
    else if (ff > 207 && ff < 208) o10 = fadeOut(ff, 207, 208);
    setOpacity(rcEl, o10);
    const rcBlur = rcEl ? rcEl.querySelector('.venue-bg-blur') : null;
    if (rcBlur) rcBlur.style.opacity = (o10 * 0.85).toFixed(3);

    // 11. Welcome Quote – fade in 207.5-208, hold 208-211, fade out 211-212
    let o11 = 0;
    if (ff >= 207.5 && ff < 208) o11 = fadeIn(ff, 207.5, 208);
    else if (ff >= 208 && ff <= 211) o11 = 1;
    else if (ff > 211 && ff < 212) o11 = fadeOut(ff, 211, 212);
    setOpacity(document.getElementById('welcome-quote'), o11);

    // 12. Final STD – fade in 211.5-212, hold 212-214
    let o12 = 0;
    if (ff >= 211.5 && ff < 212) o12 = fadeIn(ff, 211.5, 212);
    else if (ff >= 212 && ff <= 214) o12 = 1;
    setOpacity(document.getElementById('final-std'), o12);
  }

  // ═══════════════════════════════════════════════════════════
  //  MUSIC
  // ═══════════════════════════════════════════════════════════
  const audio = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-toggle');
  const iconOn = document.getElementById('music-icon-on');
  const iconOff = document.getElementById('music-icon-off');
  let musicPlaying = false;
  let userInteracted = false;

  function updateMusicIcon() {
    if (iconOn && iconOff) {
      iconOn.style.display = musicPlaying ? 'block' : 'none';
      iconOff.style.display = musicPlaying ? 'none' : 'block';
    }
  }

  function tryAutoplay() {
    if (!audio) return;
    audio.volume = 0.6;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(function() {
        musicPlaying = true;
        updateMusicIcon();
      }).catch(function() {
        musicPlaying = false;
        updateMusicIcon();
      });
    }
  }

  function startMusicOnInteraction() {
    if (userInteracted) return;
    userInteracted = true;
    if (audio && audio.paused) {
      audio.volume = 0.6;
      audio.play().then(function() {
        musicPlaying = true;
        updateMusicIcon();
      }).catch(function() {});
    }
  }

  if (musicBtn) {
    musicBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!audio) return;
      if (musicPlaying) {
        audio.pause();
        musicPlaying = false;
      } else {
        audio.volume = 0.6;
        audio.play().then(function() {
          musicPlaying = true;
        }).catch(function() {});
      }
      updateMusicIcon();
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  IMAGE PRELOADING
  // ═══════════════════════════════════════════════════════════
  function preloadImages() {
    for (let i = 0; i < TOTAL_VISIBLE; i++) {
      var orig = VISIBLE_FRAMES[i];
      var img = new Image();
      (function(o, im) {
        im.onload = function() {
          imageCache[o] = im;
          if (Math.round(currentFrame) === VISIBLE_FRAMES.indexOf(o) || (i === 0 && lastDrawnOrig === -1)) {
            lastDrawnOrig = -1;
            renderCanvas();
          }
        };
      })(orig, img);
      img.src = getFramePath(orig);
      imageCache[orig] = img;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  MAIN LOOP
  // ═══════════════════════════════════════════════════════════
  function tick() {
    var diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.001) {
      currentFrame += diff * LERP_FACTOR;
    } else {
      currentFrame = targetFrame;
    }
    renderCanvas();
    updateAllSections();
    requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    // Calendar links
    var calUrl = calendarURL();
    var calBtn1 = document.getElementById('save-cal-btn');
    var calBtn2 = document.getElementById('final-cal-btn');
    if (calBtn1) calBtn1.href = calUrl;
    if (calBtn2) calBtn2.href = calUrl;

    resizeCanvas();
    updateScroll(true);
    preloadImages();
    tickCountdown();
    setInterval(tickCountdown, 1000);
    updateAllSections();
    requestAnimationFrame(tick);

    // Try autoplay
    tryAutoplay();
    updateMusicIcon();

    // Start music on first user interaction if autoplay blocked
    document.addEventListener('click', startMusicOnInteraction, { once: true });
    document.addEventListener('scroll', startMusicOnInteraction, { once: true });
    document.addEventListener('touchstart', startMusicOnInteraction, { once: true });

    window.addEventListener('scroll', function() { updateScroll(false); }, { passive: true });

    window.addEventListener('resize', function() {
      resizeCanvas();
      updateScroll(false);
      lastDrawnOrig = -1;
      renderCanvas();
      updateAllSections();
    });

    window.addEventListener('orientationchange', function() {
      setTimeout(function() {
        resizeCanvas();
        updateScroll(false);
        lastDrawnOrig = -1;
        renderCanvas();
        updateAllSections();
      }, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
