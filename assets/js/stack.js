/* A 14-second conceptual inference loop. All motion shares one clock and
   pauses offscreen, in hidden tabs, and with the site's effects control. */
(() => {
  const section = document.querySelector('.inference');
  if (!section) return;
  const svg = section.querySelector('.inference-svg');
  const stage = section.querySelector('.inference-stage');
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 700px)');
  const get = name => section.querySelector(`.inference-${name}`);
  const computer = get('computer'), cpu = get('cpu'), packageEl = get('package');
  const lid = get('lid'), guides = get('lid-guides'), lidLettering = get('lid-lettering');
  const cpuCore = get('cpu-core'), cpuTrace = get('cpu-trace');
  const cpuHalo = get('cpu-halo'), packageHalo = get('package-halo');
  const memoryPacket = get('memory-packet');
  const prompt = get('prompt'), first = get('response-first'), last = get('response-last'), caret = get('caret');
  const phaseNumber = get('phase-number'), phaseText = get('phase-text'), progress = get('progress').firstElementChild;
  const cells = [...section.querySelectorAll('.inference-cell')];
  const banks = [...section.querySelectorAll('.inference-bank')];
  const packets = Object.fromEntries([...section.querySelectorAll('[data-packet]')].map(path => [path.dataset.packet, path]));
  const toggle = get('toggle'), replay = get('replay');
  const duration = 14000;
  const phases = [
    [0, 'A prompt arrives.'],
    [2, 'The CPU takes the lead.'],
    [3.6, 'A little help from our silicon.'],
    [10.8, 'The response comes together.'],
    [12.7, 'Ready for the next idea.']
  ];
  let elapsed = 0, lastTime = null, frame = 0, visible = false, paused = false, previousPhase = -1;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { const x = clamp(n); return x * x * (3 - 2 * x); };
  const windowLevel = (t, start, end, fade = .3) => ease((t - start) / fade) * (1 - ease((t - end) / fade));

  function layout() {
    svg.setAttribute('viewBox', narrow.matches ? '0 0 420 1080' : '0 0 1200 560');
    computer.setAttribute('transform', narrow.matches ? 'translate(104 205) scale(.9)' : 'translate(45 315)');
    cpu.setAttribute('transform', narrow.matches ? 'translate(210 530)' : 'translate(530 320)');
    packageEl.setAttribute('transform', narrow.matches ? 'translate(210 880) scale(.82)' : 'translate(955 320)');
    // Keep labels near each station and leave a clear route between stations.
    computer.querySelector('.inference-label').setAttribute('y', narrow.matches ? '108' : '178');
    computer.querySelector('.inference-sublabel').setAttribute('y', narrow.matches ? '133' : '203');
    cpu.querySelector('.inference-label').setAttribute('y', narrow.matches ? '106' : '173');
    cpu.querySelector('.inference-sublabel').setAttribute('y', narrow.matches ? '131' : '198');
    const packagePort = packageEl.querySelector('.inference-port');
    packagePort.setAttribute('cx', narrow.matches ? '234' : '-217');
    packagePort.setAttribute('cy', narrow.matches ? '14' : '-13');
    const routes = narrow.matches ? {
      prompt: 'M312 237H341V393L210 457V478',
      reply: 'M200 478V451L331 387V247H312',
      offload: 'M315 530H358L410 582V891H402',
      return: 'M402 901H418V578L364 524H315'
    } : {
      prompt: 'M276 350H328L362 320H425',
      reply: 'M425 330H366L332 360H276',
      offload: 'M635 320H668L695 293H721L738 307',
      return: 'M738 319H701L676 341H635'
    };
    for (const [name, d] of Object.entries(routes)) {
      section.querySelector(`[data-route="${name}"]`).setAttribute('d', d);
      packets[name].setAttribute('d', d);
    }
  }

  function pulse(name, t, starts, travel) {
    const path = packets[name];
    const start = starts.find(start => t >= start && t < start + travel);
    const position = start === undefined ? 0 : (t - start) / travel;
    path.style.opacity = start === undefined ? 0 : Math.min(1, position * 12, (1 - position) * 12);
    path.style.strokeDashoffset = String(-position * 100);
  }

  function render(milliseconds) {
    const t = milliseconds / 1000;
    const fade = 1 - ease((t - 13.45) / .55);
    const activity = Math.max(windowLevel(t, 3.9, 6.2), windowLevel(t, 6.9, 8.7), windowLevel(t, 9.5, 10.9));
    const host = windowLevel(t, 1.9, 11.7, .45);
    const lift = ease((t - 3.1) / 1.3) * (1 - ease((t - 12.15) / 1.25));
    lid.setAttribute('transform', `translate(0 ${(-82 * lift).toFixed(2)})`);
    guides.style.opacity = lift;
    guides.firstElementChild.setAttribute('d', `M-29 ${-114-82*lift}V-114M234 ${14-82*lift}V14M29 ${114-82*lift}V114M-234 ${-14-82*lift}V-14`);
    // Hide the lettering before opening; restore it only after the lid closes.
    lidLettering.style.opacity = 1 - ease((t - 2.85) / .25) + ease((t - 13.4) / .3);
    cpuCore.style.fillOpacity = .2 + host * (.12 + .08 * Math.sin(t * 5));
    cpuHalo.style.opacity = .2 + host * .8;
    packageHalo.style.opacity = .15 + activity * .85;
    cpuTrace.style.opacity = host * .8;
    cpuTrace.style.strokeDashoffset = String(-((t * 42) % 100));
    cells.forEach(cell => {
      const wave = (t * 6 - Number(cell.dataset.wave) + 40) % 10;
      const bright = Math.max(0, 1 - Math.abs(wave - 5) / 2.2);
      cell.style.fillOpacity = .07 + activity * (.08 + bright * .72);
      cell.style.strokeOpacity = .25 + activity * bright * .6;
    });
    banks.forEach((bank, i) => {
      const bright = Math.pow((Math.sin(t * 7 - i * .85) + 1) / 2, 3);
      bank.style.fillOpacity = .08 + activity * (.06 + bright * .65);
    });
    memoryPacket.style.opacity = activity * .9;
    memoryPacket.style.strokeDashoffset = String(-((t * 100) % 100));
    pulse('prompt', t, [1.55], .8);
    pulse('offload', t, [3.25, 6.3, 9.0], .75);
    pulse('return', t, [5.85, 8.3, 10.6], .7);
    pulse('reply', t, [6.55, 9.0, 11.3], .65);
    const typed = Math.floor(clamp((t - .25) / 1.2) * 10);
    prompt.textContent = '> ' + 'Say hello.'.slice(0, typed);
    prompt.style.opacity = fade;
    first.textContent = t >= 7.2 ? 'Hello,' : '';
    last.textContent = t >= 11.95 ? 'SiliconBadgers.' : t >= 9.65 ? 'Silicon' : '';
    first.style.opacity = last.style.opacity = fade;
    caret.setAttribute('transform', `translate(${(typed + 2) * 9} 0)`);
    caret.style.opacity = t < 1.6 && Math.floor(t * 3) % 2 === 0 ? 1 : 0;
    const phase = phases.findLastIndex(([start]) => t >= start);
    if (phase !== previousPhase) {
      phaseNumber.textContent = `0${phase + 1} /`;
      phaseText.textContent = phases[phase][1];
      section.dataset.phase = String(phase + 1);
      previousPhase = phase;
    }
    progress.style.transform = `scaleX(${milliseconds / duration})`;
  }

  function shouldRun() {
    return visible && !paused && !document.hidden && !reducedMotion.matches && !root.classList.contains('effects-paused');
  }
  function tick(now) {
    if (!shouldRun()) { frame = 0; lastTime = null; return; }
    if (lastTime !== null) elapsed = (elapsed + now - lastTime) % duration;
    lastTime = now;
    render(elapsed);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
    const sitePaused = root.classList.contains('effects-paused');
    get('controls').hidden = reducedMotion.matches;
    toggle.disabled = sitePaused;
    toggle.setAttribute('aria-pressed', String(paused || sitePaused));
    toggle.setAttribute('aria-label', paused ? 'Play the animation' : 'Pause the animation');
    toggle.querySelector('span').textContent = sitePaused ? 'Paused' : paused ? 'Play' : 'Pause';
    toggle.querySelector('path').setAttribute('d', paused ? 'M5 3l8 5-8 5Z' : 'M5 3v10M11 3v10');
    if (reducedMotion.matches) {
      render(12000);
      phaseNumber.textContent = '';
      phaseText.textContent = 'The CPU leads. Our silicon accelerates.';
      previousPhase = -1;
    } else if (shouldRun()) {
      frame = requestAnimationFrame(tick);
    }
  }
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  replay.addEventListener('click', () => { elapsed = 0; paused = false; render(0); sync(); });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  narrow.addEventListener('change', layout);
  new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['class']});
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .1;
      sync();
    }, {threshold:[0, .1]}).observe(stage);
  } else {
    visible = true;
  }
  layout();
  render(0);
  sync();
})();
