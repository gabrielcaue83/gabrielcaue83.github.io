// A "viagem": campo de estrelas que aparece quando o hero sai, saltos de
// velocidade entre as seções e o HUD lateral com a seção atual.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function setupSpace(stage, { isTouch }) {
  if (!stage) return;

  // a entrada das estrelas e o salto principal agora fazem parte do
  // mergulho na viseira (hero.js) e da chegada em Serviços (servicos.js)

  // as estrelas acompanham o mouse
  if (!isTouch) {
    window.addEventListener('pointermove', (e) => {
      stage.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
  }
}

/** HUD na lateral direita: número e nome da seção + progresso da página. */
export function setupHud() {
  const hud = document.querySelector('.hud');
  if (!hud) return;
  const n = hud.querySelector('[data-hud-n]');
  const name = hud.querySelector('[data-hud-name]');
  const bar = hud.querySelector('[data-hud-bar]');

  // a seção atual é a última cujo topo já passou do meio da tela
  // (usa o "pin-spacer" quando a seção está fixa, porque ela mesma fica em top: 0)
  const secs = [...document.querySelectorAll('[data-hud]')].map((sec) => {
    const [num, label] = sec.dataset.hud.split('|');
    return { sec, num, label };
  });
  let atual = null;
  const check = () => {
    const linha = window.innerHeight * 0.2;
    let found = secs[0];
    for (const s of secs) {
      const box = s.sec.parentElement?.classList.contains('pin-spacer') ? s.sec.parentElement : s.sec;
      if (box.getBoundingClientRect().top <= linha) found = s;
    }
    if (found === atual) return;
    atual = found;
    n.textContent = found.num;
    name.textContent = found.label;
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: check, onRefresh: check });

  gsap.to(hud, {
    autoAlpha: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.servicos', start: 'top 40%', end: 'top top', scrub: true },
  });
  gsap.to(bar, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
  });
}

/**
 * Entrada "da profundidade": o bloco vem pequeno, transparente e um pouco
 * abaixo, e chega ao tamanho real conforme a seção sobe.
 */
export function depthIn(targets, trigger, { start = 'top 88%', end = 'top 30%', y = 70, scale = 0.9 } = {}) {
  return gsap.fromTo(targets, { autoAlpha: 0, y, scale }, {
    autoAlpha: 1, y: 0, scale: 1,
    ease: 'power2.out',
    stagger: 0.06,
    scrollTrigger: { trigger, start, end, scrub: true },
  });
}

/**
 * A estrela que liga Serviços à demo de GSAP. Serviços controla só "acende"
 * e o GSAP só "apaga"; a estrela visível é a combinação das duas. Assim,
 * rolando para cima ou para baixo, as duas cenas nunca brigam pela mesma
 * propriedade.
 */
export const estrela = { acende: 0, apaga: 0 };
let estrelaIniciada = false;
export function startEstrela() {
  if (estrelaIniciada) return;
  estrelaIniciada = true;
  const el = document.querySelector('.estrela');
  if (!el) return;
  let last = '';
  gsap.ticker.add(() => {
    const a = estrela.acende * (1 - estrela.apaga);
    const s = (0.3 + 0.7 * estrela.acende) * (1 + estrela.apaga * 2.2);
    const key = `${a.toFixed(3)}|${s.toFixed(3)}`;
    if (key === last) return;
    last = key;
    gsap.set(el, { autoAlpha: a, scale: s });
  });
}

/* ---------------------------------------------------------------
   Alavancas compartilhadas entre cenas. Regra: cada cena só mexe nas
   próprias alavancas; o valor final é calculado aqui, a cada quadro.
   --------------------------------------------------------------- */
export const W = { mergulho: 0, freio: 0, anel: 0, novaSobe: 0, novaDesce: 0 };
export const clarao = { sobe: 0, desce: 0, x: 0.5, y: 0.5 };
export const mini = { acende: 0, viaja: 0, apaga: 0, from: [], to: [] };

let centralIniciado = false;
export function startCentral(stage, total = 5) {
  if (centralIniciado) return;
  centralIniciado = true;
  const st = stage ? stage.stars.state : null;
  const elClarao = document.querySelector('.clarao');
  const minis = Array.from({ length: total }, () => {
    const el = document.createElement('div');
    el.className = 'mini-estrela';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  });
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  let lastClarao = '';

  gsap.ticker.add(() => {
    // velocidade das estrelas: mergulho (hero) freado por Serviços, anel (3D), supernova
    if (st) st.warp = Math.max(W.mergulho * (1 - W.freio), W.anel, W.novaSobe * (1 - W.novaDesce));

    // clarão da supernova
    if (elClarao) {
      const a = clarao.sobe * (1 - clarao.desce);
      const key = `${a.toFixed(3)}|${clarao.sobe.toFixed(3)}|${clarao.x}|${clarao.y}`;
      if (key !== lastClarao) {
        lastClarao = key;
        elClarao.style.setProperty('--rad', `${(8 + clarao.sobe * 170).toFixed(1)}vmax`);
        elClarao.style.setProperty('--cx', `${(clarao.x * 100).toFixed(2)}%`);
        elClarao.style.setProperty('--cy', `${(clarao.y * 100).toFixed(2)}%`);
        elClarao.style.opacity = a.toFixed(3);
        elClarao.style.visibility = a > 0.001 ? 'visible' : 'hidden';
      }
    }

    // mini-estrelas: nascem nos cartões e voam até as paradas da rota
    const alpha = mini.acende * (1 - mini.apaga);
    const k = easeIO(Math.min(1, Math.max(0, mini.viaja)));
    minis.forEach((el, i) => {
      const f = mini.from[i];
      const t = mini.to[i] || f;
      if (!f || alpha < 0.001) {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
        return;
      }
      const dx = t.x - f.x;
      const dy = t.y - f.y;
      const len = Math.hypot(dx, dy) || 1;
      const arc = Math.sin(Math.PI * k) * Math.min(140, len * 0.3) * (i % 2 ? 1 : -1);
      const x = f.x + dx * k + (-dy / len) * arc;
      const y = f.y + dy * k + (dx / len) * arc;
      const sc = 0.4 + 0.6 * mini.acende;
      el.style.visibility = 'visible';
      el.style.opacity = alpha.toFixed(3);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
    });
  });
}

/** Posição de um elemento dentro de `root`, somando offsets (ignora transformações). */
export function offsetIn(el, root) {
  let x = 0;
  let y = 0;
  for (let e = el; e && e !== root; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
  return { x, y };
}
