/* Small, content-specific logo and skill interactions. */
(() => {
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const paused=()=>document.documentElement.classList.contains('effects-paused');
  const logo=document.querySelector('.logo-power-on');
  if(logo){
    const settle=()=>logo.classList.add('is-powered');
    logo.addEventListener('animationend',event=>{
      if(event.animationName==='chip-power-on') settle();
    });
    document.querySelector('.effects-toggle')?.addEventListener('click',settle,{once:true});
    motion.addEventListener('change',()=>{if(motion.matches) settle();});
  }
  document.querySelectorAll('.skill-row').forEach(row => {
    const button=row.querySelector('.schematic-demo');
    function demonstrate(){
      row.classList.remove('is-demonstrating');
      // Restart a finite demonstration on repeat activation.
      if(!motion.matches && !paused()) void row.offsetWidth;
      row.classList.add('is-demonstrating');
    }
    row.addEventListener('pointerenter',event => {
      if(event.pointerType!=='touch' && !paused()) demonstrate();
    });
    button.addEventListener('focus',demonstrate);
    button.addEventListener('click',demonstrate);
  });

})();
