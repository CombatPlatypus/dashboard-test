# 12/11/2026 · Cópia de dados para o Resumo da Operação

A [cópia de dados dos relatórios](../../js/reports/summary-copy.js) indica a aba **Base de Dados** nos botões de Processamento, Expedição, Parcel Sweeper e Reversa. Processamento começa na coluna C e Expedição na G, nas linhas 7, 67 ou 127 conforme o turno.

Parcel Sweeper começa em `C185` e Reversa em `C189`. Cada bloco usa oito colunas e três linhas, com a data na coluna G do cabeçalho e os quatro indicadores lado a lado na última linha.

O [contexto da cópia de dados para planilha](../Painel%20Relat%C3%B3rios/copia-de-dados-para-planilha.md) detalha os intervalos e as células dos indicadores. O [índice do Painel Relatórios](../Painel%20Relat%C3%B3rios/README.md) aponta para esse contexto.

Os oito blocos gerados foram comparados com os intervalos e mesclagens do XLSX de referência. Os [testes da cópia](../../tests/report-summary-copy.test.mjs) cobrem o conteúdo em HTML e texto tabulado e as instruções de colagem. Os 265 testes do repositório passaram.
