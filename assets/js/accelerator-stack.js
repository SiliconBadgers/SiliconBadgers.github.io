/* Restore the original stack-to-blocks expansion below the inference scene.
   The natural grid is the no-JS/reduced-motion fallback. */
(async () => {
  const section = document.querySelector('.accelerator-stack');
  if (!section) return;
  const stage = section.querySelector('.stack-stage');
  const replay = section.querySelector('.accelerator-stack-replay');
  const items = [...stage.querySelectorAll('.stack-item')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  if (!window.IntersectionObserver || !Element.prototype.animate) return;
  await document.fonts?.ready;
  let animations = [], timer, observer, generation = 0;
  const panelPose = 'matrix(.75,.38,-.75,.38,120,110)';
  const labelPose = 'translate(295px,110px)';
  const allowed = () => !motion.matches && !root.classList.contains('effects-paused');

  function clearInline() {
    items.forEach(item => {
      item.removeAttribute('style');
      item.querySelectorAll('.stack-panel,.stack-label,.stack-arrow').forEach(el => el.removeAttribute('style'));
      item.querySelector('text').setAttribute('text-anchor', 'middle');
    });
  }
  function settle() {
    generation++;
    clearTimeout(timer);
    observer?.disconnect();
    animations.forEach(animation => animation.cancel());
    animations = [];
    stage.classList.remove('is-stacked', 'is-expanding');
    stage.style.height = '';
    clearInline();
  }
  function prepareStack() {
    settle();
    if (!allowed()) return;
    const run = generation;
    const width = stage.clientWidth;
    // Account for the longer controller labels before centering the stack.
    const labelWidth = Math.max(...items.map(item => item.querySelector('text').getComputedTextLength()));
    const contentWidth = 295 + labelWidth + 12;
    const scale = Math.min(1, width / contentWidth);
    const startX = (width - contentWidth * scale) / 2;
    const poses = items.map((_, i) => `translate(${startX}px,${(40 + i * 83) * scale}px) scale(${scale})`);
    stage.classList.add('is-stacked');
    stage.style.height = `${550 * scale}px`;
    items.forEach((item, i) => {
      item.style.transform = poses[i];
      item.querySelector('.stack-panel').style.transform = panelPose;
      item.querySelector('.stack-label').style.transform = labelPose;
      item.querySelector('text').setAttribute('text-anchor', 'start');
      item.querySelector('.stack-arrow').style.opacity = 1;
    });

    function expand() {
      if (run !== generation || !allowed()) return;
      observer?.disconnect();
      const oldHeight = stage.getBoundingClientRect().height;
      stage.classList.replace('is-stacked', 'is-expanding');
      stage.style.height = '';
      clearInline();
      const bounds = stage.getBoundingClientRect();
      const positions = items.map(item => item.getBoundingClientRect());
      const animate = (el, frames, delay, duration = 1300) => {
        animations.push(el.animate(frames, {duration, delay, easing:'cubic-bezier(.22,1,.36,1)', fill:'backwards'}));
      };
      animate(stage, [{height:`${oldHeight}px`}, {height:`${bounds.height}px`}], 0);
      items.forEach((item, i) => {
        const rect = positions[i];
        const factor = 240 * scale / rect.width;
        const x = startX - (rect.left - bounds.left);
        const y = (40 + i * 83) * scale - (rect.top - bounds.top);
        animate(item, [{transform:`translate(${x}px,${y}px) scale(${factor})`}, {transform:'none'}], i * 100);
        animate(item.querySelector('.stack-panel'), [{transform:panelPose}, {transform:'matrix(.94,.12,-.12,.94,120,112)'}], i * 100);
        const titleWidth = item.querySelector('text').getComputedTextLength();
        animate(item.querySelector('.stack-label'), [{transform:`translate(${295 + titleWidth / 2}px,110px)`}, {transform:'translate(120px,249px)'}], i * 100);
        animate(item.querySelector('.stack-arrow'), [{opacity:1}, {opacity:0}], i * 100, 260);
      });
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (run === generation) settle();
      }).catch(() => {});
    }
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25)) {
        clearTimeout(timer);
        timer = setTimeout(expand, 1600);
      } else {
        clearTimeout(timer);
      }
    }, {threshold:[0, .25]});
    observer.observe(stage);
  }
  function sync() {
    replay.hidden = !allowed();
    if (!allowed()) settle();
  }
  replay.addEventListener('click', prepareStack);
  window.addEventListener('resize', settle, {passive:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  motion.addEventListener('change', sync);
  new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['class']});
  sync();
  if (allowed()) prepareStack();
})();
