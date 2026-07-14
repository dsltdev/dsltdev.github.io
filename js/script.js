/* ═══════════════════════════════════════════════════════════
   dsltdev — Script
   ═══════════════════════════════════════════════════════════ */

/* ── i18n Strings ───────────────────────────────────────── */
const S = {
  en: {
    'nav.about':'About','nav.process':'Process','nav.projects':'Projects',
    'nav.contact':'Contact','nav.avail':'Available',
    'hero.tag':'Colombia · Remote worldwide',
    'hero.l1':'David Lopez','hero.l2':'turns ideas',
    'hero.sub':'I take your idea from a sketch to a live product — clean, fast, and ready for real users. No jargon, no delays, no surprises.',
    'hero.cta1':'Start a project','hero.cta2':'See my work',
    'hero.badge':'Open to work','hero.role':'software developer','hero.scroll':'Scroll to explore',
    'stat.a':'Projects delivered','stat.b':'Avg. days to launch',
    'stat.c':'On-time delivery','stat.d':'Countries served',
    'about.ey':'about',
    'about.h':'Your idea deserves<br>to look <em>world-class.</em>',
    'about.p1':"I build digital products that feel expensive — because the details matter. From the first pixel to the last line of code, everything has a reason to be there.",
    'about.p2':'Based in Colombia. Working with founders, agencies, and companies worldwide. I speak fluent Spanish and English.',
    'about.svc-ey':'what I do',
    'svc.a.n':'Landing Pages','svc.a.d':'That convert visitors into clients. Fast, beautiful, mobile-perfect.',
    'svc.b.n':'Web Applications','svc.b.d':"Full products your users won't want to stop using.",
    'svc.c.n':'E-commerce','svc.c.d':'Stores built to sell. Clean checkout, zero friction.',
    'svc.d.n':'Brand & Design','svc.d.d':'Your visual identity, sharp and consistent across every touchpoint.',
    'svc.e.n':'APIs & Integrations','svc.e.d':"Connect your tools. Automate what wastes your team's time.",
    'svc.f.n':'Consulting','svc.f.d':"Not sure where to start? I'll map the best path and build it.",
    'proc.ey':'how it works',
    'proc.h':'Simple for you.<br><em>Precise</em> from my side.',
    'proc.a.t':'We talk',
    'proc.a.d':"Tell me your idea. I'll tell you exactly what's possible, how long it takes, and what it costs. Free call, no commitment.",
    'proc.b.t':'I build',
    'proc.b.d':"You see real progress every day. No black boxes. No \"it'll be ready when it's ready.\" Revisions are part of the process.",
    'proc.c.t':'You launch',
    'proc.c.d':"Your product goes live, polished and tested. I don't disappear — I stay to make sure everything runs perfectly.",
    'proj.ey':'work','proj.h':'Results, not <em>promises.</em>',
    'proj.feat':'Featured · 2024',
    'proj.bc.res':'→ Delivered in 5 days · First version, no revisions',
    'proj.bc.d':'A premium kitchen design brand went from invisible to unforgettable online. SpaceX-inspired layout, immersive scroll experience, custom interactions. Zero frameworks — pure craft.',
    'proj.view':'View project ↗',
    'proj.b.n':'Project Alpha','proj.b.r':'↑ 3× more signups post-launch',
    'proj.c.n':'Project Beta','proj.c.r':'↑ 60% increase in checkout completion',
    'proj.d.n':'Project Gamma','proj.d.r':'→ 20h/week saved for the team',
    'con.ey':'contact',
    'con.h':'Your idea is one<br>conversation <em>away.</em>',
    'con.d':"Tell me what you're building. I'll tell you how we can make it real. Usually respond within a few hours.",
    'con.email':'Email','con.loc':'Location','con.locv':'Colombia · Remote worldwide',
    'f.name':'Name','f.name-ph':'Your name','f.email':'Email',
    'f.msg':'Message','f.msg-ph':'Tell me about your project…',
    'f.send':'Send message →','f.sent':"Sent! I'll be in touch →",'f.top':'Back to top ↑',
    'mq':['Landing Pages','Web Applications','E-commerce','UI Design','Mobile Apps','APIs','Automation','Consulting','Branding'],
    'ty':['people love.','that win.','in days.','that convert.','that impress.'],
  },
  es: {
    'nav.about':'Sobre mí','nav.process':'Proceso','nav.projects':'Proyectos',
    'nav.contact':'Contacto','nav.avail':'Disponible',
    'hero.tag':'Colombia · Trabajo remoto',
    'hero.l1':'David Lopez','hero.l2':'convierte ideas',
    'hero.sub':'Llevo tu idea de papel a producto real — limpio, rápido y listo para usuarios reales. Sin tecnicismos, sin retrasos, sin sorpresas.',
    'hero.cta1':'Iniciar proyecto','hero.cta2':'Ver trabajo',
    'hero.badge':'Disponible','hero.role':'desarrollador de software','hero.scroll':'Scroll para explorar',
    'stat.a':'Proyectos entregados','stat.b':'Días promedio de lanzamiento',
    'stat.c':'Entregas a tiempo','stat.d':'Países atendidos',
    'about.ey':'sobre mí',
    'about.h':'Tu idea merece<br>verse <em>de talla mundial.</em>',
    'about.p1':'Construyo productos digitales que se sienten costosos — porque los detalles importan. Desde el primer píxel hasta la última línea de código, todo tiene una razón de estar.',
    'about.p2':'Basado en Colombia. Trabajo con fundadores, agencias y empresas de todo el mundo. Hablo español e inglés.',
    'about.svc-ey':'lo que hago',
    'svc.a.n':'Landing Pages','svc.a.d':'Que convierten visitantes en clientes. Rápidas, hermosas, perfectas en móvil.',
    'svc.b.n':'Aplicaciones Web','svc.b.d':'Productos completos que tus usuarios no querrán dejar de usar.',
    'svc.c.n':'E-commerce','svc.c.d':'Tiendas construidas para vender. Checkout limpio, cero fricción.',
    'svc.d.n':'Marca & Diseño','svc.d.d':'Tu identidad visual, nítida y consistente en cada punto de contacto.',
    'svc.e.n':'APIs e Integraciones','svc.e.d':'Conecta tus herramientas. Automatiza lo que desperdicia el tiempo de tu equipo.',
    'svc.f.n':'Consultoría','svc.f.d':'¿No sabes por dónde empezar? Trazo el mejor camino y lo construyo.',
    'proc.ey':'cómo funciona',
    'proc.h':'Simple para ti.<br><em>Preciso</em> de mi parte.',
    'proc.a.t':'Hablamos',
    'proc.a.d':'Cuéntame tu idea. Te diré exactamente qué es posible, cuánto tarda y cuánto cuesta. Llamada gratis, sin compromiso.',
    'proc.b.t':'Construyo',
    'proc.b.d':'Ves progreso real cada día. Sin cajas negras. Sin "estará listo cuando esté listo". Las revisiones son parte del proceso.',
    'proc.c.t':'Lanzas',
    'proc.c.d':'Tu producto sale en vivo, pulido y probado. No desaparezco — me quedo para asegurar que todo funcione perfecto.',
    'proj.ey':'trabajo','proj.h':'Resultados, no <em>promesas.</em>',
    'proj.feat':'Destacado · 2024',
    'proj.bc.res':'→ Entregado en 5 días · Primera versión, sin revisiones',
    'proj.bc.d':'Una marca premium de cocinas pasó de invisible a impactante en línea. Layout inspirado en SpaceX, experiencia inmersiva de scroll, interacciones a medida.',
    'proj.view':'Ver proyecto ↗',
    'proj.b.n':'Proyecto Alpha','proj.b.r':'↑ 3× más registros post-lanzamiento',
    'proj.c.n':'Proyecto Beta','proj.c.r':'↑ 60% más conversiones en checkout',
    'proj.d.n':'Proyecto Gamma','proj.d.r':'→ 20h/semana ahorradas al equipo',
    'con.ey':'contacto',
    'con.h':'Tu idea está a una<br>conversación <em>de distancia.</em>',
    'con.d':'Cuéntame qué estás construyendo. Te diré cómo lo hacemos real. Generalmente respondo en pocas horas.',
    'con.email':'Email','con.loc':'Ubicación','con.locv':'Colombia · Trabajo remoto',
    'f.name':'Nombre','f.name-ph':'Tu nombre','f.email':'Email',
    'f.msg':'Mensaje','f.msg-ph':'Cuéntame sobre tu proyecto…',
    'f.send':'Enviar mensaje →','f.sent':'¡Enviado! Te contacto pronto →','f.top':'Volver arriba ↑',
    'mq':['Landing Pages','Aplicaciones Web','E-commerce','Diseño UI','Apps Móviles','APIs','Automatización','Consultoría','Branding'],
    'ty':['que la gente ama.','que ganan.','en días.','que convierten.','que impresionan.'],
  }
};

let lang = localStorage.getItem('lang') || 'en';
let theme = localStorage.getItem('theme') || 'dark';
let tyPhrases, tyIdx=0, tyChar=0, tyDel=false, tyTimer;

/* ── Language & Theme ───────────────────────────────────── */
function applyLang() {
  const s = S[lang];
  document.documentElement.setAttribute('data-lang', lang);
  document.getElementById('langBtn').textContent = lang==='en'?'ES':'EN';
  document.querySelectorAll('[data-i]').forEach(el => {
    const k = el.getAttribute('data-i');
    if(s[k]!==undefined) el.innerHTML = s[k];
  });
  document.querySelectorAll('[data-i-ph]').forEach(el => {
    const k = el.getAttribute('data-i-ph');
    if(s[k]!==undefined) el.placeholder = s[k];
  });
  tyPhrases = s['ty'];
  tyIdx=0; tyChar=0; tyDel=false;
  clearTimeout(tyTimer); typeTick();
  buildMarquee();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeBtn').textContent = theme==='dark'?'☀':'☾';
  localStorage.setItem('theme', theme);
}

document.getElementById('langBtn').addEventListener('click', () => {
  lang = lang==='en'?'es':'en';
  localStorage.setItem('lang', lang);
  applyLang();
});

document.getElementById('themeBtn').addEventListener('click', () => {
  theme = theme==='dark'?'light':'dark';
  applyTheme();
});

/* ── Marquee ────────────────────────────────────────────── */
function buildMarquee() {
  const items = S[lang]['mq'];
  const mq = document.getElementById('mq');
  const rep = [...items,...items,...items,...items];
  mq.innerHTML = rep.map(t=>`<span class="mq-item">${t}</span>`).join('');
}

/* ── Typewriter ─────────────────────────────────────────── */
const tyEl = document.getElementById('ty');
function typeTick() {
  if(!tyPhrases) return;
  const phrase = tyPhrases[tyIdx];
  if(!tyDel) {
    tyEl.textContent = phrase.slice(0, ++tyChar);
    if(tyChar===phrase.length){ tyDel=true; tyTimer=setTimeout(typeTick,2400); }
    else tyTimer=setTimeout(typeTick,72);
  } else {
    tyEl.textContent = phrase.slice(0, --tyChar);
    if(tyChar===0){ tyDel=false; tyIdx=(tyIdx+1)%tyPhrases.length; tyTimer=setTimeout(typeTick,350); }
    else tyTimer=setTimeout(typeTick,38);
  }
}

/* ── Text Scramble ──────────────────────────────────────── */
const CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#&';
function scramble(el, final, dur) {
  const frames=Math.floor(dur/16); let frame=0;
  const tick=()=>{
    const p=frame/frames;
    el.textContent=final.split('').map((ch,i)=>{
      if(ch===' ') return ' ';
      if(i/final.length<p) return ch;
      return CHARS[Math.floor(Math.random()*CHARS.length)];
    }).join('');
    frame++;
    if(frame<=frames) requestAnimationFrame(tick);
    else el.textContent=final;
  };
  requestAnimationFrame(tick);
}
setTimeout(()=>{
  document.querySelectorAll('[data-scramble]').forEach(el=>{
    scramble(el, el.textContent.trim(), 900);
  });
}, 1600);

/* ── Glitch Effect ──────────────────────────────────────── */
function initGlitch() {
  const glitchEl = document.querySelector('[data-glitch]');
  if(!glitchEl) return;
  
  setInterval(() => {
    glitchEl.classList.add('glitch-active');
    setTimeout(() => glitchEl.classList.remove('glitch-active'), 200);
  }, 3000);
}

/* ── Canvas Particles (Enhanced) ────────────────────────── */
const cv=document.getElementById('cv');
const ctx=cv.getContext('2d');
let W,H,parts=[],mouse={x:-999,y:-999},scrollY=0;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function resize(){ W=cv.width=innerWidth; H=cv.height=innerHeight; }
resize(); addEventListener('resize',resize);

class P {
  constructor(){
    this.x=Math.random()*W; this.y=Math.random()*H;
    this.vx=(Math.random()-.5)*.25; this.vy=(Math.random()-.5)*.25;
    this.r=Math.random()*1.3+.4;
    this.a=Math.random()*.32+.07;
    this.gold=Math.random()>.72;
    this.baseY=this.y;
  }
  update(){
    const dx=this.x-mouse.x,dy=this.y-mouse.y,d=Math.hypot(dx,dy);
    if(d<120){ const f=.55*(1-d/120); this.vx+=dx/d*f; this.vy+=dy/d*f; }
    
    // Scroll influence
    const scrollInfluence = (scrollY - this.baseY) * 0.0001;
    this.vy += scrollInfluence;
    
    this.vx*=.98; this.vy*=.98;
    this.x+=this.vx; this.y+=this.vy;
    if(this.x<-5) this.x=W+5; if(this.x>W+5) this.x=-5;
    if(this.y<-5) this.y=H+5; if(this.y>H+5) this.y=-5;
  }
  draw(){
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle=this.gold?`rgba(196,164,90,${this.a})`:`rgba(240,237,234,${this.a*.55})`;
    ctx.fill();
  }
}

// Reduce particles on mobile
const particleCount = isMobile ? 30 : 80;
for(let i=0;i<particleCount;i++) parts.push(new P());

function drawLines(){
  for(let i=0;i<parts.length;i++){
    for(let j=i+1;j<parts.length;j++){
      const d=Math.hypot(parts[i].x-parts[j].x,parts[i].y-parts[j].y);
      if(d<90){
        ctx.beginPath(); ctx.moveTo(parts[i].x,parts[i].y); ctx.lineTo(parts[j].x,parts[j].y);
        ctx.strokeStyle=`rgba(196,164,90,${.07*(1-d/90)})`; ctx.lineWidth=.5; ctx.stroke();
      }
    }
  }
}

(function animP(){ ctx.clearRect(0,0,W,H); parts.forEach(p=>{p.update();p.draw();}); drawLines(); requestAnimationFrame(animP); })();

/* ── Cursor + Trail (Enhanced) ──────────────────────────── */
if(!isMobile) {
  const TN=12; const trail=[];
  for(let i=0;i<TN;i++){
    const d=document.createElement('div'); d.className='trail';
    const s=Math.max(1.5,4.5*(1-i/TN));
    d.style.cssText=`width:${s}px;height:${s}px;opacity:${.55*(1-i/TN)};`;
    document.body.appendChild(d);
    trail.push({el:d,x:0,y:0});
  }
  const curDot=document.getElementById('cur'), curRing=document.getElementById('curl');
  let mx=0,my=0,rx=0,ry=0;
  const tp=Array(TN).fill(null).map(()=>({x:0,y:0}));
  
  document.addEventListener('mousemove',e=>{
    mx=e.clientX; my=e.clientY;
    mouse.x=mx; mouse.y=my;
    curDot.style.left=mx+'px'; curDot.style.top=my+'px';
  });
  
  (function curTick(){
    rx+=(mx-rx)*.12; ry+=(my-ry)*.12;
    curRing.style.left=rx+'px'; curRing.style.top=ry+'px';
    for(let i=TN-1;i>0;i--){ tp[i].x+=(tp[i-1].x-tp[i].x)*.35; tp[i].y+=(tp[i-1].y-tp[i].y)*.35; }
    tp[0].x+=(mx-tp[0].x)*.35; tp[0].y+=(my-tp[0].y)*.35;
    trail.forEach((t,i)=>{ t.el.style.left=tp[i].x+'px'; t.el.style.top=tp[i].y+'px'; });
    requestAnimationFrame(curTick);
  })();
  
  document.querySelectorAll('a,button,.svc,.proc-step,.stat').forEach(el=>{
    el.addEventListener('mouseenter',()=>document.body.classList.add('hovering'));
    el.addEventListener('mouseleave',()=>document.body.classList.remove('hovering'));
  });
}

/* ── Ambient Glow ───────────────────────────────────────── */
const glowEl=document.getElementById('glow');
let gx=innerWidth/2,gy=innerHeight/2,gfx=gx,gfy=gy;
document.addEventListener('mousemove',e=>{gx=e.clientX;gy=e.clientY;});
(function glTick(){
  gfx+=(gx-gfx)*.04; gfy+=(gy-gfy)*.04;
  glowEl.style.left=gfx+'px'; glowEl.style.top=gfy+'px';
  requestAnimationFrame(glTick);
})();

/* ── Project Hover Preview ──────────────────────────────── */
const pv=document.getElementById('pv'), pvImg=document.getElementById('pv-img');
document.querySelectorAll('.pi[data-preview]').forEach(item=>{
  item.addEventListener('mouseenter',()=>{ pvImg.src=item.dataset.preview; pv.classList.add('show'); });
  item.addEventListener('mousemove',e=>{
    const top=Math.min(e.clientY-100,innerHeight-210);
    const left=e.clientX+40+300>innerWidth? e.clientX-340 : e.clientX+40;
    pv.style.left=left+'px'; pv.style.top=top+'px';
  });
  item.addEventListener('mouseleave',()=>pv.classList.remove('show'));
});

/* ── 3D Tilt (Enhanced) ─────────────────────────────────── */
document.querySelectorAll('.tilt, .acard, .svc, .proc-step').forEach(card=>{
  card.style.transition='transform .06s ease';
  card.addEventListener('mousemove',e=>{
    const r=card.getBoundingClientRect();
    const dx=(e.clientX-r.left-r.width/2)/(r.width/2);
    const dy=(e.clientY-r.top-r.height/2)/(r.height/2);
    card.style.transform=`perspective(900px) rotateY(${dx*9}deg) rotateX(${-dy*9}deg) translateZ(10px)`;
  });
  card.addEventListener('mouseleave',()=>{
    card.style.transition='transform .7s cubic-bezier(.16,1,.3,1)';
    card.style.transform='perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
  });
});

/* ── Magnetic Buttons (Enhanced) ────────────────────────── */
document.querySelectorAll('.mwrap').forEach(w=>{
  const a=w.querySelector('a');
  w.addEventListener('mousemove',e=>{
    const r=w.getBoundingClientRect();
    const x=(e.clientX-r.left-r.width/2)*.25, y=(e.clientY-r.top-r.height/2)*.25;
    a.style.transform=`translate(${x}px,${y}px)`; a.style.transition='transform .1s ease';
  });
  w.addEventListener('mouseleave',()=>{
    a.style.transform='translate(0,0)'; a.style.transition='transform .6s cubic-bezier(.16,1,.3,1)';
  });
});

/* ── Nav + Progress ─────────────────────────────────────── */
const nav=document.getElementById('nav'), prog=document.getElementById('prog');
addEventListener('scroll',()=>{
  scrollY=window.scrollY;
  nav.classList.toggle('scrolled',scrollY>50);
  prog.style.width=(scrollY/(document.body.scrollHeight-innerHeight)*100)+'%';
},{passive:true});

/* ── Counters ───────────────────────────────────────────── */
const easeOut=t=>1-Math.pow(1-t,3);
function animCount(el,to,dur=1800){
  let start;
  const step=ts=>{
    if(!start) start=ts;
    const p=Math.min((ts-start)/dur,1);
    el.textContent=Math.round(to*easeOut(p));
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const cio=new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting){ animCount(e.target,+e.target.dataset.to); cio.unobserve(e.target); } });
},{threshold:.5});
document.querySelectorAll('.cnt').forEach(el=>cio.observe(el));

/* ── Reveal ─────────────────────────────────────────────── */
const io=new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{threshold:.08,rootMargin:'0px 0px -30px 0px'});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));

/* ── Form (Enhanced with validation) ────────────────────── */
const form = document.getElementById('cform');
const nameInput = form.querySelector('input[type="text"]');
const emailInput = form.querySelector('input[type="email"]');
const msgInput = form.querySelector('textarea');
const submitBtn = document.getElementById('sbtn');

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(input, msg) {
  input.classList.add('error');
  let errorEl = input.parentElement.querySelector('.error-msg');
  if(!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'error-msg';
    input.parentElement.appendChild(errorEl);
  }
  errorEl.textContent = msg;
  errorEl.style.opacity = '1';
  input.classList.add('shake');
  setTimeout(() => input.classList.remove('shake'), 500);
}

function clearError(input) {
  input.classList.remove('error');
  const errorEl = input.parentElement.querySelector('.error-msg');
  if(errorEl) errorEl.style.opacity = '0';
}

nameInput.addEventListener('input', () => clearError(nameInput));
emailInput.addEventListener('input', () => clearError(emailInput));
msgInput.addEventListener('input', () => clearError(msgInput));

form.addEventListener('submit', e => {
  e.preventDefault();
  let valid = true;
  
  if(!nameInput.value.trim()) {
    showError(nameInput, lang === 'en' ? 'Name is required' : 'El nombre es requerido');
    valid = false;
  }
  
  if(!emailInput.value.trim()) {
    showError(emailInput, lang === 'en' ? 'Email is required' : 'El email es requerido');
    valid = false;
  } else if(!validateEmail(emailInput.value)) {
    showError(emailInput, lang === 'en' ? 'Invalid email' : 'Email inválido');
    valid = false;
  }
  
  if(!msgInput.value.trim()) {
    showError(msgInput, lang === 'en' ? 'Message is required' : 'El mensaje es requerido');
    valid = false;
  }
  
  if(!valid) return;
  
  // Simulate sending
  submitBtn.classList.add('sending');
  submitBtn.textContent = lang === 'en' ? 'Sending...' : 'Enviando...';
  
  setTimeout(() => {
    submitBtn.classList.remove('sending');
    submitBtn.classList.add('sent');
    submitBtn.textContent = S[lang]['f.sent'];
    
    // Show toast
    showToast(lang === 'en' ? 'Message sent!' : '¡Mensaje enviado!', 'success');
    
    form.reset();
    setTimeout(() => {
      submitBtn.classList.remove('sent');
      submitBtn.textContent = S[lang]['f.send'];
    }, 3500);
  }, 1500);
});

/* ── Toast Notification ─────────────────────────────────── */
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if(existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ── Rubik's Cube 3D ────────────────────────────────────── */
(function(){
  const CS=52, HALF=26, STEP=57;

  const C = {
    pz:'#E63946', nz:'#F77F00',
    px:'#3B82F6', nx:'#22C55E',
    ny:'#F5F5F0', py:'#FBBF24',
    in:'#101010'
  };

  const FDEF = [
    { id:'pz', t:`translateZ(${HALF}px)` },
    { id:'nz', t:`rotateY(180deg) translateZ(${HALF}px)` },
    { id:'px', t:`rotateY(90deg) translateZ(${HALF}px)` },
    { id:'nx', t:`rotateY(-90deg) translateZ(${HALF}px)` },
    { id:'py', t:`rotateX(90deg) translateZ(${HALF}px)` },
    { id:'ny', t:`rotateX(-90deg) translateZ(${HALF}px)` },
  ];

  function col(id, x, y, z) {
    if(id==='pz'&&z=== 1) return C.pz;
    if(id==='nz'&&z===-1) return C.nz;
    if(id==='px'&&x=== 1) return C.px;
    if(id==='nx'&&x===-1) return C.nx;
    if(id==='ny'&&y===-1) return C.ny;
    if(id==='py'&&y=== 1) return C.py;
    return C.in;
  }

  const wrap = document.getElementById('cubeWrapper');
  if(!wrap) return;
  const cubies = [];

  for(let xi=0;xi<3;xi++) for(let yi=0;yi<3;yi++) for(let zi=0;zi<3;zi++){
    const x=xi-1, y=yi-1, z=zi-1;
    const el = document.createElement('div');
    el.className = 'cubie';
    const hx=x*STEP, hy=y*STEP, hz=z*STEP;
    el.style.transform = `translate3d(${hx}px,${hy}px,${hz}px)`;

    FDEF.forEach(f => {
      const face = document.createElement('div');
      face.className = 'cubie-face';
      const color = col(f.id,x,y,z);
      face.style.background = color;
      face.style.transform = f.t;
      if(color !== C.in) face.style.boxShadow = 'inset 0 0 0 3px rgba(255,255,255,.1)';
      el.appendChild(face);
    });

    cubies.push({el,x,y,z,hx,hy,hz});
    wrap.appendChild(el);
  }

  let rotY=0, speed=0.28;
  (function spin(){
    rotY += speed;
    const rotX = -22 + Math.sin(rotY * Math.PI/600) * 10;
    wrap.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    requestAnimationFrame(spin);
  })();

  function randomSpin(done) {
    const axis = ['y','x','z'][Math.floor(Math.random()*3)];
    const layer = [-1,0,1][Math.floor(Math.random()*3)];
    const deg = [90,-90,180][Math.floor(Math.random()*3)];
    const group = cubies.filter(c => c[axis]===layer);

    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:absolute;width:0;height:0;transform-style:preserve-3d;';
    group.forEach(c => tmp.appendChild(c.el));
    wrap.appendChild(tmp);

    const rotProp = axis==='y'?`rotateY(${deg}deg)`:axis==='x'?`rotateX(${deg}deg)`:`rotateZ(${deg}deg)`;
    tmp.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1)';
    requestAnimationFrame(()=>{
      tmp.style.transform = rotProp;
      setTimeout(()=>{
        group.forEach(c => wrap.appendChild(c.el));
        wrap.removeChild(tmp);
        if(done) done();
      }, 600);
    });
  }

  const EDIST=210;
  function explode() {
    cubies.forEach(c => {
      const len = Math.hypot(c.x,c.y,c.z) || 0.58;
      const dx = c.x/len*EDIST + (Math.random()-.5)*90;
      const dy = c.y/len*EDIST + (Math.random()-.5)*90;
      const dz = c.z/len*EDIST + (Math.random()-.5)*90;
      const rx = (Math.random()-.5)*400;
      const ry = (Math.random()-.5)*400;
      c.el.style.transition = 'transform 1.35s cubic-bezier(.16,1,.3,1)';
      c.el.style.transform = `translate3d(${c.hx+dx}px,${c.hy+dy}px,${c.hz+dz}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  }

  function implode(onDone) {
    cubies.forEach((c,i) => {
      c.el.style.transition = `transform 1.15s cubic-bezier(.16,1,.3,1) ${i*13}ms`;
      c.el.style.transform = `translate3d(${c.hx}px,${c.hy}px,${c.hz}px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
    });
    setTimeout(onDone, 1150 + 27*13 + 200);
  }

  function cycle() {
    let spins = 0;
    function doSpin() {
      if(spins++ < 3) randomSpin(()=> setTimeout(doSpin, 120));
      else afterScramble();
    }
    setTimeout(doSpin, 3500);
  }

  function afterScramble() {
    explode();
    setTimeout(()=>{
      implode(()=>{
        setTimeout(cycle, 2500);
      });
    }, 1350 + 1800);
  }

  cycle();
})();

/* ── Init ───────────────────────────────────────────────── */
applyTheme();
applyLang();
initGlitch();
