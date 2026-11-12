# Painel Filtragem

O painel recebe uma base e uma lista de valores, um por linha. A finalidade escolhida define como a base é lida, quais campos são pesquisados e o formato da prévia e da exportação.

## Finalidades

| Finalidade | Regra principal |
| --- | --- |
| Export Análises | Pesquisa `Shipment_id` e seleciona campos como rota, AT e motorista. Usa a primeira ocorrência e mantém a posição dos valores sem correspondência. |
| Export Erros | Aceita CSV com `SPX Tracking Number` e `Operator` e devolve os pares na ordem informada. |
| Export Avaria (.CSV) | Pesquisa `Order ID` e usa o registro mais antigo por `Current Station Received Time` para extrair o status e a estação. |
| Export Avaria (Área de Transferência) | Lê dados copiados e reconhece nomes alternativos de cabeçalhos, inclusive em português. |
| Filtragem Livre (.CSV/XLSX) | Pesquisa em qualquer coluna, devolve a linha completa e mantém os valores ausentes na prévia. |
| Filtragem Livre (Área de Transferência) | Aplica a busca livre aos dados copiados e aceita seleção sem cabeçalhos. |

## Implementação

Os controles ficam em `#filter` de [index.html](../../index.html). [init.js](../../js/filter/init.js) reúne as regras em `FILTER_PURPOSES` e controla a sequência de seleção, leitura da fonte, `filterRows()`, prévia, cópia e download. [clipboard-source.js](../../js/filter/clipboard-source.js) interpreta tabelas HTML e texto tabulado e localiza os cabeçalhos da fonte copiada.

A tabela de prévia, o conteúdo copiado e o CSV podem ter colunas diferentes. Ao alterar uma finalidade, confira em conjunto o campo de pesquisa, os cabeçalhos obrigatórios, a ordem dos valores e as projeções de cada saída. Trocar de finalidade ou editar a lista invalida os resultados anteriores.

A aba guarda a finalidade, a base importada e a lista de valores em `dashboard-filter-session-v1`. Ao recarregar, o painel refaz a filtragem se ela já estava aplicada. Descartar os dados remove a cópia da sessão. Trocar de finalidade invalida também qualquer leitura de arquivo ou da área de transferência que ainda esteja em andamento.

## Verificação

Rode `node --test tests/filter-clipboard.test.mjs tests/filter-errors.test.mjs` para conferir a leitura de cabeçalhos, os formatos de entrada, a ordem e o conteúdo das saídas e os fluxos de filtragem livre.
