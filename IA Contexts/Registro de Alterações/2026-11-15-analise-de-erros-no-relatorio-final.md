# 15/11/2026 · Análise de Erros no Relatório Final

A tabela do **Relatório Final** passou a mostrar os oito indicadores calculados em **Expedição → Análise de Erros**. As duas prévias e a exportação HTML usam a mesma configuração do gráfico **Acompanhamento dos Erros**, com barras horizontais 3D, cores e rótulos compartilhados. A seção exibe os dados disponíveis na origem e atualiza a prévia após as edições e a limpeza. [Contexto da Expedição](../Painel%20Relat%C3%B3rios/README.md#expedição) · [Contexto do Relatório Final](../Painel%20Relat%C3%B3rios/README.md#relatório-final)

Os 267 testes passaram. O teste no Edge comparou os oito indicadores, a configuração e as cores das barras renderizadas nas duas prévias e no HTML aberto offline. Também conferiu o estado vazio após a limpeza da Expedição. [Teste de integração](../../tests/overall-analysis-html.browser.mjs)
