// GLSL dos planos WebGL. Os planos são medidos em pixels de CSS (câmera ortográfica),
// então uSize é o tamanho real do elemento na tela.

const common = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

/* ---------- Imagens das seções ---------- */

export const mediaVert = /* glsl */ `
  uniform float uVelocity;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    // curva com a velocidade do scroll: o meio da imagem "atrasa"
    world.y -= sin(uv.x * 3.14159265) * uVelocity;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const mediaFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uSize;
  uniform vec2 uImg;
  uniform float uReveal;
  uniform float uHover;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float uColor;
  uniform float uRadius;
  uniform float uZoom;
  uniform vec2 uShift;
  uniform float uFade;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec2 vUv;
  ${common}

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  // object-fit: cover
  vec2 cover(vec2 uv) {
    float rs = uSize.x / uSize.y;
    float ri = uImg.x / uImg.y;
    vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  void main() {
    float aspect = uSize.y / uSize.x;

    // revelação: sobe de baixo para cima, com borda de ruído
    float n = noise(vUv * vec2(5.0, 5.0 * aspect) + uSeed);
    float field = vUv.y * 0.72 + n * 0.28;
    float m = smoothstep(field, field + 0.12, uReveal * 1.12);

    // onda a partir do ponteiro
    vec2 d = vUv - uMouse;
    d.y *= aspect;
    float dist = length(d);
    vec2 dir = dist > 0.0001 ? normalize(vUv - uMouse) : vec2(0.0);
    float ripple = sin(dist * 26.0 - uTime * 3.2) * 0.0045 * uHover * (1.0 - smoothstep(0.0, 0.6, dist));

    float zoom = uZoom + 0.18 * (1.0 - m) + 0.05 * uHover;
    vec2 uv = (cover(vUv) - 0.5) / zoom + 0.5 + uShift;
    uv += dir * ripple;
    uv.y -= (1.0 - m) * 0.04;

    vec4 tex = texture2D(uTex, uv);
    vec3 col = mix(vec3(luma(tex.rgb)), tex.rgb, uColor);
    col *= 1.0 + 0.06 * uHover;
    col += (hash(vUv * uSize + fract(uTime) * 91.0) - 0.5) * 0.035;   // grão

    // cantos arredondados
    vec2 p = (vUv - 0.5) * uSize;
    float a = 1.0 - smoothstep(-1.0, 0.5, sdRoundBox(p, uSize * 0.5, uRadius));

    // imagens que se dissolvem no fundo escuro
    float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
    a *= m * mix(1.0, edge, uFade) * uOpacity;

    gl_FragColor = vec4(col, a);
  }
`;

/* ---------- Serviços: três imagens que se transformam umas nas outras ---------- */

export const slidesFrag = /* glsl */ `
  uniform sampler2D uT0;
  uniform sampler2D uT1;
  uniform sampler2D uT2;
  uniform vec2 uSize;
  uniform vec2 uImg;
  uniform float uProgress;   // 0 → 1 → 2
  uniform float uReveal;
  uniform float uOpacity;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float uRadius;
  uniform float uSeed;
  uniform float uWhite;      // 0 → 1: a imagem vira luz (a estrela)
  varying vec2 vUv;
  ${common}

  float sdRoundBox(vec2 p, vec2 b, float r) {
    r = min(r, min(b.x, b.y));
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  vec2 cover(vec2 uv) {
    float rs = uSize.x / uSize.y;
    float ri = uImg.x / uImg.y;
    vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
    return (uv - 0.5) * s + 0.5;
  }
  vec2 zoom(vec2 uv, float z) { return (uv - 0.5) / z + 0.5; }

  void main() {
    float aspect = uSize.y / uSize.x;
    vec2 base = cover(vUv) + uMouse * 0.012;
    float n = noise(vUv * vec2(3.2, 3.2 * aspect) + uSeed);
    float n2 = noise(vUv * vec2(9.0, 9.0 * aspect) - uSeed);

    // qual par de imagens está em transição
    float p = uProgress <= 1.0 ? uProgress : uProgress - 1.0;
    float k = sin(p * 3.14159265);                      // força do efeito no meio da troca
    float edge = (1.0 - vUv.y) * 0.55 + n * 0.45;
    float m = smoothstep(edge - 0.12, edge + 0.12, p * 1.24 - 0.12);

    vec2 dir = vec2(n - 0.5, n2 - 0.5);
    vec2 uvA = zoom(base, 1.06 + p * 0.14) + dir * k * 0.09;
    vec2 uvB = zoom(base, 1.2 - p * 0.14) - dir * k * 0.09;

    vec3 a;
    vec3 b;
    if (uProgress <= 1.0) {
      a = texture2D(uT0, uvA).rgb;
      b = texture2D(uT1, uvB).rgb;
    } else {
      a = texture2D(uT1, uvA).rgb;
      b = texture2D(uT2, uvB).rgb;
    }
    vec3 col = mix(a, b, m);
    // brilho na frente da onda de troca
    col += (1.0 - abs(m * 2.0 - 1.0)) * k * 0.12;
    col = vec3(luma(col));
    col += (hash(vUv * uSize + fract(uTime) * 91.0) - 0.5) * 0.035;
    col = mix(col, vec3(1.0), uWhite);

    // entrada (ruído de baixo para cima) e cantos
    float rn = noise(vUv * vec2(5.0, 5.0 * aspect) + uSeed * 2.0);
    float field = vUv.y * 0.72 + rn * 0.28;
    float reveal = smoothstep(field, field + 0.12, uReveal * 1.12);
    vec2 pp = (vUv - 0.5) * uSize;
    float aBox = 1.0 - smoothstep(-1.0, 0.5, sdRoundBox(pp, uSize * 0.5, uRadius));

    gl_FragColor = vec4(col, aBox * reveal * uOpacity);
  }
`;

/* ---------- Astronauta do hero ---------- */

export const heroVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const heroFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uSize;
  uniform float uIntro;
  uniform float uOut;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uCell;
  uniform float uPortal;     // 0 → 1: o vidro da viseira vira janela para o espaço
  uniform vec2 uVisorC;      // centro da viseira (uv)
  uniform vec2 uVisorR;      // raios da viseira (uv)
  uniform float uTravel;     // quanto a câmera já "voou" para dentro
  uniform float uFade;
  varying vec2 vUv;
  ${common}

  // uma camada de estrelas numa grade com sorteio por célula
  float starLayer(vec2 p, float scale, float seed) {
    vec2 q = p * scale + seed;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = hash(id + seed);
    vec2 o = vec2(hash(id + 3.1 + seed), hash(id + 7.7 + seed)) - 0.5;
    float d = length(f - o * 0.7);
    float size = 0.035 + 0.07 * hash(id + 11.0 + seed);
    return (1.0 - smoothstep(0.0, size, d)) * step(0.8, h);
  }

  // túnel: camadas de estrelas que crescem e passam pela câmera
  vec3 space(vec2 p) {
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      float z = fract(float(i) * 0.25 + uTravel + uTime * 0.035);
      float scale = mix(26.0, 1.2, z);
      float fade = smoothstep(0.0, 0.3, z) * (1.0 - smoothstep(0.82, 1.0, z));
      s += starLayer(p, scale, float(i) * 17.3) * fade;
    }
    float glow = exp(-dot(p, p) * 2.5) * 0.07;
    return vec3(0.055, 0.055, 0.067) + vec3(glow) + vec3(s);
  }

  void main() {
    float aspect = uSize.y / uSize.x;
    float n = noise(vUv * vec2(4.0, 4.0 * aspect) + uTime * 0.04);

    // retícula halftone: cada célula vira um ponto do tamanho do brilho dela
    vec2 px = vUv * uSize;
    vec2 cell = floor(px / uCell);
    vec2 local = fract(px / uCell) - 0.5;
    vec4 ct = texture2D(uTex, (cell + 0.5) * uCell / uSize);
    float ca = ct.a;
    float cl = ca > 0.001 ? luma(ct.rgb / ca) : 0.0;
    float rad = (0.16 + 0.34 * cl) * ca;
    float dotM = 1.0 - smoothstep(rad - 0.07, rad + 0.03, length(local));
    vec3 dotCol = vec3(clamp(cl * 1.12, 0.0, 1.0));

    // entrada: pontos sobem primeiro, a foto vem logo atrás
    float fIn = vUv.y * 0.78 + n * 0.22;
    float dotsOn = smoothstep(fIn, fIn + 0.06, uIntro * 1.35);
    float photoOn = smoothstep(fIn, fIn + 0.14, uIntro * 1.35 - 0.3);

    float fOut = (1.0 - vUv.y) * 0.7 + n * 0.3;
    float photoOff = smoothstep(fOut, fOut + 0.14, uOut * 1.4);
    float dotsOff = smoothstep(fOut, fOut + 0.08, uOut * 1.4 - 0.35);

    float wPhoto = photoOn * (1.0 - photoOff);
    float wDots = dotsOn * (1.0 - dotsOff) * (1.0 - wPhoto);

    vec4 tex = texture2D(uTex, vUv);           // textura com alfa pré-multiplicado
    vec3 base = tex.a > 0.001 ? tex.rgb / tex.a : vec3(0.0);

    // reflexo que corre pelo capacete seguindo o mouse
    float sweep = 0.5 + uMouse.x * 0.35 + sin(uTime * 0.35) * 0.08;
    float band = exp(-pow((vUv.x * 0.8 + (1.0 - vUv.y) * 0.45 - sweep) * 5.0, 2.0));
    vec3 photo = base + band * smoothstep(0.45, 0.95, luma(base)) * 0.22;

    float aPhoto = tex.a * wPhoto;
    float aDots = dotM * wDots;
    float a = aPhoto + aDots;
    vec3 col = (photo * aPhoto + dotCol * aDots) / max(a, 0.0001);

    // viseira → janela: primeiro só o vidro escuro mostra estrelas (como reflexo),
    // depois a janela inteira abre
    vec2 d = (vUv - uVisorC) / uVisorR;
    float shape = pow(pow(abs(d.x), 4.0) + pow(abs(d.y), 4.0), 0.25);   // retângulo arredondado
    float inVisor = 1.0 - smoothstep(0.92, 1.06, shape);
    float glass = 1.0 - smoothstep(0.12 + 0.45 * uPortal, 0.3 + 0.5 * uPortal, luma(base));
    float win = inVisor * glass * smoothstep(0.0, 0.25, uPortal) * wPhoto;
    vec2 sp = (vUv - uVisorC) * vec2(1.0, aspect) * 3.2;
    col = mix(col, space(sp), win);
    a = mix(a, 1.0, win);

    a *= smoothstep(0.0, 0.16, vUv.y) * uFade;   // os ombros somem no escuro
    gl_FragColor = vec4(col, a);
  }
`;
