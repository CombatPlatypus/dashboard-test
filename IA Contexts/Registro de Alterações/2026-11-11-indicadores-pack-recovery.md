# 11/11/2026 · Indicadores de Pack Recovery

O [importador de Avarias e Perdas](../../js/reports/damage-and-losses/import.js) passou a contar os quatro status atuais da coluna Pack Recovery. O [gráfico](../../js/reports/damage-and-losses/losses-charts.js) mostra **Feito** em verde, **ID Inválido** e **Sem Dados** em vermelho e **Aguardando** em amarelo.

O [estado de Perdas do Mês](../../js/reports/damage-and-losses/losses-state.js) guarda a contagem de **Aguardando** para os períodos do gráfico e para a sessão. Os [testes](../../tests/damage-and-losses-losses.test.mjs) cobrem as opções atuais, células vazias, rótulos fora da lista e a ordem dos indicadores. A regra foi registrada no [contexto de Avarias e Perdas](../Painel%20Relat%C3%B3rios/README.md#avarias-e-perdas).
