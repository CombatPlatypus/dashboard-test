# Ranking Mensal de Colaboradores

Abra **Relatórios > Relatório Final > Ranking Mensal de Colaboradores**. A importação do Gestão Audit em **Expedição** preenche automaticamente o bloco de Expedição do ranking. Recebimento, Erros de Etiquetagem, Avarias Recebidas e Pacotes OFF exibem travessões. Cada tabela tem pelo menos 150 linhas de dados. Expedição cresce para mostrar todos os registros. A área das tabelas tem rolagem e cabeçalhos fixos. [HTML](../../index.html) · [Estilos](../../css/reports-style.css)

## Cálculo de Expedição

- O [estado de Expedição](../../js/reports/expedition/state.js) fornece as rotas validadas, a soma das durações e a quantidade de rotas com duração por conferente. A janela e a seleção visual de conferentes são controles locais.
- O [modelo do ranking](../../js/reports/employee-ranking/model.js) agrupa pelo nome completo após retirar o prefixo OPS e normalizar caixa e espaços. Na prévia, Maria da Silva Santos aparece como Maria Silva. O tempo é exibido junto da quantidade no formato `12 / 05:29`.
- O ranking ordena por quantidade de rotas decrescente, menor tempo médio e nome. A média divide a soma das durações pela quantidade de rotas com duração. Para o acumulado recebido da planilha, uma média preenchida é ponderada pela quantidade de rotas do registro, pois a planilha fornece o total e a média.

## Botões

- **Importar** lê a aba **Ranking de Colaboradores**, incluindo a coluna R com os nomes completos. O formato anterior, com nomes completos no bloco de Expedição, também pode ser importado. Use o acumulado anterior aos dados da Expedição carregada. O cálculo soma essa base com os dados atuais. Repetir a importação da mesma base produz os mesmos totais.
- **Copiar** prepara o ranking formatado para colar em **B2**. As células levam alinhamento horizontal e vertical centralizado e os tamanhos de fonte do modelo. O nome exibido segue a prévia. A quantidade e o tempo médio ocupam células próprias. A coluna R guarda o nome completo para a reimportação. [Formato da cópia](copia-de-dados-para-planilha.md#expedição-do-ranking-mensal)
- **Imagem** copia o ranking para a área de transferência. Segure o botão para baixar o PNG. A imagem inclui todas as linhas com dados.
- **Lixeira** descarta o acumulado importado e recalcula a tabela com a Expedição atual. Ao limpar a Expedição na aba de origem, o ranking passa a mostrar o acumulado que estiver carregado.

## Atualização e sessão

O [controlador](../../js/reports/employee-ranking/controller.js) reaproveita o resumo derivado de Expedição e reage a mudanças nas rotas. O [estado do ranking](../../js/reports/employee-ranking/state.js) guarda o acumulado. O salvamento automático grava a parte do Relatório Final quando essa base muda. [Salvamento de sessão](../Menu%20Principal/salvamento-de-sessao.md)

O [roteiro de navegador](../../tests/employee-ranking.browser.mjs) verifica o preenchimento após importar CSV, a rolagem, o cálculo combinado, a cópia formatada, a imagem e a lixeira. Os testes de [modelo](../../tests/employee-ranking-model.test.mjs) e [clipboard](../../tests/employee-ranking-clipboard.test.mjs) verificam o cálculo e a reimportação de dois conferentes com o mesmo nome abreviado.
