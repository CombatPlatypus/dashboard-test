# Painel Análises

O painel permite investigar uma base importada. As abas **Visualização de Planilhas**, **Análise de Dados** e **Comparação de Dados** partem do mesmo conjunto de dados.

## Importar ou descartar a base

[index.js](../../js/data-analysis/index.js) inicializa o painel `#analysis` e conecta o importador, o estado em memória e as três abas. O [controlador de importação](../../js/data-analysis/importer/import-controller.js) lê CSV, XLSX ou XLS por meio do [leitor de planilhas](../../js/data-analysis/services/workbook-reader.js). A primeira aba do arquivo fornece cabeçalhos, linhas e perfis de colunas. O resultado entra no [estado de Análises](../../js/data-analysis/core/analysis-store.js), que notifica a prévia quando a base muda ou é descartada.

A base importada é gravada em `dashboard-analysis-session-v1` no `sessionStorage`. O painel restaura a base ao recarregar e recria as visualizações a partir dela. Descartar remove a base da aba.

## Visualização de Planilhas

O [modelo da prévia](../../js/data-analysis/preview/preview-model.js) controla as colunas visíveis e as operações de filtro e ordenação. O [controlador](../../js/data-analysis/preview/preview-controller.js) atualiza a tabela, fornece o estado da prévia às outras abas e aciona a cópia ou o download dos dados filtrados. O [exportador](../../js/data-analysis/services/preview-export.js) gera o CSV.

## Análise de Dados

O [controlador de análise](../../js/data-analysis/analysis/analysis-controller.js) recebe mudanças da prévia. O [modelo de análise](../../js/data-analysis/analysis/analysis-model.js) calcula os indicadores das colunas visíveis sobre as linhas filtradas, com métricas que dependem do tipo de dado. Uma mudança de filtro pode alterar os resultados dessa aba mesmo quando o arquivo importado é o mesmo.

## Comparação de Dados

O [modelo de comparação](../../js/data-analysis/comparison/comparison-model.js) recebe uma lista com um valor por linha, normaliza e identifica repetições, e procura os valores na coluna escolhida. A comparação usa as linhas filtradas da prévia e admite uma condição adicional em outra coluna. O [controlador de comparação](../../js/data-analysis/comparison/comparison-controller.js) conecta a lista, os seletores e os resultados na tela.

## Verificação

Importe uma base com um identificador repetido e uma coluna numérica. Oculte uma coluna, filtre a prévia e confira os indicadores, a comparação de um valor presente e outro ausente, e as colunas do CSV. Descarte a base e confira se as abas dependentes voltam ao estado inicial.

Rode `node --test tests/analysis-session.test.mjs` para verificar a restauração e o descarte da base.
