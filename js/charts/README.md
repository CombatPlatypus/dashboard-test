# Padrões dos gráficos

O `index.html` carrega `defaults.js` logo após o Chart.js e antes dos módulos do dashboard.
Todos os gráficos criados com `new Chart(...)` herdam `'Open Sans', sans-serif`, incluindo
eixos, títulos, legendas e tooltips. Não é preciso repetir a família nas configurações novas.

As fontes locais vêm de `css/font-face.css`. O padrão carrega os pesos 400, 600 e 800 e
redesenha os gráficos após o carregamento, sem animação.

Em plugins que desenham textos diretamente no canvas, mantenha também a família no
`ctx.font`, por exemplo: `ctx.font = '600 14px "Open Sans", sans-serif'`.
O CSS do elemento canvas, sozinho, não define a fonte usada pelo contexto de desenho.

Os textos dos gráficos usam `#a8a9ad`: eixos, valores, percentuais, títulos, legendas
e textos de referência. `defaults.js` configura o padrão do Chart.js e dos tooltips.
Em módulos que desenham indicadores manualmente, importe `CHART_TEXT_COLOR` de
`js/charts/theme.js` e use essa cor em `ctx.fillStyle`.

Os Rankings de recebedores e conferentes são exceções e mantêm as cores próprias.
As cores de barras, fatias, linhas, grades e contornos não fazem parte desse padrão.
