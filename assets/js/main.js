/* ==========================================================================
   SiliconBadgers — page behaviour
   ==========================================================================
   Loaded with `defer`, so the DOM is fully parsed before any of this runs.

   Note: the one script that is NOT in this file is the `js-reveal` class
   toggle in <head>. That has to run before first paint, so it stays inline.
   ========================================================================== */

/* Add depth and moving signal packets to the original circuit design. */
// Preserve links shared before the homepage was split into separate pages.
(function(){
  if(!/(?:^|\/)index\.html$/.test(location.pathname) && !location.pathname.endsWith('/')) return;
  const pages = {
    announcements:'announcements.html',about:'about.html',skills:'skills.html',
    sponsors:'sponsors.html',leadership:'leadership.html',faq:'faq.html',signup:'join.html'
  };
  function followLegacyLink(){
    const destination = pages[location.hash.slice(1)];
    if(destination) location.replace(destination + location.hash);
  }
  window.addEventListener('hashchange',followLegacyLink);
  followLegacyLink();
})();

(function(){
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const toggle = document.querySelector('.effects-toggle');
  const canvas = document.querySelector('.circuit-signals');
  const context = canvas && canvas.getContext('2d');
  let paused = false;
  let frame = 0;
  let lastPaint = 0;
  let clock = 0;
  let width = 0;
  let height = 0;
  let routes = [];
  const animatedSurfaces = document.querySelectorAll('.logo-wrap,.skill-card,.lead-card,.sponsor-feature');
  function enabled(){ return !paused && !preference.matches && !document.hidden; }

  animatedSurfaces.forEach(element => {
    let pointerFrame = 0;
    const isLogo = element.classList.contains('logo-wrap');
    function reset(){
      cancelAnimationFrame(pointerFrame);
      ['--tilt-x','--tilt-y','--card-x','--card-y','--card-mx','--card-my'].forEach(name => element.style.removeProperty(name));
    }
    element.addEventListener('pointermove', event => {
      if(!enabled() || !finePointer.matches || event.pointerType !== 'mouse') return;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        if(!enabled()) return;
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const amount = isLogo ? 12 : 5;
        element.style.setProperty(isLogo ? '--tilt-x' : '--card-x', ((.5-y)*amount)+'deg');
        element.style.setProperty(isLogo ? '--tilt-y' : '--card-y', ((x-.5)*amount)+'deg');
        element.style.setProperty('--card-mx', x*100+'%');
        element.style.setProperty('--card-my', y*100+'%');
      });
    }, {passive:true});
    element.addEventListener('pointerleave', reset);
    preference.addEventListener('change', reset);
    if(toggle) toggle.addEventListener('click', reset);
  });

  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('pointerdown', event => {
      if(!enabled()) return;
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'button-ripple';
      ripple.setAttribute('aria-hidden','true');
      ripple.style.left = (event.clientX-rect.left)+'px';
      ripple.style.top = (event.clientY-rect.top)+'px';
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    }, {passive:true});
  });

  function resize(){
    if(!context) return;
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width*ratio);
    canvas.height = Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    // Right-angle traces, with staggered packet speeds rather than random flicker.
    routes = Array.from({length:width < 700 ? 6 : 10}, (_,i) => {
      const y = height * ((i+.5)/(width < 700 ? 6 : 10));
      const bend = (i%2 ? 1 : -1) * (34+(i%3)*18);
      let points = [[-60,y],[width*.23,y],[width*.23+bend,y+bend],
        [width*.67,y+bend],[width*.67+Math.abs(bend),y],[width+60,y]];
      if(i%2) points.reverse();
      let length=0;
      const segments = points.slice(1).map((point,j) => {
        const start = points[j];
        const size = Math.hypot(point[0]-start[0],point[1]-start[1]);
        const segment = {start,point,size,offset:length};
        length += size;
        return segment;
      });
      return {points,segments,length,speed:28+i*4,phase:i*.137};
    });
  }
  function pointAt(route,distance){
    const segment=route.segments.find(part => distance <= part.offset+part.size) || route.segments[route.segments.length-1];
    const t=Math.max(0,Math.min(1,(distance-segment.offset)/segment.size));
    return [segment.start[0]+(segment.point[0]-segment.start[0])*t,
      segment.start[1]+(segment.point[1]-segment.start[1])*t];
  }
  function paint(now){
    if(!enabled() || !context){frame=0;return;}
    frame=requestAnimationFrame(paint);
    if(lastPaint && now-lastPaint < 1000/30) return;
    clock += lastPaint ? Math.min(now-lastPaint,80)/1000 : 0;
    lastPaint=now;
    context.clearRect(0,0,width,height);
    routes.forEach(route => {
      const distance=(clock*route.speed+route.phase*route.length)%route.length;
      for(let tail=8;tail>=0;tail--){
        const end=distance-tail*5;
        if(end<0) continue;
        const a=pointAt(route,Math.max(0,end-5)), b=pointAt(route,end);
        context.beginPath();context.moveTo(a[0],a[1]);context.lineTo(b[0],b[1]);
        context.strokeStyle='rgba(255,65,65,'+((9-tail)/14)+')';
        context.lineWidth=1.5;context.stroke();
      }
      const head=pointAt(route,distance);
      context.beginPath();context.arc(head[0],head[1],1.7,0,Math.PI*2);
      context.fillStyle='#ffb4a7';context.shadowColor='#ff2424';context.shadowBlur=10;
      context.fill();context.shadowBlur=0;
    });
  }
  function sync(){
    cancelAnimationFrame(frame); frame=0; lastPaint=0;
    if(enabled() && context) frame=requestAnimationFrame(paint);
    else if(preference.matches && context) context.clearRect(0,0,width,height);
  }
  if(toggle){
    toggle.hidden=false;
    toggle.addEventListener('click', () => {
      paused=!paused;
      root.classList.toggle('effects-paused',paused);
      toggle.setAttribute('aria-pressed',String(paused));
      toggle.textContent=paused?'Resume effects':'Pause effects';
      sync();
    });
  }
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',sync);
  preference.addEventListener('change',sync);
  resize();sync();
})();


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
// The manual visibility check above is the fallback; offscreen sections reveal on arrival.


/* --------------------------------------------------------------------------
   Cursor-reactive circuit glow
   -------------------------------------------------------------------------- */
(function(){
  const root = document.documentElement;
  const logoWrap = document.querySelector('.logo-wrap');
  const headerEl = document.querySelector('header');
  const circuitGlowEl = document.querySelector('.circuit-glow');
  const glowEls = Array.from(document.querySelectorAll(
    '.why-card, .lead-card, .news-card, .signup, footer'
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
    if(document.documentElement.classList.contains("effects-paused") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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


/* --------------------------------------------------------------------------
   Contact form -> Cloudflare Worker -> Slack
   --------------------------------------------------------------------------
   Posts to a small Cloudflare Worker (source lives in
   /cloudflare-worker-contact-relay.js at the repo root) which forwards the
   message to Slack server-side. This keeps the Slack webhook URL out of the
   site's public JS entirely, and lets us read a real success/failure
   response back, instead of the no-cors "hope it worked" approach.
   -------------------------------------------------------------------------- */
(function(){
  const CONTACT_ENDPOINT = "https://plain-math-263a.siliconbadgers.workers.dev";

  const form = document.getElementById('contactForm');
  if(!form) return;
  const statusEl = document.getElementById('contactStatus');
  const submitBtn = document.getElementById('contactSubmit');

  form.addEventListener('submit', async function(e){
    e.preventDefault();

    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    if(!name || !email || !message) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    statusEl.textContent = "";
    statusEl.className = "form-status";

    try{
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });
      if(!res.ok) throw new Error("Bad response: " + res.status);
      form.reset();
      statusEl.textContent = "Sent! Thanks for reaching out.";
      statusEl.className = "form-status success";
    }catch(err){
      statusEl.textContent = "Something went wrong -- please try again or email us directly.";
      statusEl.className = "form-status error";
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = "Send";
    }
  });
})();
