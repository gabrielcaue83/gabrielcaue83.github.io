// Prepara as imagens do site a partir dos originais:
//   arte-ia/                       → imagens geradas no Figma (Gemini), PNG grandes
//   ../portfolio-caue/.../projetos → prints dos projetos
// Saída: public/img/*.webp (versões grande e pequena de cada uma).
//
// O astronauta vem num fundo verde liso. Aqui ele é recortado (vira PNG/WebP
// com transparência) para ficar NA FRENTE da palavra gigante do hero.
//
//   npm run imagens
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arte = resolve(raiz, 'arte-ia');
const projetos = resolve(raiz, '..', 'portfolio-caue', 'assets', 'img', 'projetos');
const saida = resolve(raiz, 'public', 'img');
mkdirSync(saida, { recursive: true });

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Recorte por chroma key. O astronauta é cinza, então qualquer "verde a mais"
// é fundo. Para um pixel cinza s misturado com o verde do fundo na proporção a:
//   r = a·s + (1-a)·bgR      g = a·s + (1-a)·bgG
// logo (g - max(r,b)) diminui conforme a cresce. Daí sai o alfa e a cor limpa.
async function recortar(entrada, nome, larguras) {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x, y) => (y * w + x) * 4;

  // cor do fundo = média de amostras nos cantos de cima
  let br = 0, bg = 0, bb = 0, n = 0;
  for (const [cx, cy] of [[4, 4], [w - 5, 4], [4, 40], [w - 5, 40], [w >> 1, 4]]) {
    const i = px(cx, cy); br += data[i]; bg += data[i + 1]; bb += data[i + 2]; n++;
  }
  br /= n; bg /= n; bb /= n;
  const kFundo = bg - Math.max(br, bb);
  console.log(`  fundo de ${nome}: rgb(${br | 0}, ${bg | 0}, ${bb | 0})`);

  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const m = Math.max(r, b);
    const k = Math.max(0, g - m);
    let a = 1 - k / kFundo;
    a = smooth(0.12, 0.9, a);
    // tira o verde que "vazou" para a borda e devolve o cinza original
    const mFundo = Math.max(br, bb);
    let s = a > 0.001 ? (m - (1 - a) * mFundo) / a : 0;
    s = Math.min(255, Math.max(0, s));
    // o sujeito é P&B: usa a luminância sem o canal verde contaminado
    out[i] = out[i + 1] = out[i + 2] = s;
    out[i + 3] = Math.round(a * 255);
  }

  const base = sharp(out, { raw: { width: w, height: h, channels: 4 } });
  for (const lw of larguras) {
    const arquivo = resolve(saida, `${nome}-${lw}.webp`);
    await base.clone().resize({ width: lw }).webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(arquivo);
    console.log('  ✓', `${nome}-${lw}.webp`);
  }
  // PNG pequeno para a imagem de compartilhamento e para quem não lê WebP
  await base.clone().resize({ width: 640 }).png({ compressionLevel: 9, palette: false }).toFile(resolve(saida, `${nome}-640.png`));
}

async function converter(entrada, nome, larguras, { cinza = true, qualidade = 78 } = {}) {
  for (const lw of larguras) {
    let img = sharp(entrada).resize({ width: lw, withoutEnlargement: true });
    if (cinza) img = img.grayscale();
    await img.webp({ quality: qualidade, effort: 6 }).toFile(resolve(saida, `${nome}-${lw}.webp`));
    console.log('  ✓', `${nome}-${lw}.webp`);
  }
}

console.log('Recortando o astronauta…');
await recortar(resolve(arte, 'astronauta-verde.png'), 'astronauta', [896, 560]);

console.log('Convertendo as imagens das seções…');
await converter(resolve(arte, 'servico-android.png'), 'servico-android', [1376, 720]);
await converter(resolve(arte, 'servico-cerebro.png'), 'servico-cerebro', [1376, 720]);
await converter(resolve(arte, 'servico-robo.png'), 'servico-robo', [1376, 720]);
await converter(resolve(arte, 'escultura.png'), 'escultura', [896, 600]);
await converter(resolve(arte, 'notebook.png'), 'notebook', [1200, 720]);

if (existsSync(projetos)) {
  console.log('Convertendo os prints dos projetos…');
  for (const p of ['opus', 'iacit', 'casarao', 'classe']) {
    await converter(resolve(projetos, `${p}.jpg`), `projeto-${p}`, [1200, 640], { cinza: false, qualidade: 80 });
  }
} else {
  console.warn('Pasta de projetos do portfólio não encontrada:', projetos);
}
console.log('Pronto →', saida);
