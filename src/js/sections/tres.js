// 03 · Three.js: o planeta é montado na frente do visitante, etapa por etapa,
// e no fim dá para girar arrastando. Os números embaixo são lidos ao vivo do
// renderizador (triângulos desenhados e quadros por segundo).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createPlanet } from '../gl/planet.js';
import { W } from './space.js';

export function setupTres(stage, { isTouch }) {
  const sec = document.querySelector('.demo-3d');
  if (!sec || !stage) return;   // sem WebGL a seção mostra só o texto e um aviso
  // começa por cima do fim da demo de GSAP: o planeta nasce onde o palco deitou
  sec.classList.add('cena--live', 'cena--chain');

  const view = sec.querySelector('[data-planet]');
  const head = sec.querySelector('.cena__head');
  const copy = sec.querySelector('.tres');
  const stats = sec.querySelector('.tres__stats');
  const hint = sec.querySelector('.tres__hint');
  const steps = [...sec.querySelectorAll('[data-tres-step]')];
  const count = sec.querySelector('[data-tres-n]');
  const out = {
    tris: sec.querySelector('[data-stat="tris"]'),
    pts: sec.querySelector('[data-stat="pts"]'),
    fps: sec.querySelector('[data-stat="fps"]'),
  };

  const planet = createPlanet({ particles: window.innerWidth < 700 ? 4000 : 7000 });
  const prog = { p: 0, enter: 0, exit: 0 };
  let fpsAvg = 60;
  let statT = 0;
  const fmt = new Intl.NumberFormat('pt-BR');
  out.pts.textContent = fmt.format(planet.stats().particles);

  stage.addScene(view, {
    scene: planet.scene,
    camera: planet.camera,
    resize: planet.resize,
    update: planet.update,
    isActive: () => prog.enter > 0.001 && prog.exit < 0.999,
    onRendered: (info, dt) => {
      fpsAvg += (1 / dt - fpsAvg) * 0.06;
      statT += dt;
      if (statT > 0.3) {
        statT = 0;
        out.tris.textContent = fmt.format(info.render.triangles + planet.stats().wireTris);
        out.fps.textContent = Math.min(144, Math.round(fpsAvg));
      }
    },
  });

  // arrastar gira o planeta (com inércia)
  let dragging = false;
  let lastX = 0;
  view.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    view.setPointerCapture?.(e.pointerId);
  });
  view.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    planet.drag(e.clientX - lastX);
    lastX = e.clientX;
  });
  const stop = () => { dragging = false; };
  view.addEventListener('pointerup', stop);
  view.addEventListener('pointercancel', stop);

  if (!isTouch) {
    window.addEventListener('pointermove', (e) => {
      planet.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
  }

  // 1 · entrada: o planeta vem do fundo com o "fantasma" da órbita do palco que deitou
  // 2 · montagem em 4 etapas
  // 3 · saída: a câmera atravessa o anel e as partículas se espalham (viram a constelação)
  const tl = gsap.timeline({ defaults: { ease: 'none' } })
    .to(prog, { enter: 1, duration: 1, ease: 'power2.out', onUpdate: () => planet.setEnter(prog.enter) }, 0)
    .fromTo([head, copy], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' }, 0.45)
    .fromTo(stats, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.7)
    .to(prog, { p: 1, duration: 4, onUpdate: () => planet.setProgress(prog.p) }, 1)
    .to({}, { duration: 0.6 });
  const sai = tl.duration();
  tl.to(prog, { exit: 1, duration: 1.2, ease: 'power2.in', onUpdate: () => planet.setExit(prog.exit) }, sai)
    .to([head, copy, stats], { autoAlpha: 0, y: -40, duration: 0.6 }, sai)
    .to(W, { anel: 1, duration: 0.6, ease: 'power2.in' }, sai + 0.4)
    .to(W, { anel: 0, duration: 0.5, ease: 'power2.out' }, sai + 1.0);

  let current = -1;
  const setStep = (i) => {
    if (i === current) return;
    current = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    count.textContent = String(i + 1).padStart(2, '0');
  };
  setStep(0);

  // a dica "arraste" só aparece na etapa 4 e some na saída
  let hintOn = false;
  const setHint = (on) => {
    if (on === hintOn) return;
    hintOn = on;
    gsap.to(hint, { autoAlpha: on ? 1 : 0, duration: 0.5, overwrite: true });
  };

  ScrollTrigger.create({
    trigger: sec,
    start: 'top top',
    end: () => `+=${window.innerHeight * 4.2}`,
    pin: true,
    scrub: 1,
    animation: tl,
    invalidateOnRefresh: true,
  });
  tl.eventCallback('onUpdate', () => {
    const p = prog.p;
    setStep(p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.76 ? 2 : 3);
    setHint(p >= 0.76 && prog.exit < 0.08);
  });
}
