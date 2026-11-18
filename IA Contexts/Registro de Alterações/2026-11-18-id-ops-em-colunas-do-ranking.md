# 2026-11-18 · ID OPS em colunas do Ranking de Colaboradores

A cópia do ranking começa no título mesclado C2:U3 do novo modelo. Os blocos incluem ID OPS, Colaborador e Quantidade. Recebimento grava o ID em C, Erros de Etiquetagem em G e Rotas Conferidas em K. Os dois blocos de ocorrências deixam suas colunas de ID vazias.

A importação lê o ID da mesma linha do colaborador e da quantidade a partir do texto ou HTML da área de transferência. Cópias antigas podem trazer o código na fórmula ou junto ao nome. Quando faltam códigos, a mensagem orienta a incluir as colunas C, G e K na seleção.

Os 299 testes Node passaram. No intervalo C2:U156, a comparação com o XLSX confirmou as bordas de 2.945 células, as 10 mesclagens, as 19 larguras e os preenchimentos das células. Uma simulação do fluxo de cópia e importação recuperou os IDs em texto e HTML, acumulou os valores corretamente em casos com homônimos e verificou o aviso de códigos ausentes.

Contextos atualizados em [Ranking Mensal de Colaboradores](../Painel%20Relat%C3%B3rios/ranking-de-colaboradores.md), [Cópia de dados para planilha](../Painel%20Relat%C3%B3rios/copia-de-dados-para-planilha.md) e [Painel Relatórios](../Painel%20Relat%C3%B3rios/README.md#ranking-mensal-de-colaboradores).
