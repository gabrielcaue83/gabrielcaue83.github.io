// Constelação: pontos que vêm de longe (como as partículas do anel que acabou
// de explodir) e pousam no contorno de elementos da página, desenhando a
// moldura deles. Cada elemento ("âncora") tem o próprio progresso.
// As posições são em pixels de tela: o retângulo de cada âncora é lido do
// DOM a cada quadro, então funciona com a página fixa ou rolando.
import * as THREE from 'three';

const MAX = 6;

const vert = /* glsl */ `
  attribute vec2 aFrom;
  attribute vec2 aTarget;   // x = índice da âncora, y = posição no contorno (0–1)
  attribute float aSeed;
  uniform vec4 uRects[${MAX}];
  uniform float uProg[${MAX}];
  uniform float uFade[${MAX}];
  uniform vec2 uView;
  uniform float uPR;
  uniform float uTime;
  varying float vA;

  // ponto no contorno do retângulo (x, y, largura, altura), andando no sentido horário
  vec2 contorno(vec4 r, float t) {
    float w = r.z;
    float h = r.w;
    float d = t * 2.0 * (w + h);
    if (d < w) return vec2(r.x + d, r.y);
    d -= w;
    if (d < h) return vec2(r.x + w, r.y + d);
    d -= h;
    if (d < w) return vec2(r.x + w - d, r.y + h);
    d -= w;
    return vec2(r.x, r.y + h - d);
  }

  void main() {
    int i = int(aTarget.x + 0.5);
    vec4 r = uRects[i];
    float pr = uProg[i];
    float fd = uFade[i];
    vec2 alvo = contorno(r, aTarget.y);
    vec2 origem = uView * 0.5 + aFrom;
    float k = clamp(pr * 1.5 - aSeed * 0.5, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    vec2 s = mix(origem, alvo, k);
    s += vec2(sin(uTime * 2.0 + aSeed * 30.0), cos(uTime * 1.7 + aSeed * 21.0)) * 7.0 * (1.0 - k);
    gl_Position = vec4(s.x / uView.x * 2.0 - 1.0, 1.0 - s.y / uView.y * 2.0, 0.0, 1.0);
    gl_PointSize = uPR * mix(3.0, 1.7, k) * (0.7 + aSeed * 0.6);
    vA = smoothstep(0.0, 0.1, pr) * (1.0 - fd) * (0.45 + 0.55 * aSeed);
  }
`;

const frag = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(0.95), (1.0 - smoothstep(0.15, 0.5, d)) * vA);
  }
`;

export function createConstellation(elements, { perAnchor = 230 } = {}) {
  const anchors = elements.slice(0, MAX);
  const count = anchors.length * perAnchor;
  const from = new Float32Array(count * 2);
  const target = new Float32Array(count * 2);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 380 + Math.random() * 900;
    from[i * 2] = Math.cos(a) * d;
    from[i * 2 + 1] = Math.sin(a) * d;
    target[i * 2] = i % anchors.length;
    target[i * 2 + 1] = Math.random();
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aFrom', new THREE.BufferAttribute(from, 2));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(target, 2));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const uniforms = {
    uRects: { value: Array.from({ length: MAX }, () => new THREE.Vector4()) },
    uProg: { value: new Array(MAX).fill(0) },
    uFade: { value: new Array(MAX).fill(0) },
    uView: { value: new THREE.Vector2(1, 1) },
    uPR: { value: 1 },
    uTime: { value: 0 },
  };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(points);

  // o que as cenas animam com GSAP: p = pontos chegando, f = pontos somem (moldura assume)
  const state = anchors.map(() => ({ p: 0, f: 0 }));

  return {
    scene,
    state,
    /** chamado pelo stage a cada quadro; devolve false quando não há nada para desenhar */
    update(W, H, PR, time) {
      let vivo = false;
      anchors.forEach((el, i) => {
        const s = state[i];
        uniforms.uProg.value[i] = s.p;
        uniforms.uFade.value[i] = s.f;
        if (s.p > 0.001 && s.f < 0.999) {
          vivo = true;
          const r = el.getBoundingClientRect();
          uniforms.uRects.value[i].set(r.left, r.top, r.width, r.height);
        }
      });
      uniforms.uView.value.set(W, H);
      uniforms.uPR.value = PR;
      uniforms.uTime.value = time;
      return vivo;
    },
  };
}
