/* Optional motion effects; core navigation and cursor glow load independently. */
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

