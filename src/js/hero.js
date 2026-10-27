// Hero: entrada (depois do carregamento), mergulho na viseira no scroll e parallax no mouse.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { W } from './sections/space.js';

// centro da viseira dentro da imagem do astronauta (0–1, y de cima para baixo),
// medido no recorte: o vidro vai de 17% a 65% na horizontal e de 36% a 60% na vertical
const VISOR = { x: 0.41, y: 0.476 };

export function setupHero(stage, { isTouch }) {
  const hero = document.querySelector('.hero');
  const wordWrap = hero.querySelector('.hero__word-wrap');
  const word = hero.querySelector('.hero__word');
  const figure = hero.querySelector('.hero__figure');
  const img = hero.querySelector('.hero__img');
  const grid = hero.querySelector('.hero__grid');
  const reel = hero.querySelector('.reel');
  const navParts = document.querySelectorAll('.nav__links, .nav__brand, .nav__actions');

  const gl = stage ? stage.add(img, { kind: 'hero' }) : null;

  // ---------- Entrada (montada pausada; os estados iniciais ficam escondidos sob o loader)
  const chars = SplitText.create(word, { type: 'chars' });
  const lines = SplitText.create(hero.querySelectorAll('.hero__line, .hero__kicker, .hero__aside'), {
    type: 'lines',
    mask: 'lines',
  });

  const intro = gsap.timeline({
    paused: true,
    defaults: { ease: 'expo.out' },
    onComplete: () => {
      // devolve o HTML original: volta a quebrar linha sozinho no resize
      chars.revert();
      lines.revert();
    },
  });
  intro.from(chars.chars, { yPercent: 112, duration: 1.6, stagger: 0.06 }, 0);
  if (gl) intro.to(gl.uniforms.uIntro, { value: 1, duration: 2.8, ease: 'power2.inOut' }, 0);
  else intro.from(img, { autoAlpha: 0, y: 60, duration: 1.6 }, 0.2);
  intro.from(navParts, { autoAlpha: 0, y: -14, duration: 1, stagger: 0.08 }, 0.5);
  intro.from(lines.lines, { yPercent: 105, duration: 1.2, stagger: 0.07 }, 0.8);
  if (reel) intro.from(reel, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 1.05);

  // ---------- Scroll: o hero fica fixo e a câmera mergulha na viseira.
  // O vidro escuro vira uma janela para o espaço, a janela cobre a tela
  // e Serviços nasce lá dentro (ela começa por cima do fim desta cena).
  const title = hero.querySelector('.hero__title');
  const small = hero.querySelectorAll('.hero__kicker, .hero__aside');
  const veil = hero.querySelector('.hero__veil');
  gsap.set(img, { transformOrigin: `${VISOR.x * 100}% ${VISOR.y * 100}%` });
  if (gl) gl.uniforms.uVisorC.value.set(VISOR.x, 1 - VISOR.y);

  // posição da viseira dentro do hero, sem contar transformações
  const visor = () => ({
    x: figure.offsetLeft - figure.offsetWidth / 2 + VISOR.x * img.offsetWidth,
    y: figure.offsetTop + VISOR.y * img.offsetHeight,
  });

  const dive = gsap.timeline({ defaults: { ease: 'none' } });
  dive.to(title, { x: -90, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0)
    .to(small, { y: -30, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0)
    .to(wordWrap, { scale: 1.35, autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, 0.05)
    .fromTo(img, { x: 0, y: 0, scale: 1 }, {
      x: () => window.innerWidth / 2 - visor().x,
      y: () => window.innerHeight / 2 - visor().y,
      scale: () => (window.innerWidth < 700 ? 9 : 11),
      duration: 1,
      ease: 'power3.in',
    }, 0)
    .to(veil, { opacity: 1, duration: 0.2 }, 0.62);
  if (reel) dive.to(reel, { x: 70, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0);
  if (gl) {
    const u = gl.uniforms;
    dive.to(u.uPortal, { value: 1, duration: 0.6, ease: 'power1.inOut' }, 0.08)
      .to(u.uTravel, { value: 1.6, duration: 1, ease: 'power2.in' }, 0)
      .to(u.uFade, { value: 0, duration: 0.12 }, 0.88);
  }
  if (stage) {
    // as estrelas de verdade assumem quando a janela já cobre a tela
    dive.to(stage.stars.uniforms.uOpacity, { value: 1, duration: 0.2 }, 0.78)
      .to(W, { mergulho: 1, duration: 0.35, ease: 'power2.in' }, 0.65);
  }
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => `+=${window.innerHeight * 1.6}`,
    pin: true,
    scrub: 1,
    animation: dive,
    invalidateOnRefresh: true,
  });

  // ---------- Mouse: profundidade entre a palavra e a figura
  if (!isTouch) {
    const fx = gsap.quickTo(figure, 'x', { duration: 1.4, ease: 'power3' });
    const fy = gsap.quickTo(figure, 'y', { duration: 1.4, ease: 'power3' });
    const wx = gsap.quickTo(word, 'x', { duration: 1.6, ease: 'power3' });
    const mouse = gl ? gl.uniforms.uMouse.value : null;
    const mx = mouse ? gsap.quickTo(mouse, 'x', { duration: 1.2, ease: 'power3' }) : null;
    const my = mouse ? gsap.quickTo(mouse, 'y', { duration: 1.2, ease: 'power3' }) : null;
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      fx(nx * 18);
      fy(ny * 10);
      wx(nx * -26);
      if (mx) { mx(nx); my(ny); }
    }, { passive: true });
  }

  return { intro, ready: gl ? gl.loaded : Promise.resolve() };
}
