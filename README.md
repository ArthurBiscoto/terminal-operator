# Terminal Operator

Jogo de logística THREE.JS + Cannon-es com campanha persistida em D1.

## Jogabilidade

O menu permite continuar, consultar seis modalidades de contrato e comprar melhorias. A carreira possui XP, níveis, dinheiro e veículos compráveis. O modo de teste vem ativo e libera ímã, garra hidráulica e empilhadeira; pode ser desativado no menu.

Saia da cabine com F, caminhe até a portaria e pressione E para aceitar uma lista, inicialmente com dez posicionamentos. Containers circulam entre pilhas e caminhões com duas plataformas. Pallets têm contratos próprios entre armazém e caminhões e são operados com a empilhadeira. Caminhões partem após completar suas duas tarefas.

Impactos acima do limiar causam avarias, descontam XP e reduzem a remuneração final. Pagamento ocorre uma única vez ao concluir a lista. As melhorias aumentam velocidade, agilidade hidráulica, remuneração e tamanho das listas.

## Controles

- WASD: dirigir ou caminhar; Shift: caminhar rápido
- F: sair parado e sem carga / entrar no veículo próximo
- E a pé junto à portaria: contratos
- Setas: braço ou garfos
- Q/E na cabine: cabo, haste ou garfos
- Z/X: extensão telescópica
- J/L: rotação da carga/cabeçote
- Espaço: conectar ou soltar
- R: recolocar carga atual na origem, preservando avarias
- Tab: manifesto; Esc: menu
- Mouse: visão a pé; arrastar e roda: câmera externa

Na empilhadeira, abaixe os garfos, solte a carga e recue para retirá-los. Entregas exigem carga solta, apoiada, alinhada e estável dentro do destino.

## Código e execução

`public/src/` contém cena, veículos, cabo, garra, empilhadeira, caminhada, contratos, câmera, menu e áudio. `worker/economy.js` valida economia; `worker/index.js` atende API e salvamento anônimo por cookie HttpOnly. O mesmo navegador retoma a carreira; limpar o cookie perde o acesso a esse save. Não há login nem sincronização entre dispositivos.

`npm ci` e `npm run build` geram `dist/server/index.js`, Worker com recursos incorporados. O ambiente precisa do binding D1 `DB` e das migrações em `drizzle/`, aplicadas pela hospedagem. `public/` isolado não oferece a API de campanha.

As cargas ativas são corpos dinâmicos; cenário e bases de pilhas são estáticos. Cabo segmentado tem limite de tração; braço, garra e garfos têm colisores cinemáticos. Física casual de passo fixo a 60 Hz, sem suspensão automotiva completa.

## Verificação

Execute `node tests/physics.mjs`, `node tests/economy.mjs`, `node tests/campaign-physics.mjs`, `node tests/backend.mjs` e `node tests/main-smoke.mjs`. Cobrem elevação, rotação, colisões, cabo, pallets, caminhada, validação de entrega, saída dos caminhões, penalidades, economia, persistência SQLite e fluxo de interface simulada. Não são testes visuais ou de FPS no navegador.

## Créditos

THREE.JS 0.170.0 e Cannon-es 0.20.0 (MIT), incluídos em `public/vendor/`. Caminhão GLB do [Kenney Car Kit](https://kenney.nl/assets/car-kit), CC0, adaptado com duas plataformas e eixos adicionais. Licença em `public/assets/KENNEY-LICENSE.txt`. Fonte Barlow opcional com alternativa de sistema.

## Ajuste de proporções e operação

Guindastes com escala de 80% e empilhadeira com 48% do chassi anterior, incluindo colisores, rodas e pontos de operação. Garfos de 1,35 m e elevação até 3,2 m; pallets de contrato em corredores centrais abertos. Aceleração, direção, braços e guinchos mais rápidos. HUD compacto com objetivo, rota, velocidade e minimapa; controles no menu.
