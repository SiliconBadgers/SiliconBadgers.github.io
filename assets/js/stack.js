/* One-shot stack expansion. Natural document layout remains the fallback.
   On resize or motion preference changes, cancel cleanly into that layout. */
(() => {
  const stage = document.querySelector('.stack-stage');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!stage || motion.matches || !window.IntersectionObserver || !Element.prototype.animate) return;
  const items = [...stage.querySelectorAll('.stack-item')];
  let animations = [], timer, observer, done = false;
  const effectsToggle = document.querySelector('.effects-toggle');
  const width = stage.clientWidth;
  const scale = Math.min(1, width / 460);
  const startX = (width - 440 * scale) / 2;
  const poses = items.map((_, i) => `translate(${startX}px,${(40 + i * 83) * scale}px) scale(${scale})`);
  const stackPanel = 'matrix(.75,.38,-.75,.38,120,110)';
  const stackLabel = 'translate(295px,110px)';
  function clearInline() {
    items.forEach(item => {
      item.removeAttribute('style');
      item.querySelectorAll('.stack-panel,.stack-label,.stack-arrow,p').forEach(el => el.removeAttribute('style'));
      item.querySelector('text').setAttribute('text-anchor', 'middle');
    });
  }
  function finish() {
    done = true;
    clearTimeout(timer);
    observer?.disconnect();
    animations.forEach(a => a.cancel());
    stage.classList.remove('is-stacked');
    stage.style.height = '';
    clearInline();
    window.removeEventListener('resize', finish);
    motion.removeEventListener('change', finish);
    effectsToggle?.removeEventListener('click', finish);
  }
  stage.classList.add('is-stacked');
  stage.style.height = `${550 * scale}px`;
  items.forEach((item, i) => {
    item.style.transform = poses[i];
    item.querySelector('.stack-panel').style.transform = stackPanel;
    item.querySelector('.stack-label').style.transform = stackLabel;
    item.querySelector('text').setAttribute('text-anchor', 'start');
    item.querySelector('.stack-arrow').style.opacity = 1;
    item.querySelector('p').style.opacity = 0;
  });
  function expand() {
    if (done) return;
    const oldHeight = stage.getBoundingClientRect().height;
    stage.classList.remove('is-stacked');
    stage.style.height = '';
    clearInline();
    const bounds = stage.getBoundingClientRect();
    const positions = items.map(item => item.getBoundingClientRect());
    const animate = (el, frames, delay, duration = 1300) => {
      animations.push(el.animate(frames, {duration, delay, easing:'cubic-bezier(.22,1,.36,1)', fill:'backwards'}));
    };
    animate(stage, [{height:`${oldHeight}px`},{height:`${bounds.height}px`}], 0);
    items.forEach((item, i) => {
      const rect = positions[i];
      const factor = 240 * scale / rect.width;
      const x = startX - (rect.left - bounds.left);
      const y = (40 + i * 83) * scale - (rect.top - bounds.top);
      animate(item, [{transform:`translate(${x}px,${y}px) scale(${factor})`},{transform:'none'}], i * 100);
      animate(item.querySelector('.stack-panel'), [{transform:stackPanel},{transform:'matrix(.94,.12,-.12,.94,120,112)'}], i * 100);
      // Center the moving title at its former left-aligned label's midpoint.
      const labelWidth = item.querySelector('text').getComputedTextLength();
      animate(item.querySelector('.stack-label'), [{transform:`translate(${295 + labelWidth / 2}px,110px)`},{transform:'translate(120px,249px)'}], i * 100);
      animate(item.querySelector('.stack-arrow'), [{opacity:1},{opacity:0}], i * 100, 260);
      animate(item.querySelector('p'), [{opacity:0,transform:'translateY(12px)'},{opacity:.8,transform:'none'}], 1000 + i * 100, 500);
    });
    Promise.all(animations.map(a => a.finished)).then(finish).catch(() => {});
  }
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect();
      timer = setTimeout(expand, 900);
    }
  }, {threshold:.25});
  observer.observe(stage);
  window.addEventListener('resize', finish, {once:true});
  motion.addEventListener('change', finish, {once:true});
  // The site's Pause effects control also settles this one-shot animation.
  effectsToggle?.addEventListener('click', finish, {once:true});
})();
