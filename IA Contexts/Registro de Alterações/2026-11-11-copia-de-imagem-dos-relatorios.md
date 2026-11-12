# 11/11/2026 · Cópia de imagem dos relatórios

Em [Processamento](../../js/reports/receipt/export.js), a exportação de imagem passou a usar a mesma validação da subaba ativa que habilita o botão. Em Descarregamento de LHs, os LHs cadastrados bastam para copiar ou baixar a imagem. Na Mesa de Recebimento e no Ranking de Recebedores, a ação valida os dados de recebimento.

O [contexto da cópia de imagem](../Painel%20Relat%C3%B3rios/copia-de-imagem.md) registra as áreas dos oito relatórios. O Planejamento usa a prévia compartilhada pelas abas de controles. O Relatório Final usa sua área completa.

O [teste de regressão](../../tests/receipt-image-export.test.mjs) reproduz o clique em Descarregamento de LHs com apenas LHs cadastrados e verifica o destino de captura nas três subabas de Processamento.
