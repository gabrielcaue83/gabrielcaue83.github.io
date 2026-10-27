// Cena 3D da seção Three.js: um planeta com anel que se monta conforme o scroll.
//   etapa 1 · geometria  → só a malha de triângulos (wireframe)
//   etapa 2 · material   → superfície com textura e luz que gira
//   etapa 3 · partículas → milhares de pontos voam até formar o anel
//   etapa 4 · interação  → satélite em órbita; arrastar gira o planeta
import * as THREE from 'three';

const R = 1.6;
const WIRE_TRIS = 20 * 4 ** 3;   // icosaedro com detalhe 3

// textura de faixas, tipo gigante gasoso, toda em cinza
function bandTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  for (let y = 0; y < 512; y++) {
    const t = y / 512;
    const v = 150
      + 46 * Math.sin(t * 21 + Math.sin(t * 6.5) * 2.2)
      + 22 * Math.sin(t * 63 + 1.3)
      + 10 * Math.sin(t * 140);
    const k = Math.max(40, Math.min(235, v)) | 0;
    g.fillStyle = `rgb(${k},${k},${k + 3})`;
    g.fillRect(0, y, 1024, 1);
  }
  // redemoinhos: manchas alongadas na horizontal
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * 1024;
    const y = 60 + Math.random() * 392;
    const w = 30 + Math.random() * 160;
    const h = 2 + Math.random() * 7;
    const k = 110 + Math.random() * 120;
    g.globalAlpha = 0.18 + Math.random() * 0.25;
    g.fillStyle = `rgb(${k | 0},${k | 0},${(k + 3) | 0})`;
    g.beginPath();
    g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const ringVert = /* glsl */ `
  attribute vec3 aRing;
  attribute float aSeed;
  uniform float uProgress;
  uniform float uTime;
  uniform float uPR;
  uniform float uFade;
  uniform float uScatter;
  varying float vA;
  void main() {
    float r = length(aRing.xz);
    float ang = atan(aRing.z, aRing.x) + uTime * (0.55 / r);   // os de dentro giram mais rápido
    vec3 ring = vec3(cos(ang) * r, aRing.y, sin(ang) * r);
    float k = smoothstep(0.0, 1.0, clamp(uProgress * 1.35 - aSeed * 0.35, 0.0, 1.0));
    vec3 p = mix(position, ring, k);
    // saída: cada partícula foge para fora e para cima/baixo, passando pela câmera
    vec3 dir = normalize(vec3(ring.x, (aSeed - 0.5) * 1.6, ring.z));
    p += dir * uScatter * (3.0 + aSeed * 9.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPR * (1.1 + aSeed * 1.7) * (9.0 / -mv.z);
    vA = (0.35 + 0.65 * aSeed) * clamp(uProgress * 2.5, 0.0, 1.0) * uFade;
  }
`;
const ringFrag = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(0.94), (1.0 - smoothstep(0.2, 0.5, d)) * vA);
  }
`;

// brilho de atmosfera na borda (fresnel)
const glowVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const glowFrag = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(vN, vV)), 3.0);
    gl_FragColor = vec4(vec3(0.85, 0.87, 0.92), f * uOpacity);
  }
`;

export function createPlanet({ particles = 7000 } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.4, 10);

  const rig = new THREE.Group();      // posição/escala na tela
  const tilt = new THREE.Group();     // inclinação do eixo
  const spin = new THREE.Group();     // giro (scroll + arraste)
  tilt.rotation.set(0.32, 0, 0.38);
  rig.add(tilt);
  tilt.add(spin);
  scene.add(rig);

  // luzes
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(5, 2.5, 4);
  const rim = new THREE.DirectionalLight(0xdfe4ff, 1.4);
  rim.position.set(-5, 2, -4);
  scene.add(key, rim);

  // 1 · malha
  const wireGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 1.002, 3));
  const wireMat = new THREE.LineBasicMaterial({ color: 0xe6e6ea, transparent: true, opacity: 0 });
  const wire = new THREE.LineSegments(wireGeo, wireMat);
  spin.add(wire);

  // 2 · superfície
  const solidGeo = new THREE.SphereGeometry(R, 96, 64);
  const solidMat = new THREE.MeshStandardMaterial({
    map: bandTexture(), roughness: 0.85, metalness: 0.05, transparent: true, opacity: 0,
  });
  const solid = new THREE.Mesh(solidGeo, solidMat);
  spin.add(solid);

  const glowMat = new THREE.ShaderMaterial({
    vertexShader: glowVert, fragmentShader: glowFrag,
    uniforms: { uOpacity: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 32), glowMat);
  tilt.add(glow);

  // 3 · anel de partículas (partem espalhadas e voam até o anel)
  const start = new Float32Array(particles * 3);
  const ring = new Float32Array(particles * 3);
  const seed = new Float32Array(particles);
  for (let i = 0; i < particles; i++) {
    const u = Math.random();
    const v = Math.random();
    const th = u * Math.PI * 2;
    const ph = Math.acos(2 * v - 1);
    const rr = 5 + Math.random() * 6;
    start[i * 3] = rr * Math.sin(ph) * Math.cos(th);
    start[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th);
    start[i * 3 + 2] = rr * Math.cos(ph);
    // faixas com espaços, como os anéis de Saturno
    let r = 2.15 + Math.pow(Math.random(), 1.4) * 1.6;
    if (r > 2.9 && r < 3.02) r += 0.14;
    const a = Math.random() * Math.PI * 2;
    ring[i * 3] = Math.cos(a) * r;
    ring[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
    ring[i * 3 + 2] = Math.sin(a) * r;
    seed[i] = Math.random();
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(start, 3));
  ringGeo.setAttribute('aRing', new THREE.BufferAttribute(ring, 3));
  ringGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const ringUniforms = {
    uProgress: { value: 0 }, uTime: { value: 0 }, uPR: { value: 1 }, uFade: { value: 1 }, uScatter: { value: 0 },
  };
  const ringPts = new THREE.Points(ringGeo, new THREE.ShaderMaterial({
    vertexShader: ringVert, fragmentShader: ringFrag, uniforms: ringUniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  ringPts.frustumCulled = false;
  tilt.add(ringPts);

  // 4 · satélite e órbita
  const orbit = new THREE.Group();
  orbit.rotation.set(-0.5, 0, 0.22);
  tilt.add(orbit);
  const orbitPts = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    orbitPts.push(new THREE.Vector3(Math.cos(a) * 4.3, 0, Math.sin(a) * 4.3));
  }
  const orbitMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  orbit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPts), orbitMat));

  // órbita "fantasma": continua a elipse do palco que deitou na demo de GSAP
  // (fica no rig, quase deitada, e some conforme o planeta chega)
  const ghostPts = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    ghostPts.push(new THREE.Vector3(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4));
  }
  const ghostMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const ghostOrbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ghostPts), ghostMat);
  ghostOrbit.rotation.x = 0.25;
  rig.add(ghostOrbit);

  const sat = new THREE.Group();
  const satMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x9ea2ad, roughness: 0.3, metalness: 0.8, transparent: true, opacity: 0, side: THREE.DoubleSide });
  sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.26), satMat));
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.16), panelMat);
  sat.add(panel);
  orbit.add(sat);

  // ---------- estado
  const st = {
    progress: 0,        // 0…1 ao longo das 4 etapas
    enter: 0,           // 0…1 entrada da cena
    exit: 0,            // 0…1 saída da cena
    rot: 0,             // giro acumulado
    vel: 0,             // velocidade do arraste
    mx: 0,
    my: 0,
    layout: 'desk',
    aspect: 1.6,
  };
  const step = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));

  function applyProgress(p) {
    const solidIn = step(0.25, 0.45, p);
    const ringIn = step(0.5, 0.72, p);
    const satIn = step(0.76, 0.9, p);
    // na saída o planeta some primeiro; o anel dura mais e se espalha
    const fade = (1 - step(0, 0.55, st.exit)) * st.enter;
    const ringFade = (1 - step(0.55, 1, st.exit)) * st.enter;

    // a malha já aparece enquanto o planeta chega (etapa 1 começa na entrada)
    wireMat.opacity = (1 - solidIn) * fade;
    solidMat.opacity = solidIn * fade;
    solid.visible = solidMat.opacity > 0.001;
    glowMat.uniforms.uOpacity.value = solidIn * 0.9 * fade;
    glow.visible = glowMat.uniforms.uOpacity.value > 0.001;
    wire.visible = wireMat.opacity > 0.001;
    ringUniforms.uProgress.value = ringIn;
    ringUniforms.uFade.value = ringFade;
    ringUniforms.uScatter.value = step(0.2, 1, st.exit);
    orbitMat.opacity = satIn * 0.22 * fade;
    ghostMat.opacity = Math.pow(1 - Math.min(1, st.enter), 1.5) * 0.75 * (st.enter > 0.001 ? 1 : 0);
    ghostOrbit.visible = ghostMat.opacity > 0.001;
    satMat.opacity = satIn * fade;
    panelMat.opacity = satIn * fade;
    sat.scale.setScalar(0.001 + satIn);

    // a luz "varre" o planeta durante a etapa 2
    const la = -1.4 + solidIn * 2.2;
    key.position.set(Math.cos(la) * 6, 2.5, Math.sin(la) * 6 + 2);
  }

  return {
    scene,
    camera,
    // a malha é desenhada com linhas, então os triângulos dela são somados à parte
    stats: () => ({ particles, wireTris: wire.visible ? WIRE_TRIS : 0 }),
    setProgress(p) { st.progress = p; },
    setEnter(v) { st.enter = v; },
    setExit(v) { st.exit = v; },
    setPointer(x, y) { st.mx = x; st.my = y; },
    drag(dx) { st.vel += dx * 0.0045; },
    resize(w, h, pr) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      ringUniforms.uPR.value = pr;
      st.layout = w < 700 ? 'mobile' : w < 1000 ? 'tablet' : 'desk';
      st.aspect = w / h;
    },
    update(dt, time) {
      // inércia do arraste
      st.rot += st.vel;
      st.vel *= Math.pow(0.04, dt);
      spin.rotation.y = time * 0.12 + st.rot;
      ringUniforms.uTime.value = time;
      const a = time * 0.45;
      sat.position.set(Math.cos(a) * 4.3, 0, Math.sin(a) * 4.3);
      sat.rotation.y = -a;
      panel.rotation.x = Math.PI / 2;

      // posição na tela: à direita no desktop, embaixo no celular
      const lay = st.layout;
      const baseX = lay === 'desk' ? 1.45 : 0;
      const baseY = lay === 'mobile' ? -0.75 : lay === 'tablet' ? -0.6 : 0.1;
      // em tela de pé (celular) o planeta encolhe junto com a largura
      const baseS = lay === 'mobile' ? Math.max(0.36, Math.min(0.62, st.aspect * 0.98)) : lay === 'tablet' ? 0.8 : 0.78;
      const e = st.enter;
      const x = st.exit;
      // saída: o planeta vai para o centro e vem na direção da câmera (atravessamos o anel)
      rig.position.set(baseX * (1 - x), baseY * (1 - x), (1 - e) * -6 + x * x * 8.6);
      rig.scale.setScalar(baseS * (0.55 + 0.45 * e));
      tilt.rotation.x = 0.32 + st.my * 0.12;
      tilt.rotation.z = 0.38 + st.mx * 0.08;

      applyProgress(st.progress);
    },
  };
}
