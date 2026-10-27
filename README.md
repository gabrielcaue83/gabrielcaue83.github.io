# Cauê Gabriel · divulgação dev

Landing page para anunciar o serviço de desenvolvimento. É monocromática, parte do conceito "Quantiq" (palavra gigante **ÓRBITA** atrás de um astronauta) e vira uma viagem pelo espaço: depois do hero, cada seção mostra na prática o que o visitante pode contratar.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5175
npm run build      # gera dist/ para publicar
```

## Stack

| Peça | Para quê |
|---|---|
| Vite | servidor de dev e build (caminhos relativos, funciona no GitHub Pages) |
| GSAP (ScrollTrigger, SplitText, DrawSVG, MotionPath) | cenas fixas no scroll, títulos por máscara, demo de GSAP, rota do processo |
| Lenis | scroll suave, no mesmo relógio do GSAP |
| Three.js (WebGL) | uma única tela fixa: estrelas, astronauta, imagens e o planeta 3D |
| Motion | molas físicas da seção de micro-interações |
| Inter Tight (Fontsource) | fonte hospedada junto com o site |

## Seções e passagens

A página é uma viagem só: cada seção fica fixa na tela e **nasce de dentro de um objeto da anterior**. Nenhum bloco "sobe" pela rolagem.

| Passagem | O que acontece | Onde |
|---|---|---|
| Hero → 01 Serviços | a câmera mergulha na viseira; o vidro vira janela para o espaço e Serviços nasce lá dentro | `hero.js`, shader `heroFrag` |
| 01 → 02 GSAP | a última imagem se recolhe numa estrela; dela o palco se abre e as formas saem | `servicos.js`, `gsap-demo.js` |
| 02 → 03 Three.js | o palco deita em perspectiva; a órbita vira o anel-fantasma do planeta 3D | `gsap-demo.js`, `tres.js`, `gl/planet.js` |
| 03 → 04 Micro-interações | a câmera atravessa o anel; as partículas voltam desenhando os 5 cartões (constelação) | `tres.js`, `motion-demo.js`, `gl/constellation.js` |
| 04 → 05 Processo | os cartões viram estrelas que pousam nas paradas da rota (a 5ª vira o satélite) | `motion-demo.js`, `finais.js` |
| 05 → 06 Contato | o satélite chega ao fim e explode numa supernova; o contato surge quando a luz baixa | `finais.js` |

Como as cenas se encaixam: `.cena--chain` dá `margin-top: -100svh` à seção seguinte (o ScrollTrigger passa a margem para o pin-spacer), então o fim de uma cena fixa coincide com o começo da próxima.

Efeitos que passam de uma cena para outra (estrela, mini-estrelas, clarão, velocidade das estrelas) ficam em `sections/space.js` com **dono único**: cada cena só mexe nas próprias alavancas e o valor final é calculado ali, a cada quadro. Assim, rolar para cima ou para baixo nunca deixa uma cena desfazer a outra.

No celular e no tablet (até 900 px), micro-interações e processo não ficam fixos: os cartões são desenhados pela constelação conforme entram na tela e o contato aparece com um clarão no centro.

## WebGL (`src/js/gl/stage.js`)

Uma única tela desenha, em ordem: estrelas → planos que copiam a posição das `<img>` (astronauta, imagens) → cenas 3D recortadas no retângulo de um elemento (o planeta). A `<img>` continua no HTML (SEO, leitor de tela, fallback). Sem WebGL, as imagens normais aparecem e a seção 3D mostra um aviso.

## Acessibilidade e desempenho

- `prefers-reduced-motion`: sem scroll suave, sem WebGL e sem animação de scroll; tudo visível. As demos de clique (easing e micro-interações) continuam.
- Sem JavaScript, o conteúdo aparece normalmente. O carregamento tem uma trava que some sozinha em 9 s.
- As imagens são WebP em dois tamanhos (`srcset`). O astronauta é pré-carregado.

## Onde mexer

- **Contato do formulário**: `src/js/form.js`, objeto `CONTATO`. Com `whatsapp` preenchido, o formulário abre o WhatsApp com a mensagem pronta. Com `email`, abre o e-mail. Sem os dois, copia a mensagem e abre o direct do Instagram.
- **Textos**: `index.html`.
- **Cores e tamanhos**: variáveis no topo de `src/styles/main.css`.

## Imagens

As imagens de IA foram geradas no Figma (arquivo da página de divulgação) e os originais ficam em `arte-ia/`. Para recortar o astronauta do fundo verde e converter tudo para WebP:

```bash
npm run imagens
```

Os prints dos projetos (usados no mini-reel do hero) vêm de `../portfolio-caue/assets/img/projetos/`.

## Publicar no GitHub Pages

O workflow `.github/workflows/deploy.yml` faz o build e publica `dist/` a cada push na `main`. No repositório, em *Settings → Pages*, escolha **GitHub Actions** como fonte.

A versão anterior (hero do planeta) está em `../_backups/divulgacao-dev-v1-orbita-2026-10-27/`.
