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
  let pulseRoutes = [];
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

  // Centerlines sampled from the actual 840 × 840 circuit.webp tile.
  // Coordinates stay in source pixels; repeat and scale with the CSS background.
  const tracePaths = [
    [[422,175],[422,279],[480,338],[497,339],[506,348],[506,390],[532,414],[536,415]],
    [[411,494],[414,496],[415,576],[401,591],[400,665],[438,703],[437,792],[472,827],[472,838]],
    [[479,531],[457,552],[456,577],[440,594],[440,630],[479,669],[479,755],[525,802],[525,839]],
    [[273,472],[355,472],[395,512],[396,568],[394,572],[386,580],[386,650]],
    [[603,176],[651,177],[669,195],[679,208],[725,253],[800,252],[839,214]],
    [[181,424],[204,401],[210,400],[266,400],[274,408],[322,408],[342,389],[342,362]],
    [[309,737],[343,703],[344,641],[358,627],[359,624],[359,525]],
    [[570,1],[570,39],[536,71],[536,147],[586,196],[619,196]],
    [[280,736],[321,694],[320,631],[343,608],[343,525]],
    [[422,114],[445,137],[444,267],[457,280],[463,284],[468,283],[477,290],[511,290]],
    [[16,348],[46,318],[78,317],[86,308],[86,247],[143,191],[173,191]]
  ];

  function resize(){
    if(!context) return;
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width*ratio);
    canvas.height = Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    const background = document.querySelector('.circuit-bg');
    const tileSize = background ? parseFloat(getComputedStyle(background).backgroundSize) : 420;
    const scale = (tileSize || 420) / 840;
    const tile = 840 * scale;
    routes = [];
    pulseRoutes = [];
    for(let row=0; row*tile<height; row++){
      for(let column=0; column*tile<width; column++){
        const base = (column*3 + row*5) % tracePaths.length;
        const smallIndices = [base,(base+4)%tracePaths.length];
        for(let slot=0; slot<smallIndices.length; slot++){
          const index = smallIndices[slot];
          let points = tracePaths[index].map(([x,y]) => [column*tile+x*scale,row*tile+y*scale]);
          if(!points.some(([x,y]) => x>=0 && x<width && y>=0 && y<height)) continue;
          if((column+row+slot)%2) points.reverse();
          let length=0;
          const segments = points.slice(1).map((point,j) => {
            const start = points[j];
            const size = Math.hypot(point[0]-start[0],point[1]-start[1]);
            const segment = {start,point,size,offset:length};
            length += size;
            return segment;
          });
          const route = {segments,length,speed:24+(index%4)*4,phase:((column*7+row*11+slot*13)*.137)%1};
          routes.push(route);
        }
      }
    }

    // Continuous, visible traces for the larger edge-to-edge charges. The raster
    // tile's short traces cannot carry a pulse across the entire viewport.
    const margin=244;
    pulseRoutes=Array.from({length:4},(_,index) => {
      const y=height*(.16+index*.21);
      const bend=Math.min(60,height*.045)*(index%2?-1:1);
      const points=[[-margin,y],[width*.22,y],[width*.22+Math.abs(bend),y+bend],
        [width*.68,y+bend],[width*.68+Math.abs(bend),y+2*bend],[width+margin,y+2*bend]];
      if(index%2) points.reverse();
      let length=0;
      const segments=points.slice(1).map((point,i) => {
        const start=points[i],size=Math.hypot(point[0]-start[0],point[1]-start[1]);
        const segment={start,point,size,offset:length};
        length+=size;
        return segment;
      });
      return {segments,length};
    });
  }
  function pointAt(route,distance){
    const segment=route.segments.find(part => distance <= part.offset+part.size) || route.segments[route.segments.length-1];
    const t=Math.max(0,Math.min(1,(distance-segment.offset)/segment.size));
    return [segment.start[0]+(segment.point[0]-segment.start[0])*t,
      segment.start[1]+(segment.point[1]-segment.start[1])*t];
  }
  function drawCharge(route,distance,large=false){
    const tailLength=large?220:32;
    context.globalAlpha=large
      ? Math.min(1,distance/18,(route.length+tailLength-distance)/28)
      : Math.min(1,distance/14,(route.length-distance)/14);
    const steps=large?44:8, step=tailLength/steps;
    for(let tail=steps-1;tail>=0;tail--){
      const end=Math.min(route.length,distance-tail*step);
      const start=Math.max(0,distance-(tail+1)*step);
      if(end<=start) continue;
      context.beginPath();
      // Split each tail stroke at every bend; never draw a chord across a corner.
      route.segments.forEach(segment => {
        const from=Math.max(start,segment.offset), to=Math.min(end,segment.offset+segment.size);
        if(to<=from) return;
        const a=pointAt(route,from), b=pointAt(route,to);
        context.moveTo(a[0],a[1]);context.lineTo(b[0],b[1]);
      });
      const strength=(steps-tail)/steps;
      if(large){
        context.strokeStyle='rgba(255,48,35,'+(strength*.85)+')';
        context.lineWidth=5;context.shadowColor='#ff3024';context.shadowBlur=14;
        context.stroke();context.shadowBlur=0;
        context.strokeStyle='rgba(255,204,157,'+strength+')';
        context.lineWidth=2.2;context.stroke();
      }else{
        context.strokeStyle='rgba(255,85,75,'+(strength*.8)+')';
        context.lineWidth=1.65;context.stroke();
      }
    }
    // Let the long tail drain off the trace after its head has passed the endpoint.
    if(distance<=route.length){
      const head=pointAt(route,distance);
      context.beginPath();context.arc(head[0],head[1],large?4.8:2,0,Math.PI*2);
      context.fillStyle=large?'#fff1d5':'#ffd0bd';context.shadowColor='#ff3830';context.shadowBlur=large?24:12;
      context.fill();context.shadowBlur=0;
    }
  }

  function paint(now){
    if(!enabled() || !context){frame=0;return;}
    frame=requestAnimationFrame(paint);
    if(lastPaint && now-lastPaint < 1000/30) return;
    clock += lastPaint ? Math.min(now-lastPaint,80)/1000 : 0;
    lastPaint=now;
    context.clearRect(0,0,width,height);
    context.lineCap='round';
    // Keep the large charges on visible continuous traces, behind the small ones.
    context.lineJoin='round';
    context.strokeStyle='rgba(170,32,32,.25)';context.lineWidth=.8;
    pulseRoutes.forEach(route => {
      context.beginPath();
      const first=route.segments[0].start;
      context.moveTo(first[0],first[1]);
      route.segments.forEach(segment => context.lineTo(segment.point[0],segment.point[1]));
      context.stroke();
    });
    // Launch once a second. Each pass lasts 3.2s and starts/ends far enough
    // outside the viewport for the complete 220px tail to enter and leave.
    const pulseInterval=1, pulseDuration=3.2;
    const cycle=Math.floor(clock/pulseInterval);
    for(let previous=3;previous>=0;previous--){
      const launch=cycle-previous;
      if(launch<0) continue;
      const age=clock-launch*pulseInterval;
      if(age>=pulseDuration) continue;
      const route=pulseRoutes[launch%pulseRoutes.length];
      drawCharge(route,route.length*age/pulseDuration,true);
    }
    routes.forEach(route => {
      const distance=(clock*route.speed+route.phase*(route.length+90))%(route.length+90);
      if(distance>route.length) return;
      drawCharge(route,distance);
    });
    context.globalAlpha=1;
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

