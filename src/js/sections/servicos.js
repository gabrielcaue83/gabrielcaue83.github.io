// 01 · Serviços: nasce de dentro da viseira do astronauta, fica fixa enquanto o
// scroll troca de serviço (no WebGL uma imagem se dissolve na outra) e no fim
// se recolhe numa estrela, de onde nasce a demo de GSAP.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { estrela, startEstrela, W } from './space.js';

// quebra o título nos <br> e põe cada linha numa máscara
function maskLines(el) {
  const parts = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = parts.map((p) => `<span class="ln"><span class="ln__in">${p.trim()}</span></span>`).join('');
  return [...el.querySelectorAll('.ln__in')];
}

export function setupServicos(stage, { isTouch }) {
  const sec = document.querySelector('.servicos');
  if (!sec) return;
  sec.classList.add('cena--live');

  const head = sec.querySelector('.cena__head');
  const svc = sec.querySelector('.svc');
  const progress = sec.querySelector('.cena__progress');
  const frame = sec.querySelector('[data-svc-frame]');
  const imgs = [...sec.querySelectorAll('[data-slide]')];
  const tabs = [...sec.querySelectorAll('[data-svc-tab]')];
  const bar = sec.querySelector('[data-svc-bar]');
  const count = sec.querySelector('[data-svc-n]');

  const items = [...sec.querySelectorAll('[data-svc]')].map((el) => ({
    el,
    lines: maskLines(el.querySelector('.svc__title')),
    rest: [el.querySelector('.svc__num'), el.querySelector('.svc__text'), ...el.querySelectorAll('.svc__list li')],
  }));

  const gl = stage ? stage.addSlides(frame, imgs) : null;

  const pin = sec.querySelector('.cena__pin');
  const stars = stage ? stage.stars.state : null;
  startEstrela();
  const u = gl ? gl.uniforms : null;

  // a cena começa por cima do fim do mergulho do hero (nasce dentro da viseira)
  sec.classList.add('cena--chain');

  // estado inicial: só o primeiro serviço aparece
  items.slice(1).forEach((it) => {
    gsap.set(it.lines, { yPercent: 115 });
    gsap.set(it.rest, { autoAlpha: 0, y: 24 });
  });
  if (!gl) gsap.set(imgs.slice(1), { autoAlpha: 0 });

  // posição de um elemento dentro da cena fixa (a cena fica em top: 0 enquanto está fixa)
  const offsetIn = (el) => {
    let x = 0;
    let y = 0;
    for (let e = el; e && e !== pin; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    return { x, y };
  };
  const centerOf = (el) => {
    const o = offsetIn(el);
    return { x: o.x + el.offsetWidth / 2, y: o.y + el.offsetHeight / 2 };
  };

  const tl = gsap.timeline({ defaults: { ease: 'none' } });

  // 1 · nasce do centro da tela, vindo do fundo, enquanto a dobra espacial freia
  tl.fromTo(svc, {
    scale: 0.45,
    autoAlpha: 0,
    transformOrigin: () => {
      const o = offsetIn(svc);
      return `${window.innerWidth / 2 - o.x}px ${window.innerHeight / 2 - o.y}px`;
    },
  }, { scale: 1, autoAlpha: 1, duration: 0.95, ease: 'power3.out' }, 0)
    .fromTo(items[0].lines, { yPercent: 115 }, { yPercent: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0.3)
    .fromTo(items[0].rest, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.03, ease: 'power2.out' }, 0.45)
    .fromTo([head, progress], { autoAlpha: 0, y: -16 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.4);
  if (u) tl.fromTo(u.uReveal, { value: 0 }, { value: 1, duration: 0.9, ease: 'power2.out' }, 0.05);
  if (stars) tl.fromTo(W, { freio: 0 }, { freio: 1, duration: 0.9, ease: 'power2.out', immediateRender: false }, 0);
  tl.to({}, { duration: 0.4 });

  // 2 · troca de serviço, controlada pelo scroll
  const marks = [];
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i];
    const b = items[i + 1];
    const at = tl.duration();
    marks.push(at + 0.5);
    tl.to(a.lines, { yPercent: -115, duration: 0.5, stagger: 0.05, ease: 'power2.in' }, at)
      .to(a.rest, { autoAlpha: 0, y: -20, duration: 0.35, stagger: 0.02 }, at)
      .fromTo(b.lines, { yPercent: 115 }, { yPercent: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, at + 0.4)
      .fromTo(b.rest, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.03, ease: 'power2.out' }, at + 0.5);
    if (u) tl.to(u.uProgress, { value: i + 1, duration: 1.1, ease: 'power1.inOut' }, at);
    else tl.to(imgs[i + 1], { autoAlpha: 1, duration: 1 }, at);
    tl.to({}, { duration: 0.7 });
  }

  // 3 · a imagem se recolhe no centro da tela e vira uma estrela
  //     (a demo de GSAP, logo abaixo, nasce dessa estrela)
  const outAt = tl.duration();
  const last = items[items.length - 1];
  tl.to(last.lines, { yPercent: -115, duration: 0.4, stagger: 0.04, ease: 'power2.in' }, outAt)
    .to(last.rest, { autoAlpha: 0, y: -20, duration: 0.3, stagger: 0.02 }, outAt)
    .to([head, progress], { autoAlpha: 0, duration: 0.3 }, outAt)
    .fromTo(frame, { x: 0, y: 0, scaleX: 1, scaleY: 1 }, {
      x: () => window.innerWidth / 2 - centerOf(frame).x,
      y: () => window.innerHeight / 2 - centerOf(frame).y,
      scaleX: () => 16 / frame.offsetWidth,
      scaleY: () => 16 / frame.offsetHeight,
      duration: 0.8,
      ease: 'power3.inOut',
      immediateRender: false,
    }, outAt + 0.1)
    .fromTo(estrela, { acende: 0 }, { acende: 1, duration: 0.2, ease: 'back.out(2)', immediateRender: false }, outAt + 0.78);
  if (u) {
    tl.to(u.uRadius, { value: 400, duration: 0.5 }, outAt + 0.3)
      .to(u.uWhite, { value: 1, duration: 0.45, ease: 'power2.in' }, outAt + 0.4)
      .to(u.uOpacity, { value: 0, duration: 0.1 }, outAt + 0.88);
  } else {
    tl.to(frame, { autoAlpha: 0, duration: 0.1 }, outAt + 0.88);
  }
  tl.to({}, { duration: 0.15 });

  let current = -1;
  const setActive = (i) => {
    if (i === current) return;
    current = i;
    tabs.forEach((t, k) => t.classList.toggle('is-on', k === i));
    count.textContent = String(i + 1).padStart(2, '0');
  };
  setActive(0);

  ScrollTrigger.create({
    trigger: sec,
    start: 'top top',
    end: () => `+=${window.innerHeight * 4}`,
    pin: true,
    scrub: 1,
    animation: tl,
    invalidateOnRefresh: true,
  });
  // a interface segue a timeline (que anda suavizada pelo scrub), não o scroll cru
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    setActive(t < marks[0] ? 0 : t < marks[1] ? 1 : 2);
    gsap.set(bar, { scaleX: Math.min(1, t / outAt) });
  });

  // a imagem acompanha o mouse de leve
  if (gl && !isTouch) {
    const mx = gsap.quickTo(gl.uniforms.uMouse.value, 'x', { duration: 1, ease: 'power3' });
    const my = gsap.quickTo(gl.uniforms.uMouse.value, 'y', { duration: 1, ease: 'power3' });
    window.addEventListener('pointermove', (e) => {
      mx((e.clientX / window.innerWidth) * 2 - 1);
      my(-((e.clientY / window.innerHeight) * 2 - 1));
    }, { passive: true });
  }
}
