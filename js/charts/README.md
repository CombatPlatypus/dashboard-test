# Padrões dos gráficos

Crie gráficos com `createDashboardChart` de `js/charts/standard.js`, passando os mesmos
argumentos do Chart.js. A fábrica aplica o padrão também a novas configurações e mantém
os dados, as categorias, as escalas e os formatos de quantidade, duração e percentual.

`theme.js` centraliza as cores: vermelho `#8B0000`, amarelo `#f99400`, verde `#007A48`
e azul `#2538a5`. Cinzas e outras categorias distintas são preservados. O padrão converte
as tonalidades antigas na criação e nas atualizações; legendas HTML devem usar as mesmas cores.

Todos os gráficos renderizam com `max(devicePixelRatio da tela, 2)`. Assim, um canvas
com 800 × 300 pixels de tamanho visual usa pelo menos 1600 × 600 pixels de desenho.

A fonte é Open Sans. Eixos e nomes usam 14px; os valores das barras, médias e pontos
usam `CHART_VALUE_FONT`: 15px, peso 600. O centro das composições permanece em 15px
com peso normal. Todos os textos usam `CHART_TEXT_COLOR` (`#e4e6eb`), incluindo valores,
indicadores, eixos, legendas, títulos, tooltips e textos de referência.

As barras horizontais usam faces 3D de 10 × 9px, espessura frontal de 24px, base opaca
sobre o zero, grades verticais e nenhum trilho de fundo. Os valores ficam 10px após a
face lateral, com deslocamento vertical de +7px. Os nomes têm padding de 22px e há um
recuo adicional de 16px antes do eixo inferior. `horizontal-bars-3d.js` fornece a mesma
geometria para rankings com escalas próprias; preserve seu formato e suas categorias.

As barras verticais usam profundidade de 8 × 7px e valores externos centralizados na
projeção. Em pilhas, apenas o segmento superior recebe a face de topo. Quando há apenas
um tipo de ocorrência no dia, mostre somente o total externo; com dois tipos, mantenha
os valores de cada segmento e o total.

`defaults.js`, carregado depois do Chart.js, também configura fonte, eixos de 14px e
densidade mínima para consumidores diretos da biblioteca. As fontes locais em
`css/font-face.css` carregam os pesos 400, 600 e 800; ao concluir, os gráficos são
redesenhados sem animação.
