// 05 · Processo, 06 · Contato e os títulos que sobem linha a linha.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { W, clarao, mini, offsetIn } from './space.js';

/** Títulos com data-split nas seções "soltas": linhas sobem por trás de uma máscara. */
export function splitTitles() {
  document.querySelectorAll('.sec [data-split], .processo [data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 105,
        duration: 1.2,
        stagger: 0.08,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }),
    });
  });
}

/* ---------- 05 · Processo ----------
   desktop: as estrelas (que eram os cartões) pousam nas paradas da rota, o
   satélite percorre a rota acendendo cada passo e, no fim, explode numa
   supernova que revela o contato. */
export function setupProcesso() {
  const sec = document.querySelector('.processo');
  if (!sec) return;
  const passos = [...sec.querySelectorAll('[data-passo]')];
  const linha = sec.querySelector('.rota__linha');
  const sat = sec.querySelector('.rota__sat');
  const limites = [0, 0.3, 0.62, 0.9];
  const mm = gsap.matchMedia();

  mm.add('(min-width: 901px)', () => {
    sec.classList.add('cena--live', 'cena--chain');
    const inner = sec.querySelector('.processo__inner');
    const head = sec.querySelector('.processo__head');
    const rota = sec.querySelector('.rota');
    const guia = sec.querySelector('.rota__guia');
    const stopsG = sec.querySelector('.rota__stops');
    const NS = 'http://www.w3.org/2000/svg';
    const L = linha.getTotalLength();
    const pts = limites.map((t) => linha.getPointAtLength(L * t));
    const fim = linha.getPointAtLength(L);
    const stops = pts.map((p) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'rota__stop');
      c.setAttribute('cx', p.x.toFixed(1));
      c.setAttribute('cy', p.y.toFixed(1));
      c.setAttribute('r', '6');
      stopsG.appendChild(c);
      return c;
    });
    gsap.set(sat, { x: pts[0].x, y: pts[0].y });

    // destino das mini-estrelas (as 4 paradas + o início, onde nasce o satélite)
    // e o ponto do clarão (o fim da rota), em coordenadas da tela com a cena fixa
    const calcTo = () => {
      const o = offsetIn(rota, sec);
      const k = rota.clientWidth / 1200;   // o viewBox tem 1200 de largura
      const tela = (p) => ({ x: o.x + p.x * k, y: o.y + p.y * k });
      mini.to = [...pts.map(tela), tela(pts[0])];
      const f = tela(fim);
      clarao.x = f.x / window.innerWidth;
      clarao.y = f.y / window.innerHeight;
    };

    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    // 1 · chegada das estrelas
    tl.fromTo(mini, { viaja: 0 }, { viaja: 1, duration: 0.9, immediateRender: false }, 0)
      .fromTo(guia, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.1)
      .fromTo(head, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.2)
      .fromTo(passos.flatMap((p) => [...p.children]), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.04 }, 0.4)
      .fromTo(stops, { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' }, { scale: 1, autoAlpha: 1, duration: 0.2, stagger: 0.04, ease: 'back.out(3)' }, 0.85)
      .fromTo(sat, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 0.9)
      .fromTo(mini, { apaga: 0 }, { apaga: 1, duration: 0.2, immediateRender: false }, 0.92);

    // 2 · a rota: o satélite percorre e acende cada passo
    const R0 = 1.2;
    const RD = 1.6;
    tl.fromTo(linha, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: RD }, R0)
      .to(sat, { motionPath: { path: linha, align: linha, alignOrigin: [0.5, 0.5] }, duration: RD }, R0)
      .to({}, { duration: 0.3 });

    // 3 · supernova: o satélite incha e explode em luz
    const nova = tl.duration();
    tl.to(sat, { scale: 2.6, transformOrigin: '50% 50%', duration: 0.3, ease: 'power2.in' }, nova)
      .fromTo(clarao, { sobe: 0 }, { sobe: 1, duration: 0.7, ease: 'power2.in', immediateRender: false }, nova + 0.15)
      .fromTo(W, { novaSobe: 0 }, { novaSobe: 1, duration: 0.6, ease: 'power2.in', immediateRender: false }, nova + 0.2)
      .to(inner, { autoAlpha: 0, duration: 0.3 }, nova + 0.55)
      .to({}, { duration: 0.15 });

    ScrollTrigger.create({
      trigger: sec,
      start: 'top top',
      end: () => `+=${window.innerHeight * 2.8}`,
      pin: true,
      scrub: 1,
      animation: tl,
      invalidateOnRefresh: true,
      onRefresh: calcTo,
    });
    calcTo();
    tl.eventCallback('onUpdate', () => {
      const t = tl.time();
      const p = Math.min(1, Math.max(0, (t - R0) / RD));
      const aceso = t >= 0.9;
      passos.forEach((el, i) => el.classList.toggle('is-on', aceso && p >= limites[i]));
      stops.forEach((el, i) => el.classList.toggle('is-on', aceso && p >= limites[i]));
    });
    return () => {
      sec.classList.remove('cena--live', 'cena--chain');
      stops.forEach((c) => c.remove());
    };
  });

  mm.add('(max-width: 900px)', () => {
    passos.forEach((el) => gsap.from(el, {
      y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    }));
  });
}

/* ---------- 06 · Contato: surge quando a luz da supernova baixa ---------- */
export function setupContato(stage) {
  const sec = document.querySelector('.contato');
  if (!sec) return;
  const left = sec.querySelector('.contato__left');
  const lap = sec.querySelector('.contato__media img');
  const lapGL = stage && lap ? stage.add(lap, { uniforms: { uRadius: 0, uFade: 1, uZoom: 1.08 } }) : null;

  gsap.from(sec.querySelectorAll('.form .field, .form__foot, .no-ar'), {
    y: 24, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: sec.querySelector('.form'), start: 'top 85%', once: true },
  });
  if (lapGL) {
    gsap.fromTo(lapGL.uniforms.uShift.value, { y: -0.045 }, {
      y: 0.045, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  const mm = gsap.matchMedia();
  // desktop: o contato começa por baixo do clarão e aparece quando a luz baixa
  mm.add('(min-width: 901px)', () => {
    sec.classList.add('cena--chain');
    // fixo enquanto a luz baixa: o contato surge parado no lugar (e a página
    // ganha rolagem suficiente para o clarão terminar, já que é a última seção)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: () => `+=${window.innerHeight * 0.7}`,
        scrub: true,
        pin: true,
        invalidateOnRefresh: true,
      },
    });
    tl.fromTo(clarao, { desce: 0 }, { desce: 1, duration: 1, ease: 'power2.out', immediateRender: false }, 0)
      .fromTo(W, { novaDesce: 0 }, { novaDesce: 1, duration: 0.8, immediateRender: false }, 0)
      .fromTo(left, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 0.1);
    if (lapGL) tl.fromTo(lapGL.uniforms.uReveal, { value: 0 }, { value: 1, duration: 0.8 }, 0.2);
    else if (lap) tl.fromTo(lap.parentElement, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0.2);
    return () => sec.classList.remove('cena--chain');
  });

  // celular e tablet: um clarão no centro da tela quando o contato chega
  mm.add('(max-width: 900px)', () => {
    clarao.x = 0.5;
    clarao.y = 0.5;
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 85%', end: 'top 10%', scrub: true } });
    tl.fromTo(clarao, { sobe: 0 }, { sobe: 1, duration: 0.45, ease: 'power2.in', immediateRender: false }, 0)
      .fromTo(clarao, { desce: 0 }, { desce: 1, duration: 0.55, ease: 'power2.out', immediateRender: false }, 0.45)
      .fromTo(left, { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.5 }, 0.45);
    if (lapGL) tl.fromTo(lapGL.uniforms.uReveal, { value: 0 }, { value: 1, duration: 0.5 }, 0.5);
  });
}
