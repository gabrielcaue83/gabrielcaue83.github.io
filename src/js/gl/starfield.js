// Campo de estrelas que liga as seções: a câmera viaja para a frente o tempo
// todo, acelera com a velocidade do scroll e, quando corre, as estrelas viram
// riscos (efeito "dobra espacial"). Fica invisível no hero.
import * as THREE from 'three';

const starVert = /* glsl */ `
  attribute float aSeed;
  attribute float aTail;
  uniform float uTravel;
  uniform float uDepth;
  uniform float uPR;
  uniform float uSize;
  uniform float uTime;
  uniform float uStretch;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.z = mod(p.z + uTravel, uDepth) - uDepth;        // sempre entre -uDepth e 0
    p.z -= aTail * uStretch;                           // a cauda do risco fica para trás
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float near = 1.0 - smoothstep(-14.0, -2.0, p.z);
    float far = smoothstep(-uDepth, -uDepth * 0.55, p.z);
    float twinkle = 0.7 + 0.3 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 40.0);
    vAlpha = near * far * twinkle * (0.3 + 0.7 * aSeed);
    gl_PointSize = uSize * uPR * (0.6 + aSeed) * (30.0 / -mv.z);
  }
`;

const pointFrag = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.15, 0.5, d);
    gl_FragColor = vec4(vec3(0.93), a * vAlpha * uOpacity);
  }
`;

const lineFrag = /* glsl */ `
  uniform float uOpacity;
  uniform float uStreak;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vec3(0.9), vAlpha * uOpacity * uStreak * 0.6);
  }
`;

export function createStarfield({ count = 1500, depth = 260 } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, depth + 20);

  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // espalha num túnel: quase nada no centro exato, para não "piscar" na câmera
    const ang = Math.random() * Math.PI * 2;
    const rad = 4 + Math.pow(Math.random(), 0.7) * 70;
    pos[i * 3] = Math.cos(ang) * rad;
    pos[i * 3 + 1] = Math.sin(ang) * rad * 0.7;
    pos[i * 3 + 2] = -Math.random() * depth;
    seed[i] = Math.random();
  }

  const uniforms = {
    uTravel: { value: 0 },
    uDepth: { value: depth },
    uPR: { value: 1 },
    uSize: { value: 2.1 },
    uTime: { value: 0 },
    uStretch: { value: 0 },
    uOpacity: { value: 0 },
    uStreak: { value: 0 },
  };

  // pontos
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aTail', new THREE.BufferAttribute(new Float32Array(count), 1));
  const points = new THREE.Points(g, new THREE.ShaderMaterial({
    vertexShader: starVert, fragmentShader: pointFrag, uniforms,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;

  // riscos: dois vértices por estrela (cabeça e cauda)
  const lp = new Float32Array(count * 6);
  const ls = new Float32Array(count * 2);
  const lt = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 2; k++) {
      lp.set(pos.subarray(i * 3, i * 3 + 3), (i * 2 + k) * 3);
      ls[i * 2 + k] = seed[i];
      lt[i * 2 + k] = k;
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lg.setAttribute('aSeed', new THREE.BufferAttribute(ls, 1));
  lg.setAttribute('aTail', new THREE.BufferAttribute(lt, 1));
  const lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    vertexShader: starVert, fragmentShader: lineFrag, uniforms,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  }));
  lines.frustumCulled = false;

  scene.add(points, lines);

  // warp: salto principal (hero → espaço); warps: pulsos menores entre seções
  const state = { warp: 0, warps: {}, mx: 0, my: 0, rx: 0, ry: 0 };

  return {
    scene,
    camera,
    uniforms,
    state,
    resize(w, h, pr) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uPR.value = pr;
    },
    /** dt em segundos, speed = velocidade do scroll já normalizada (0…~2) */
    update(dt, time, speed) {
      let warp = state.warp;
      for (const k in state.warps) warp = Math.max(warp, state.warps[k]);
      const boost = speed + warp * 2.4;
      uniforms.uTravel.value += dt * (2.2 + boost * 34);
      uniforms.uStretch.value = Math.min(24, boost * 8);
      // riscos discretos: o texto por cima precisa continuar legível
      uniforms.uStreak.value = Math.min(0.75, boost * 0.6);
      uniforms.uTime.value = time;
      // a câmera olha levemente para onde o mouse está
      state.rx += (state.my * 0.05 - state.rx) * 0.04;
      state.ry += (-state.mx * 0.07 - state.ry) * 0.04;
      camera.rotation.set(state.rx, state.ry, 0);
    },
  };
}
