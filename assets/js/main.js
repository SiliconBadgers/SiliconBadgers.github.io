/* ==========================================================================
   Silicon Badgers — page behaviour
   ==========================================================================
   Loaded with `defer`, so the DOM is fully parsed before any of this runs.

   Note: the one script that is NOT in this file is the `js-reveal` class
   toggle in <head>. That has to run before first paint, so it stays inline.
   ========================================================================== */


/* --------------------------------------------------------------------------
   FAQ accordion — opening one item closes the others.
   -------------------------------------------------------------------------- */
document.querySelectorAll('.faq-item').forEach(item=>{
  item.querySelector('.faq-q').addEventListener('click',()=>{
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i=>i.classList.remove('open'));
    if(!wasOpen) item.classList.add('open');
  });
});


/* --------------------------------------------------------------------------
   Scroll progress bar
   -------------------------------------------------------------------------- */
const progressBar = document.getElementById('scrollProgress');
function updateProgress(){
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, {passive:true});
updateProgress();


/* --------------------------------------------------------------------------
   Scroll reveal
   -------------------------------------------------------------------------- */
const revealEls = Array.from(document.querySelectorAll('.reveal, .reveal-stagger'));

function revealAllNow(){
  revealEls.forEach(el=>el.classList.add('in-view'));
}

function checkRevealManually(){
  const vh = window.innerHeight || document.documentElement.clientHeight;
  revealEls.forEach(el=>{
    if(el.classList.contains('in-view')) return;
    const rect = el.getBoundingClientRect();
    if(rect.top < vh - 60 && rect.bottom > 0){
      el.classList.add('in-view');
    }
  });
}

if('IntersectionObserver' in window){
  try{
    const revealObserver = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {threshold:0.12, rootMargin:'0px 0px -60px 0px'});
    revealEls.forEach(el=>revealObserver.observe(el));
  }catch(e){
    revealAllNow();
  }
} else {
  revealAllNow();
}

// belt-and-suspenders: some in-app/webview browsers don't fire
// IntersectionObserver reliably (e.g. custom scroll containers), so also
// check manually on scroll/resize, and force everything visible after a
// short delay no matter what, so content is never stuck invisible.
window.addEventListener('scroll', checkRevealManually, {passive:true});
window.addEventListener('resize', checkRevealManually, {passive:true});
checkRevealManually();
setTimeout(checkRevealManually, 500);
setTimeout(revealAllNow, 1800);


/* --------------------------------------------------------------------------
   Cursor-reactive circuit glow
   -------------------------------------------------------------------------- */
(function(){
  const root = document.documentElement;
  const logoWrap = document.querySelector('.logo-wrap');
  const headerEl = document.querySelector('header');
  const circuitGlowEl = document.querySelector('.circuit-glow');
  const glowEls = Array.from(document.querySelectorAll(
    '.why-card, .lead-card, .signup, footer'
  ));
  let raf = null;

  function distToRect(x, y, rect){
    const cx = Math.max(rect.left, Math.min(x, rect.right));
    const cy = Math.max(rect.top, Math.min(y, rect.bottom));
    return Math.hypot(x - cx, y - cy);
  }

  function updateLogoFade(x, y){
    if(!logoWrap) return;
    const rect = logoWrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(x - cx, y - cy);
    const radius = rect.width * 1.1;
    const reveal = Math.max(0, Math.min(1, 1 - dist / radius));
    const fade = 0.97 - reveal * 0.87;
    logoWrap.style.setProperty('--logo-fade', fade.toFixed(3));
  }

  function updateHeaderFade(x, y){
    if(!headerEl) return;
    const rect = headerEl.getBoundingClientRect();
    const dist = distToRect(x, y, rect);
    const radius = 320;
    const reveal = Math.max(0, Math.min(1, 1 - dist / radius));
    const fade = 0.92 - reveal * 0.8;
    headerEl.style.setProperty('--header-fade', fade.toFixed(3));
  }

  function updateGlowSurfaces(x, y){
    glowEls.forEach((el)=>{
      const rect = el.getBoundingClientRect();
      if(rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const dist = distToRect(x, y, rect);
      const radius = Math.max(rect.width, rect.height) * 0.7 + 60;
      const reveal = Math.max(0, Math.min(1, 1 - dist / radius));
      const fade = 0.94 - reveal * 0.82;
      el.style.setProperty('--glow-fade', fade.toFixed(3));
    });
  }

  function setPos(x, y){
    root.style.setProperty('--mx', x + 'px');
    root.style.setProperty('--my', y + 'px');
    updateLogoFade(x, y);
    updateHeaderFade(x, y);
    updateGlowSurfaces(x, y);
  }
  window.addEventListener('mousemove', (e)=>{
    if(raf) return;
    raf = requestAnimationFrame(()=>{
      setPos(e.clientX, e.clientY);
      raf = null;
    });
  }, {passive:true});

  function handleTouch(e){
    if(e.touches && e.touches[0]){
      if(raf) return;
      raf = requestAnimationFrame(()=>{
        setPos(e.touches[0].clientX, e.touches[0].clientY);
        raf = null;
      });
    }
  }
  // touchstart so a single tap lights things up immediately, not just dragging
  window.addEventListener('touchstart', handleTouch, {passive:true});
  window.addEventListener('touchmove', handleTouch, {passive:true});

  // touch has no persistent "hover" like a mouse, so ease everything back
  // to its resting dark state a moment after the finger lifts
  function releaseGlow(){
    if(logoWrap) logoWrap.style.removeProperty('--logo-fade');
    if(headerEl) headerEl.style.removeProperty('--header-fade');
    glowEls.forEach(el=>el.style.removeProperty('--glow-fade'));
    // the cursor-follow spotlight on the background has no "mouse left
    // the window" equivalent on touch, so fade it out by hand once the
    // finger lifts, instead of leaving a lit spot stuck in place forever
    if(circuitGlowEl) circuitGlowEl.style.opacity = '0';
  }
  window.addEventListener('touchend', releaseGlow, {passive:true});
  window.addEventListener('touchcancel', releaseGlow, {passive:true});
  window.addEventListener('touchstart', ()=>{
    if(circuitGlowEl) circuitGlowEl.style.opacity = '';
  }, {passive:true});
})();


/* --------------------------------------------------------------------------
   Mobile nav
   --------------------------------------------------------------------------
   The open/close itself works with plain CSS via the hidden checkbox
   (#navCheck) and :checked, so the menu functions even if this never runs.
   This just adds the nicety of auto-closing the menu after tapping a link.
   -------------------------------------------------------------------------- */
(function(){
  const check = document.getElementById('navCheck');
  const links = document.getElementById('navLinks');
  if(!check || !links) return;
  links.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=>{ check.checked = false; });
  });
})();
