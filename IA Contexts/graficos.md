# Padrão dos gráficos do dashboard

Este padrão se aplica aos gráficos existentes, aos que forem criados futuramente em qualquer painel e aos gráficos do Relatório Final exportado em HTML.

## Criação e atualização

Crie gráficos com `createDashboardChart(canvas, config)` de [standard.js](../js/charts/standard.js). A função aplica o padrão na criação e normaliza as tonalidades antigas das séries nas atualizações. Use a configuração do próprio gráfico para definir dados, categorias, unidades, limites e formatos de quantidade, duração ou percentual. Para as legendas em HTML, use as mesmas cores das séries.

[defaults.js](../js/charts/defaults.js) aplica os padrões globais depois que a biblioteca Chart.js é carregada e redesenha os gráficos quando as fontes locais ficam prontas. O [renderizador do Relatório Final](../js/reports/overall-analysis/standalone-renderer.js) usa a mesma função de criação no HTML exportado.

## Regras visuais

| Item | Padrão |
| --- | --- |
| Paleta | Vermelho `#8B0000`, amarelo `#f99400`, verde `#007A48` e azul `#2538a5`. As categorias com cinzas e outras cores distintas mantêm suas cores. |
| Textos | Open Sans e cor `#e4e6eb` em eixos, títulos, legendas, valores e outros textos. Eixos e nomes usam 14 px. Valores de barras, médias e pontos usam 15 px com peso 600. O centro das composições usa 15 px com peso normal. |
| Tema | Eixos e grades usam `--color-border`. Bases 3D usam `--color-chart-base`, cujo padrão é `--color-container-focus`. Roscas vazias e partes restantes dos indicadores usam `--color-chart-empty`, cujo padrão é `--color-border`. A troca de tema redesenha as instâncias existentes e preserva as cores das séries. |
| Resolução | O canvas desenha com densidade igual ao maior valor entre `devicePixelRatio` e 2. |
| Tooltips | Desativados por padrão, inclusive no HTML exportado. Quando houver um pedido específico, habilite somente no gráfico solicitado com `options.plugins.tooltip.enabled: true`. |

As constantes de tipografia e cor e a leitura das variáveis CSS ficam em [theme.js](../js/charts/theme.js).

## Barras e composições 3D

- **Barras horizontais** usam profundidade de 10 × 9 px, face frontal de 24 px, base opaca no zero e grades verticais. Os valores ficam 10 px após a face lateral, com deslocamento vertical de 7 px. Os nomes têm espaçamento de 22 px e o último item tem recuo de 16 px antes do eixo inferior. A geometria compartilhada fica em [horizontal-bars-3d.js](../js/reports/core/horizontal-bars-3d.js).
- **Barras verticais** usam profundidade de 8 × 7 px e valores externos centralizados na projeção. Nas pilhas, apenas o segmento superior recebe a face de topo. Com um tipo de ocorrência no dia, exiba somente o total externo. Com dois tipos, exiba os valores dos segmentos e o total. O desenho compartilhado fica em [stacked-bars-3d.js](../js/reports/core/stacked-bars-3d.js).
- **Roscas 3D** usam o desenho e a tipografia central de [doughnut-3d.js](../js/reports/core/doughnut-3d.js), que aplica a cor de estado vazio do tema.

## Referência para manutenção

O [guia técnico em js/charts](../js/charts/README.md) detalha o padrão junto ao código. Para conferir a aplicação das regras compartilhadas, rode:

```powershell
node --test tests/dashboard-chart-standard.test.mjs tests/chart-theme.test.mjs tests/chart-font-defaults.test.mjs tests/chart-text-colors.test.mjs tests/doughnut-3d-standard.test.mjs tests/stacked-bars-3d.test.mjs
```
