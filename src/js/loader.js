// Tela de carregamento: o contador anda conforme as tarefas terminam
// (fonte, astronauta, textura WebGL), nunca antes de um tempo mínimo,
// e sai deslizando para cima. Resolve quando a saída começa, para a
// entrada do hero acontecer por baixo, junto.
import { gsap } from 'gsap';

const timeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

export function runLoader(tasks, { minTime = 1.3, maxWait = 6000 } = {}) {
  const el = document.querySelector('.loader');
  if (!el) return Promise.resolve();
  const num = el.querySelector('.loader__num');
  const bar = el.querySelector('.loader__bar i');

  let done = 0;
  let real = tasks.length ? 0 : 1;
  tasks.forEach((t) => timeout(Promise.resolve(t).catch(() => {}), maxWait).then(() => {
    done += 1;
    real = done / tasks.length;
  }));

  return new Promise((resolve) => {
    const start = performance.now();
    let shown = 0;
    const tick = () => {
      const cap = Math.min(1, (performance.now() - start) / 1000 / minTime);
      const target = Math.min(real, cap);
      shown += (target - shown) * 0.14;
      if (target === 1 && shown > 0.994) shown = 1;
      num.textContent = Math.round(shown * 100);
      bar.style.transform = `scaleX(${shown})`;
      if (shown === 1) {
        gsap.ticker.remove(tick);
        exit();
      }
    };
    gsap.ticker.add(tick);

    function exit() {
      gsap.timeline({ onComplete: () => el.remove() })
        .to(el.querySelectorAll('.loader__label, .loader__count, .loader__bar'), {
          yPercent: -40, autoAlpha: 0, duration: 0.5, ease: 'power2.in', stagger: 0.04,
        })
        .to(el, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.15')
        .call(resolve, null, '-=0.75');
    }
  });
}

export function removeLoader() {
  document.querySelector('.loader')?.remove();
}
