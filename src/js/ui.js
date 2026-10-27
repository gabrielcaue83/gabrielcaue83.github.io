// Peças menores da interface: mini-reel do hero, nav, cursor, botões magnéticos e relógio.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Mini-reel: os 4 projetos passando no canto do hero ---------- */
export function initReel({ reduced }) {
  const reel = document.querySelector('[data-reel]');
  if (!reel) return;
  const imgs = [...reel.querySelectorAll('[data-reel-img]')];
  const nameEl = reel.querySelector('[data-reel-name]');
  const nEl = reel.querySelector('[data-reel-n]');
  const bar = reel.querySelector('[data-reel-progress]');
  const names = ['Opus 5.5', 'IACIT 2.0', 'Casarão Mineiro', 'Classe Studio'];

  imgs.forEach((im, i) => {
    im.loading = 'eager';
    gsap.set(im, { zIndex: i === 0 ? 2 : 1, clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)' });
  });
  if (reduced) return;

  let cur = 0;
  let paused = false;
  let active;
  const cycle = () => {
    const next = (cur + 1) % imgs.length;
    active = gsap.timeline({ paused, onComplete: () => { cur = next; cycle(); } })
      .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 3.2, ease: 'none' })
      .set(imgs[next], { zIndex: 3, clipPath: 'inset(0% 0% 0% 100%)', scale: 1.25 })
      .to(imgs[next], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' })
      .to(imgs[next], { scale: 1, duration: 1.3, ease: 'expo.out' }, '<')
      .call(() => {
        nameEl.textContent = names[next];
        nEl.textContent = String(next + 1).padStart(2, '0');
      }, null, '<0.35')
      .set(imgs[cur], { zIndex: 1, clipPath: 'inset(0% 0% 0% 100%)' })
      .set(imgs[next], { zIndex: 2 });
  };
  cycle();

  // só roda enquanto o hero está na tela
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    onToggle: (self) => {
      paused = !self.isActive;
      active?.paused(paused);
    },
  });
}

/* ---------- Nav: some ao descer, volta ao subir; âncoras com scroll suave ---------- */
export function initNav(lenis) {
  const nav = document.querySelector('[data-nav]');
  let last = 0;
  const onScroll = (y) => {
    if (y > 160 && y > last + 2) nav.classList.add('is-hidden');
    else if (y < last - 2 || y <= 160) nav.classList.remove('is-hidden');
    last = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#topo' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else if (target === 0) window.scrollTo({ top: 0 });
      else target.scrollIntoView();
      // leva o foco junto (teclado e leitor de tela)
      const focusEl = target === 0 ? document.querySelector('#topo') : target;
      if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
      focusEl.focus({ preventScroll: true });
    });
  });
}

/* ---------- Botões que puxam levemente na direção do mouse ---------- */
export function initMagnetic() {
  if (!fine()) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    let rect;
    el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', (e) => {
      if (!rect) return;
      x((e.clientX - (rect.left + rect.width / 2)) * 0.22);
      y((e.clientY - (rect.top + rect.height / 2)) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      rect = null;
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ---------- Hora de São José dos Campos no rodapé ---------- */
export function initClock() {
  const el = document.querySelector('[data-clock]');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const tick = () => {
    const now = new Date();
    el.textContent = fmt.format(now);
    el.dateTime = now.toISOString();
  };
  tick();
  setInterval(tick, 20000);
}
