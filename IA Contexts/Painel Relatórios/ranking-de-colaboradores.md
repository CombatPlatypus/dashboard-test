# Ranking Mensal de Colaboradores

Abra **Relatórios > Relatório Final > Ranking Mensal de Colaboradores**. A importação do Gestão Audit em **Expedição** preenche o bloco de Expedição. A importação da planilha em **Avarias e Perdas** preenche Avarias Recebidas e Pacotes OFF. Recebimento e Erros de Etiquetagem exibem travessões. As tabelas têm pelo menos 150 linhas de dados e crescem para mostrar todos os registros disponíveis. [HTML](../../index.html) · [Estilos](../../css/reports-style.css)

## Cálculo de Expedição

- O [estado de Expedição](../../js/reports/expedition/state.js) fornece as rotas validadas, a soma das durações e a quantidade de rotas com duração por conferente. A janela e a seleção visual de conferentes são controles locais.
- O [modelo do ranking](../../js/reports/employee-ranking/model.js) agrupa pelo nome completo após retirar o prefixo OPS e normalizar caixa e espaços. Na prévia, Maria da Silva Santos aparece como Maria Silva. O tempo é exibido junto da quantidade no formato `12 / 05:29`.
- O ranking ordena por quantidade de rotas decrescente, menor tempo médio e nome. A média divide a soma das durações pela quantidade de rotas com duração. Para o acumulado recebido da planilha, uma média preenchida é ponderada pela quantidade de rotas do registro, pois a planilha fornece o total e a média.

## Avarias Recebidas e Pacotes OFF

Cada bloco conta uma ocorrência por linha com data do mês e ano da importação no horário de São Paulo e colaborador atribuído em Log. O agrupamento usa o nome completo, considerando todos os turnos. A prévia exibe o nome abreviado e ordena do menor para o maior total, com desempate pelo nome.

### Avarias Recebidas

O [importador](../../js/reports/damage-and-losses/import.js) lê **Data** e **Log** do **Histórico de Avarias Recebidas** para contar avarias.

### Pacotes OFF

O mesmo importador lê **Expedição** e **Log** do **Histórico de Retornados** para contar pacotes OFF.

## Botões

- **Importar** lê a aba **Ranking de Colaboradores**. No formato atual, o HTML da área de transferência traz o nome completo na fórmula da célula do colaborador. A importação também aceita os formatos anteriores com o nome completo no bloco de Expedição ou na antiga coluna R. Use o acumulado anterior aos dados da Expedição carregada. O cálculo soma essa base com os dados atuais. Repetir a importação da mesma base produz os mesmos totais.
- **Copiar** prepara o ranking formatado para colar em **B2**, com Avarias Recebidas em H:I, Expedição em K:M e Pacotes OFF em O:P. As células levam alinhamento horizontal e vertical centralizado e os tamanhos de fonte do modelo. As células de colaborador exibem o nome abreviado da prévia e guardam o nome completo na fórmula. [Formato da cópia](copia-de-dados-para-planilha.md#expedição-do-ranking-mensal)
- **Imagem** copia o ranking para a área de transferência. Segure o botão para baixar o PNG. A imagem inclui todas as linhas com dados.
- **Lixeira** descarta o acumulado importado e recalcula a tabela com a Expedição atual. Ao limpar a Expedição na aba de origem, o ranking passa a mostrar o acumulado que estiver carregado.

## Atualização e sessão

O [controlador](../../js/reports/employee-ranking/controller.js) reaproveita o resumo derivado de Expedição e reage a mudanças nas rotas. O [estado do ranking](../../js/reports/employee-ranking/state.js) guarda o acumulado. O salvamento automático grava a parte do Relatório Final quando essa base muda. [Salvamento de sessão](../Menu%20Principal/salvamento-de-sessao.md)

Os recortes de Avarias Recebidas e Pacotes OFF ficam na parte **Avarias e Perdas** da sessão. Reimportar a planilha substitui os recortes. Limpar Avarias e Perdas limpa os dois blocos. A prévia atualiza cada bloco quando sua fonte muda. Planilhas sem as colunas da contagem e sessões sem o recorte exibem travessões no bloco correspondente. [Estado de Avarias](../../js/reports/damage-and-losses/state.js) · [Estado de Perdas](../../js/reports/damage-and-losses/losses-state.js)

O [roteiro de navegador](../../tests/employee-ranking.browser.mjs) cobre o CSV de Expedição, o cálculo combinado, a cópia formatada, a imagem e a lixeira. Os testes de [planilha](../../tests/damage-and-losses-workbook.test.mjs) cobrem a virada de mês e a ordem crescente de Avarias Recebidas e Pacotes OFF. Os testes de [clipboard](../../tests/employee-ranking-clipboard.test.mjs) verificam os três blocos no formato da planilha.
