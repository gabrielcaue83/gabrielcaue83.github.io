// 02 · GSAP: uma timeline de verdade, controlada pelo scroll, em 3 atos.
//   1. Sequência   → formas entram em ordem (stagger) e fazem uma onda
//   2. Scroll      → as letras de MOVIMENTO se montam do caos
//   3. Caminhos    → a órbita se desenha (DrawSVG) e o satélite a percorre (MotionPath)
// Embaixo da cena, a linha do tempo mostra o "tempo" da animação andando.
// A cena nasce da estrela em que Serviços se transformou: o palco se abre
// como um portal a partir dela e as formas saem de dentro dela.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { estrela, startEstrela } from './space.js';

export function setupGsapDemo() {
  const sec = document.querySelector('.demo-gsap');
  if (!sec) return;
  sec.classList.add('cena--live', 'cena--chain');

  const pin = sec.querySelector('.cena__pin');
  const head = sec.querySelector('.cena__head');
  const copy = sec.querySelector('.demo__copy');
  const stageEl = sec.querySelector('.stage');
  startEstrela();
  const formas = sec.querySelectorAll('.forma');
  const palavra = sec.querySelector('.stage__palavra');
  const chars = SplitText.create(palavra, { type: 'chars' }).chars;
  const guia = sec.querySelector('.stage__guia');
  const linha = sec.querySelector('.stage__linha');
  const planeta = sec.querySelector('.stage__planeta');
  const sat = sec.querySelector('.stage__satelite');
  const steps = [...sec.querySelectorAll('[data-gsap-step]')];
  const playhead = sec.querySelector('[data-gsap-head]');
  const timeEl = sec.querySelector('[data-gsap-time]');
  const ticks = sec.querySelectorAll('.stage__timeline em');
  const count = sec.querySelector('[data-gsap-n]');
  const rnd = gsap.utils.random;

  gsap.set([guia, planeta, sat], { autoAlpha: 0 });
  gsap.set(chars, { autoAlpha: 0 });

  // posição de um elemento dentro da cena fixa (que fica em top: 0 enquanto está fixa);
  // a estrela está sempre no centro da tela
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
  const portal = (open) => {
    const o = offsetIn(stageEl);
    const x = window.innerWidth / 2 - o.x;
    const y = window.innerHeight / 2 - o.y;
    const r = open ? Math.hypot(stageEl.offsetWidth, stageEl.offsetHeight) : 0;
    return `circle(${r}px at ${x}px ${y}px)`;
  };

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  const OFF = 0.35;

  // ato 1 · sequência: o palco abre a partir da estrela e as formas saem dela
  tl.addLabel('a1', 0)
    .fromTo(estrela, { apaga: 0 }, { apaga: 1, duration: 0.45, ease: 'power2.in', immediateRender: false }, 0.05)
    .fromTo(stageEl, { clipPath: () => portal(false) }, { clipPath: () => portal(true), duration: 0.8, ease: 'power2.inOut' }, 0.05)
    .fromTo(formas, {
      x: (i, el) => window.innerWidth / 2 - centerOf(el).x,
      y: (i, el) => window.innerHeight / 2 - centerOf(el).y,
      scale: 0,
      autoAlpha: 0,
      rotate: (i) => (i % 2 ? -120 : 120),
    }, { x: 0, y: 0, scale: 1, autoAlpha: 1, rotate: 0, duration: 0.7, stagger: 0.06, ease: 'back.out(1.3)' }, 0.15)
    .fromTo([head, ...copy.children], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out' }, 0.35)
    .to(formas, { y: (i) => Math.sin(i * 0.95) * 48, rotate: (i) => (i - 3) * 14, duration: 0.45, stagger: { each: 0.04, from: 'center' }, ease: 'sine.inOut' }, 0.95 + OFF)
    .to(formas, { y: 0, rotate: 0, duration: 0.4, stagger: 0.03, ease: 'sine.inOut' }, 1.45 + OFF)
    .to(formas, { scale: 0, autoAlpha: 0, duration: 0.35, stagger: { each: 0.03, from: 'edges' }, ease: 'power2.in' }, 1.9 + OFF);

  // ato 2 · scroll no controle
  tl.addLabel('a2', 2.3 + OFF)
    .fromTo(chars,
      { x: () => rnd(-280, 280), y: () => rnd(-170, 170), rotate: () => rnd(-140, 140), scale: () => rnd(0.3, 2.2), autoAlpha: 0 },
      { x: 0, y: 0, rotate: 0, scale: 1, autoAlpha: 1, duration: 0.9, stagger: { each: 0.035, from: 'random' }, ease: 'power3.out' }, 2.3 + OFF)
    .to(chars, { yPercent: -22, duration: 0.22, stagger: { each: 0.045, yoyo: true, repeat: 1 }, ease: 'sine.inOut' }, 3.35 + OFF)
    .to(chars, { yPercent: -130, autoAlpha: 0, duration: 0.4, stagger: 0.025, ease: 'power2.in' }, 4.05 + OFF);

  // ato 3 · caminhos
  tl.addLabel('a3', 4.6 + OFF)
    .fromTo(planeta, { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' }, 4.6 + OFF)
    .to(guia, { autoAlpha: 1, duration: 0.3 }, 4.6 + OFF)
    .fromTo(linha, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.3 }, 4.75 + OFF)
    .to(sat, { autoAlpha: 1, duration: 0.1 }, 4.75 + OFF)
    .to(sat, { motionPath: { path: linha, align: linha, alignOrigin: [0.5, 0.5] }, duration: 1.3 }, 4.75 + OFF)
    .to({}, { duration: 0.45 });

  // marcas dos atos na régua da timeline
  const total = tl.duration();
  ['a1', 'a2', 'a3'].forEach((l, i) => { if (ticks[i]) ticks[i].style.left = `${(tl.labels[l] / total) * 100}%`; });

  // saída · o desenho plano ganha profundidade: o palco deita como um chão,
  // a órbita vira um anel em perspectiva e o planeta 3D nasce no lugar do círculo
  const barra = sec.querySelector('.stage__timeline');
  const ex = tl.duration();
  tl.to([head, copy], { autoAlpha: 0, y: -24, duration: 0.35, stagger: 0.04 }, ex)
    .to(barra, { autoAlpha: 0, duration: 0.2 }, ex)
    .to(stageEl, { '--grid': 0, duration: 0.5 }, ex + 0.1)
    .to(stageEl, { rotateX: 66, scale: 1.18, transformPerspective: 1100, transformOrigin: '50% 50%', duration: 0.9, ease: 'power2.inOut' }, ex + 0.1)
    .to(sat, { motionPath: { path: linha, align: linha, alignOrigin: [0.5, 0.5], start: 0, end: 0.5 }, duration: 0.9 }, ex + 0.1)
    .to(planeta, { scale: 0.55, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, ex + 0.62)
    .to([linha, guia, sat], { autoAlpha: 0, duration: 0.35 }, ex + 0.8)
    .to({}, { duration: 0.1 });

  let current = -1;
  const setStep = (i) => {
    if (i === current) return;
    current = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    count.textContent = String(i + 1).padStart(2, '0');
  };
  setStep(0);

  ScrollTrigger.create({
    trigger: pin,
    start: 'top top',
    end: () => `+=${window.innerHeight * 4}`,
    pin: true,
    scrub: 1,
    animation: tl,
    invalidateOnRefresh: true,
  });
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    setStep(t < tl.labels.a2 - 0.1 ? 0 : t < tl.labels.a3 - 0.1 ? 1 : 2);
    gsap.set(playhead, { scaleX: Math.min(1, t / total) });
    timeEl.textContent = `${Math.min(t, total).toFixed(2)}s`;
  });

  setupEase();
}

/* ---------- Playground: a mesma animação com curvas de tempo diferentes ---------- */
function setupEase() {
  const root = document.querySelector('.ease');
  if (!root) return;
  const buttons = [...root.querySelectorAll('[data-ease]')];
  const ball = root.querySelector('.ease__ball');
  const track = root.querySelector('.ease__track');
  const curve = root.querySelector('.ease__curve');
  const dot = root.querySelector('.ease__dot');
  const nameEl = root.querySelector('[data-ease-name]');
  let ease = buttons.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.ease || 'power3.out';
  let tween;

  // a curva vai de (10,100) a (110,10); valores além de 1 (recuo, elástico) passam do topo
  const yOf = (v) => 100 - v * 90;
  const draw = () => {
    const fn = gsap.parseEase(ease);
    let d = '';
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      d += `${i ? 'L' : 'M'}${(10 + t * 100).toFixed(2)} ${yOf(fn(t)).toFixed(2)}`;
    }
    curve.setAttribute('d', d);
  };
  const play = () => {
    tween?.kill();
    const fn = gsap.parseEase(ease);
    const dist = () => track.clientWidth - ball.offsetWidth;
    tween = gsap.fromTo(ball, { x: 0 }, {
      x: dist,
      duration: 1.4,
      ease,
      onUpdate() {
        const p = this.progress();
        dot.setAttribute('cx', (10 + p * 100).toFixed(2));
        dot.setAttribute('cy', yOf(fn(p)).toFixed(2));
      },
    });
  };

  buttons.forEach((b) => b.addEventListener('click', () => {
    ease = b.dataset.ease;
    buttons.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    nameEl.textContent = ease;
    draw();
    play();
  }));
  track.addEventListener('click', play);

  draw();
  ScrollTrigger.create({ trigger: root, start: 'top 75%', once: true, onEnter: play });
}

export { setupEase };
