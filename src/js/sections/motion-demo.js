// 04 · Micro-interações feitas com a biblioteca Motion (física de mola).
//   A · bola que se arrasta e volta sozinha
//   B · cartão que inclina em 3D seguindo o mouse, com reflexo
//   C · alternador de cardápio (Almoço/Jantar) com troca suave dos itens
//   D · botão magnético que puxa o cursor e "afunda" no clique
//   (E · o playground de easing é do GSAP, em gsap-demo.js)
// Entrada: a constelação desenha os cartões. Saída (desktop): os cartões viram
// estrelas que voam até as paradas da rota do processo.
import { animate, press, spring, stagger } from 'motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mini, offsetIn } from './space.js';

const springy = { type: spring, stiffness: 260, damping: 18 };
const wobbly = { type: spring, stiffness: 170, damping: 8, mass: 1 };
const snappy = { type: spring, stiffness: 520, damping: 34 };

const MENUS = {
  almoco: [['Prato do dia', 'R$ 32'], ['Feijoada da casa', 'R$ 45'], ['Salada da horta', 'R$ 28']],
  jantar: [['Risoto de cogumelos', 'R$ 52'], ['Filé ao molho', 'R$ 64'], ['Petit gâteau', 'R$ 24']],
};

export function setupMotionDemo({ isTouch, reduced, stage }) {
  const sec = document.querySelector('.demo-motion');
  if (!sec) return;

  if (!reduced) {
    const head = sec.querySelector('.motion__head');
    const tiles = [...sec.querySelectorAll('[data-tile]')];
    const stages = tiles.map((t) => t.querySelector('.tile__stage'));
    const insides = stages.map((s) => [...s.children]);
    const captions = tiles.map((t) => [t.querySelector('.tile__title'), t.querySelector('.tile__text')]);
    const c = stage ? stage.addConstellation(stages) : null;
    const mm = gsap.matchMedia();

    // desktop: a seção fica fixa; a constelação (as partículas do anel que
    // explodiu) desenha os cartões, e no fim os cartões viram estrelas
    mm.add('(min-width: 901px)', () => {
      sec.classList.add('cena--live', 'cena--chain');

      const calcFrom = () => {
        mini.from = stages.map((s) => {
          const o = offsetIn(s, sec);
          return { x: o.x + s.offsetWidth / 2, y: o.y + s.offsetHeight / 2 };
        });
      };

      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      tl.fromTo(head, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.1);
      if (c) stages.forEach((_, i) => tl.fromTo(c.state[i], { p: 0 }, { p: 1, duration: 0.9, ease: 'power2.out' }, 0.05 + i * 0.06));
      tl.fromTo(stages, { '--ta': 0 }, { '--ta': 1, duration: 0.35, stagger: 0.06 }, 0.75);
      if (c) stages.forEach((_, i) => tl.fromTo(c.state[i], { f: 0 }, { f: 1, duration: 0.35 }, 0.8 + i * 0.06));
      tl.fromTo(insides.flat(), { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.03, ease: 'back.out(1.6)' }, 0.85)
        .fromTo(captions.flat(), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.03 }, 0.95)
        .to({}, { duration: 1.4 });   // pausa para brincar com os cartões

      const sai = tl.duration();
      tl.to([head, ...captions.flat()], { autoAlpha: 0, y: -16, duration: 0.3, stagger: 0.01 }, sai)
        .to(insides.flat(), { autoAlpha: 0, scale: 0.6, duration: 0.25 }, sai)
        .to(stages, {
          scaleX: (i, el) => 12 / el.offsetWidth,
          scaleY: (i, el) => 12 / el.offsetHeight,
          borderRadius: '50%',
          '--ta': 3,
          duration: 0.6,
          stagger: 0.04,
          ease: 'power3.in',
        }, sai + 0.1)
        .fromTo(mini, { acende: 0 }, { acende: 1, duration: 0.15, immediateRender: false }, sai + 0.72)
        .to(stages, { autoAlpha: 0, duration: 0.1 }, sai + 0.8)
        .to({}, { duration: 0.15 });

      ScrollTrigger.create({
        trigger: sec,
        start: 'top top',
        end: () => `+=${window.innerHeight * 2.4}`,
        pin: true,
        scrub: 1,
        animation: tl,
        invalidateOnRefresh: true,
        onRefresh: calcFrom,
      });
      calcFrom();
      return () => sec.classList.remove('cena--live', 'cena--chain');
    });

    // celular e tablet: cada cartão é desenhado pela constelação quando entra na tela
    mm.add('(max-width: 900px)', () => {
      // também encadeada: começa no instante em que o planeta termina
      sec.classList.add('cena--chain');
      const topo = (el) => el.getBoundingClientRect().top + window.scrollY;
      gsap.fromTo(head, { autoAlpha: 0, y: 30 }, {
        autoAlpha: 1, y: 0, ease: 'power2.out',
        scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${window.innerHeight * 0.35}`, scrub: true },
      });
      tiles.forEach((tile, i) => {
        // nunca antes da seção chegar (ela começa escondida atrás do fim do 3D)
        const ini = () => Math.max(topo(sec), topo(tile) - window.innerHeight * 0.92);
        const t = gsap.timeline({
          scrollTrigger: {
            trigger: tile,
            start: ini,
            end: () => ini() + window.innerHeight * 0.45,
            scrub: true,
          },
        });
        if (c) t.fromTo(c.state[i], { p: 0 }, { p: 1, duration: 1 }, 0).fromTo(c.state[i], { f: 0 }, { f: 1, duration: 0.35 }, 0.85);
        t.fromTo(stages[i], { '--ta': 0 }, { '--ta': 1, duration: 0.35 }, 0.8)
          .fromTo([...insides[i], ...captions[i]], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.04 }, 0.85);
      });
      return () => sec.classList.remove('cena--chain');
    });
  }

  dragOrb(sec);
  tiltCard(sec, { isTouch, reduced });
  menuSwitch(sec);
  magnetic(sec, { isTouch });
}

/* A · arraste e solte */
function dragOrb(sec) {
  const orb = sec.querySelector('[data-orb]');
  const area = sec.querySelector('[data-drag-area]');
  if (!orb || !area) return;
  let start = null;
  let moved = 0;

  orb.addEventListener('pointerdown', (e) => {
    orb.setPointerCapture?.(e.pointerId);
    start = { x: e.clientX, y: e.clientY };
    moved = 0;
    animate(orb, { scale: 1.14 }, snappy);
  });
  orb.addEventListener('pointermove', (e) => {
    if (!start) return;
    const r = area.getBoundingClientRect();
    const lx = r.width / 2 - 40;
    const ly = r.height / 2 - 40;
    const dx = Math.max(-lx, Math.min(lx, e.clientX - start.x));
    const dy = Math.max(-ly, Math.min(ly, e.clientY - start.y));
    moved = Math.max(moved, Math.hypot(dx, dy));
    animate(orb, { x: dx, y: dy }, { duration: 0 });
  });
  const release = () => {
    if (!start) return;
    start = null;
    // velocity 0: volta balançando, sem ser "arremessada" para fora do cartão
    animate(orb, { x: 0, y: 0, scale: 1 }, { ...wobbly, velocity: 0 });
  };
  orb.addEventListener('pointerup', release);
  orb.addEventListener('pointercancel', release);
  // teclado (ou toque sem arrastar): um pulinho
  orb.addEventListener('click', () => {
    if (moved > 4) return;
    animate(orb, { y: -46 }, { duration: 0.18, ease: 'easeOut' }).then(() => animate(orb, { y: 0 }, wobbly));
  });
}

/* B · cartão 3D */
function tiltCard(sec, { isTouch, reduced }) {
  const area = sec.querySelector('[data-tilt]');
  const card = sec.querySelector('[data-tilt-card]');
  if (!area || !card) return;
  const move = (e) => {
    const r = area.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    animate(card, { rotateY: nx * 30, rotateX: -ny * 26 }, springy);
    card.style.setProperty('--gx', `${(nx + 0.5) * 100}%`);
    card.style.setProperty('--gy', `${(ny + 0.5) * 100}%`);
    card.style.setProperty('--go', '1');
  };
  area.addEventListener('pointermove', move);
  area.addEventListener('pointerleave', () => {
    animate(card, { rotateX: 0, rotateY: 0 }, wobbly);
    card.style.setProperty('--go', '0');
  });
  // no celular não há "passar o mouse": o cartão balança sozinho
  if (isTouch && !reduced) {
    animate(card, { rotateY: [-14, 14] }, { duration: 3.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' });
  }
}

/* C · alternador de cardápio */
function menuSwitch(sec) {
  const opts = [...sec.querySelectorAll('[data-menu]')];
  const thumb = sec.querySelector('.switch__thumb');
  const list = sec.querySelector('[data-menu-list]');
  if (!opts.length || !thumb || !list) return;
  let busy = false;

  opts.forEach((opt, idx) => opt.addEventListener('click', async () => {
    if (opt.getAttribute('aria-pressed') === 'true' || busy) return;
    busy = true;
    opts.forEach((o) => o.setAttribute('aria-pressed', String(o === opt)));
    animate(thumb, { x: idx ? thumb.offsetWidth : 0 }, snappy);
    const items = [...list.children];
    await animate(items, { opacity: 0, y: -10 }, { duration: 0.16, delay: stagger(0.03) });
    MENUS[opt.dataset.menu].forEach(([name, price], i) => {
      items[i].querySelector('span').textContent = name;
      items[i].querySelector('b').textContent = price;
    });
    await animate(items, { opacity: [0, 1], y: [14, 0] }, { type: spring, stiffness: 380, damping: 24, delay: stagger(0.06) });
    busy = false;
  }));
}

/* D · botão magnético */
function magnetic(sec, { isTouch }) {
  const area = sec.querySelector('[data-mag-area]');
  const btn = sec.querySelector('[data-mag]');
  if (!area || !btn) return;
  const ico = btn.querySelector('.mag__ico');
  if (!isTouch) {
    area.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      animate(btn, { x: dx * 0.32, y: dy * 0.32 }, springy);
      animate(ico, { x: dx * 0.12, y: dy * 0.12 }, springy);
    });
    area.addEventListener('pointerleave', () => {
      animate(btn, { x: 0, y: 0 }, wobbly);
      animate(ico, { x: 0, y: 0 }, wobbly);
    });
  }
  press(btn, (el) => {
    animate(el, { scale: 0.92 }, snappy);
    return () => animate(el, { scale: 1 }, wobbly);
  });
}
