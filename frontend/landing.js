window.addEventListener('scroll',()=>{
  document.querySelector('nav').style.boxShadow=
    window.scrollY>10?'0 1px 12px rgba(0,0,0,.06)':'none';
});
const obs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')});
},{threshold:0.07});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));