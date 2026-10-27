import '@fontsource-variable/inter-tight/wght.css';
import '@fontsource-variable/inter-tight/wght-italic.css';
import 'lenis/dist/lenis.css';
import './styles/main.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

import { createScroll } from './js/scroll.js';
import { createStage } from './js/gl/stage.js';
import { runLoader, removeLoader } from './js/loader.js';
import { setupHero } from './js/hero.js';
import { setupSpace, setupHud, startCentral } from './js/sections/space.js';
import { setupServicos } from './js/sections/servicos.js';
import { setupGsapDemo, setupEase } from './js/sections/gsap-demo.js';
import { setupTres } from './js/sections/tres.js';
import { setupMotionDemo } from './js/sections/motion-demo.js';
import { splitTitles, setupProcesso, setupContato } from './js/sections/finais.js';
import { initReel, initNav, initMagnetic, initClock } from './js/ui.js';
import { initForm } from './js/form.js';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);

const root = document.documentElement;
const reduced = root.classList.contains('rm');
const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const wait = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

async function boot() {
  initForm();
  initClock();

  // Movimento reduzido: página estática, sem scroll suave nem WebGL.
  // As demos que só mexem quando a pessoa clica continuam funcionando.
  if (reduced) {
    initReel({ reduced });
    initNav(null);
    setupEase();
    setupMotionDemo({ isTouch, reduced });
    return;
  }

  window.scrollTo(0, 0);
  const lenis = createScroll();
  lenis.stop();

  let stage = null;
  try {
    stage = createStage(document.querySelector('.gl'));
  } catch (err) {
    console.warn('WebGL indisponível, seguindo sem ele.', err);
  }
  if (stage) {
    gsap.ticker.add((time) => stage.render(time));
    lenis.on('scroll', ({ velocity }) => stage.setVelocity(velocity));
  }

  const fonts = wait(document.fonts.ready, 3000);
  const heroImg = document.querySelector('.hero__img');
  const heroImgReady = heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve();

  await fonts;   // SplitText precisa da fonte certa para medir as linhas

  // A ordem importa: cada seção fixa (pin) empurra as de baixo, então
  // os gatilhos são criados de cima para baixo.
  const hero = setupHero(stage, { isTouch });
  setupSpace(stage, { isTouch });
  startCentral(stage);
  setupServicos(stage, { isTouch });
  setupGsapDemo();
  setupTres(stage, { isTouch });
  splitTitles();
  setupMotionDemo({ isTouch, reduced, stage });
  setupProcesso();
  setupContato(stage);
  setupHud();

  initReel({ reduced });
  initNav(lenis);
  initMagnetic();

  // gancho só no modo dev, para testes no navegador
  if (import.meta.env.DEV) window.__site = { gsap, ScrollTrigger, lenis, stage };

  await runLoader([fonts, heroImgReady, hero.ready]);
  lenis.start();
  hero.intro.play();
  ScrollTrigger.refresh();
}

boot().catch((err) => {
  console.error(err);
  removeLoader();
});
