// Uma tela WebGL fixa, do tamanho da janela, desenha tudo em 3 camadas:
//   1. campo de estrelas (fundo de todas as seções escuras)
//   2. planos que copiam a posição das <img> do layout (astronauta, imagens)
//   3. cenas 3D recortadas no retângulo de um elemento (o planeta)
// A <img> continua no HTML (layout, SEO, leitor de tela) e só fica invisível.
import * as THREE from 'three';
import { mediaVert, mediaFrag, heroVert, heroFrag, slidesFrag } from './shaders.js';
import { createStarfield } from './starfield.js';
import { createConstellation } from './constellation.js';

export function createStage(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  document.documentElement.classList.add('is-webgl');

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
  const items = new Map();
  const scenes = [];
  const constellations = [];
  const stars = createStarfield({ count: window.innerWidth < 700 ? 900 : 1500 });
  let W = 0;
  let H = 0;
  let PR = 1;
  let velocity = 0;
  let targetVelocity = 0;
  let lastTime = 0;

  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    PR = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
    renderer.setPixelRatio(PR);
    renderer.setSize(W, H, false);
    camera.left = -W / 2;
    camera.right = W / 2;
    camera.top = H / 2;
    camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    stars.resize(W, H, PR);
    for (const s of scenes) s.lastW = 0;   // força o resize da cena no próximo quadro
  };
  resize();
  window.addEventListener('resize', resize);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const it = items.get(e.target);
      if (it) it.inView = e.isIntersecting;
      const sc = scenes.find((s) => s.el === e.target);
      if (sc) sc.inView = e.isIntersecting;
    }
  }, { rootMargin: '20%' });

  // Com srcset, naturalWidth vem "corrigido" pela densidade e não bate com os
  // pixels do arquivo, o que quebra a textura. Então a textura usa uma Image
  // nova com a mesma URL (já está no cache), que tem o tamanho real.
  const imageSource = (img) => new Promise((resolve, reject) => {
    img.loading = 'eager';
    if (img.complete && img.naturalWidth) return resolve();
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', reject, { once: true });
  }).then(() => {
    const src = new Image();
    src.decoding = 'async';
    src.src = img.currentSrc || img.src;
    return src.decode().then(() => src);
  });

  const makeTexture = (src, premultiply = false) => {
    const tex = new THREE.Texture(src);
    tex.premultiplyAlpha = premultiply;
    tex.needsUpdate = true;
    renderer.initTexture?.(tex);
    return tex;
  };

  const baseMediaUniforms = () => ({
    uSize: { value: new THREE.Vector2(1, 1) },
    uImg: { value: new THREE.Vector2(1, 1) },
    uReveal: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
    uRadius: { value: 10 },
    uSeed: { value: Math.random() * 20 },
    uVelocity: { value: 0 },
  });

  function register(el, material, kind, extra = {}) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    const it = { el, mesh, uniforms: material.uniforms, kind, ready: false, inView: false, ...extra };
    items.set(el, it);
    io.observe(el);
    return it;
  }

  /**
   * Plano de uma <img>. kind 'hero' usa o shader do astronauta; o resto, o de imagem.
   * uniforms: valores iniciais (uRadius, uFade, uZoom, uColor…)
   */
  function add(img, { kind = 'media', uniforms: initial = {} } = {}) {
    const isHero = kind === 'hero';
    const uniforms = isHero
      ? {
          uTex: { value: null },
          uSize: { value: new THREE.Vector2(1, 1) },
          uIntro: { value: 0 },
          uOut: { value: 0 },
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2() },
          uCell: { value: 7 },
          uPortal: { value: 0 },
          uVisorC: { value: new THREE.Vector2(0.41, 0.52) },
          uVisorR: { value: new THREE.Vector2(0.27, 0.14) },
          uTravel: { value: 0 },
          uFade: { value: 1 },
        }
      : {
          ...baseMediaUniforms(),
          uTex: { value: null },
          uHover: { value: 0 },
          uColor: { value: 0 },
          uZoom: { value: 1 },
          uShift: { value: new THREE.Vector2() },
          uFade: { value: 0 },
          uOpacity: { value: 1 },
        };
    if (!isHero) uniforms.uMouse.value.set(0.5, 0.5);
    for (const [k, v] of Object.entries(initial)) if (uniforms[k]) uniforms[k].value = v;

    const material = new THREE.ShaderMaterial({
      vertexShader: isHero ? heroVert : mediaVert,
      fragmentShader: isHero ? heroFrag : mediaFrag,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const it = register(img, material, kind);
    it.loaded = imageSource(img)
      .then((src) => {
        uniforms.uTex.value = makeTexture(src, isHero);
        if (uniforms.uImg) uniforms.uImg.value.set(src.naturalWidth, src.naturalHeight);
        scene.add(it.mesh);
        it.ready = true;
      })
      .catch(() => img.classList.add('gl-fail'));
    return it;
  }

  /** Plano que troca entre 3 imagens (seção de serviços). Segue o retângulo de `frame`. */
  function addSlides(frame, imgs, initial = {}) {
    const uniforms = {
      ...baseMediaUniforms(),
      uT0: { value: null },
      uT1: { value: null },
      uT2: { value: null },
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
      uWhite: { value: 0 },
    };
    uniforms.uRadius.value = 12;
    for (const [k, v] of Object.entries(initial)) if (uniforms[k]) uniforms[k].value = v;
    const material = new THREE.ShaderMaterial({
      vertexShader: mediaVert, fragmentShader: slidesFrag, uniforms,
      transparent: true, depthTest: false, depthWrite: false,
    });
    const it = register(frame, material, 'slides');
    it.loaded = Promise.all(imgs.slice(0, 3).map(imageSource))
      .then((srcs) => {
        srcs.forEach((s, i) => { uniforms[`uT${i}`].value = makeTexture(s); });
        uniforms.uImg.value.set(srcs[0].naturalWidth, srcs[0].naturalHeight);
        imgs.forEach((im) => im.classList.add('is-gl'));
        scene.add(it.mesh);
        it.ready = true;
      })
      .catch(() => frame.classList.add('gl-fail'));
    return it;
  }

  /** Pontos que pousam no contorno de elementos da página (ver constellation.js). */
  function addConstellation(elements, opts) {
    const c = createConstellation(elements, opts);
    constellations.push(c);
    return c;
  }

  /** Cena 3D desenhada só dentro do retângulo de `el`. */
  function addScene(el, sceneObj) {
    const sc = { el, ...sceneObj, inView: false, lastW: 0, lastH: 0 };
    scenes.push(sc);
    io.observe(el);
    return sc;
  }

  function render(time) {
    const dt = Math.min(0.05, Math.max(0.001, time - lastTime || 0.016));
    lastTime = time;
    targetVelocity *= 0.9;
    velocity += (targetVelocity - velocity) * 0.12;
    const bend = Math.max(-22, Math.min(22, velocity * 0.6));
    const speed = Math.min(2, Math.abs(velocity) / 40);

    renderer.setViewport(0, 0, W, H);
    renderer.setScissorTest(false);
    renderer.clear();

    // 1 · estrelas
    stars.update(dt, time, speed);
    if (stars.uniforms.uOpacity.value > 0.001) renderer.render(stars.scene, stars.camera);

    // 2 · planos
    for (const it of items.values()) {
      const u = it.uniforms;
      let alive;
      if (it.kind === 'hero') alive = u.uIntro.value > 0 && u.uOut.value < 1 && u.uFade.value > 0.001;
      else alive = u.uReveal.value > 0 && (u.uOpacity ? u.uOpacity.value > 0 : true);
      const show = it.ready && it.inView && alive;
      it.mesh.visible = show;
      if (!show) continue;
      const r = it.el.getBoundingClientRect();
      it.mesh.scale.set(r.width, r.height, 1);
      it.mesh.position.set(r.left + r.width / 2 - W / 2, H / 2 - r.top - r.height / 2, 0);
      u.uSize.value.set(r.width, r.height);
      u.uTime.value = time;
      if (u.uVelocity) u.uVelocity.value = bend;
    }
    renderer.render(scene, camera);

    // 3 · cenas 3D recortadas
    for (const sc of scenes) {
      if (!sc.inView || (sc.isActive && !sc.isActive())) continue;
      const r = sc.el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= H || r.width < 2 || r.height < 2) continue;
      if (Math.abs(r.width - sc.lastW) > 0.5 || Math.abs(r.height - sc.lastH) > 0.5) {
        sc.resize(r.width, r.height, PR);
        sc.lastW = r.width;
        sc.lastH = r.height;
      }
      sc.update(dt, time);
      const y = H - r.bottom;
      renderer.setViewport(r.left, y, r.width, r.height);
      renderer.setScissor(r.left, y, r.width, r.height);
      renderer.setScissorTest(true);
      renderer.clearDepth();
      renderer.render(sc.scene, sc.camera);
      if (sc.onRendered) sc.onRendered(renderer.info, dt);
    }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);

    // 4 · constelações (por cima de tudo, em pixels de tela)
    for (const c of constellations) {
      if (c.update(W, H, PR, time)) renderer.render(c.scene, camera);
    }
  }

  return {
    add,
    addSlides,
    addScene,
    addConstellation,
    render,
    stars,
    renderer,
    setVelocity(v) { targetVelocity = v; },
    setPointer(x, y) {
      stars.state.mx = x;
      stars.state.my = y;
    },
  };
}
