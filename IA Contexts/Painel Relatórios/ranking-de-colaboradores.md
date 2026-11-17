# Ranking Mensal de Colaboradores

Abra **Relatórios > Relatório Final > Ranking Mensal de Colaboradores**. **Processamento** alimenta Recebimento e Erros de Etiquetagem, **Expedição** alimenta rotas e tempo médio, e a planilha de **Avarias e Perdas** alimenta Avarias Recebidas e Pacotes OFF. As tabelas têm pelo menos 150 linhas de dados e crescem para mostrar todos os registros disponíveis. [HTML](../../index.html) · [Estilos](../../css/reports-style.css)

## Recebimento e Erros de Etiquetagem

Importe o arquivo de recebimento do SPX em **Processamento > Mesa de Recebimento**. O [importador](../../js/reports/receipt/import.js) conta os pacotes únicos por recebedor. O ranking reúne todos os recebedores carregados e ordena do maior para o menor volume.

Na mesma subaba, preencha **Erros** e, quando houver um etiquetador, informe o nome completo em **Etiquetador**. A quantidade fica com o etiquetador indicado. Se o campo estiver vazio, a quantidade fica com o recebedor. O ranking ordena do menor para o maior total de erros. Uma quantidade informada como zero entra na contagem e um campo em branco fica pendente.

O [modelo](../../js/reports/employee-ranking/model.js) usa o OPS do SPX para identificar os recebedores. Para o etiquetador, usa o código informado com o nome ou uma correspondência única pelo nome completo entre os recebedores e a lista de OPS importada. O ranking considera todos os turnos e mantém os recebedores independentemente da seleção na prévia de Processamento. O nome abreviado aparece na tabela e desempata as quantidades iguais.

## Cálculo de Expedição

- O [estado de Expedição](../../js/reports/expedition/state.js) fornece as rotas validadas, a soma das durações e a quantidade de rotas com duração por conferente. A janela e a seleção visual de conferentes são controles locais.
- O [modelo do ranking](../../js/reports/employee-ranking/model.js) agrupa pelo código OPS quando presente. Um mesmo OPS reúne os valores mesmo com variações de grafia. Na prévia, Maria da Silva Santos aparece como Maria Silva. O tempo é exibido junto da quantidade no formato `12 / 05:29`.
- O ranking ordena por quantidade de rotas decrescente, menor tempo médio e nome. A média divide a soma das durações pela quantidade de rotas com duração. Para o acumulado recebido da planilha, uma média preenchida é ponderada pela quantidade de rotas do registro, pois a planilha fornece o total e a média.

## Avarias Recebidas e Pacotes OFF

Cada bloco conta uma ocorrência por linha com data do mês e ano da importação no horário de São Paulo e colaborador atribuído em Log. O agrupamento usa o nome completo, considerando todos os turnos. A prévia exibe o nome abreviado e ordena do menor para o maior total, com desempate pelo nome.

### Avarias Recebidas

O [importador](../../js/reports/damage-and-losses/import.js) lê **Data** e **Log** do **Histórico de Avarias Recebidas** para contar avarias.

### Pacotes OFF

O mesmo importador lê **Expedição** e **Log** do **Histórico de Retornados** para contar pacotes OFF.

## Botões

- **Importar** lê os acumulados de Recebimento, Erros e Expedição e a lista de códigos em R:S da aba **Ranking de Colaboradores**. Use a base anterior aos dados de Processamento e Expedição carregados. O cálculo soma essa base com os dados atuais e mantém os colaboradores presentes só no histórico. Repetir a importação da mesma base produz os mesmos totais. A importação lê o OPS e o nome completo da fórmula da célula e aceita os formatos anteriores, incluindo o bloco avulso de Expedição e o nome completo na antiga coluna R.
- **Copiar** prepara o ranking formatado para colar em **B2**, com Recebimento em B:C, Erros de Etiquetagem em E:F, Avarias Recebidas em H:I, Expedição em K:M e Pacotes OFF em O:P. A lista de códigos e nomes completos ocupa R:S. As células de colaborador exibem o nome abreviado da prévia e guardam a identificação na fórmula. [Formato da cópia](copia-de-dados-para-planilha.md#expedição-do-ranking-mensal)
- **Imagem** copia o ranking para a área de transferência. Segure o botão para baixar o PNG. A imagem inclui todas as linhas com dados.
- **Lixeira** descarta o acumulado importado e recalcula o ranking com os dados atuais dos relatórios. Ao limpar Processamento ou Expedição na aba de origem, os blocos correspondentes passam a mostrar o acumulado carregado.

Quando o acumulado chega sem o código na célula, o modelo consulta os nomes do relatório e da lista em R:S. A soma usa o nome completo ou uma abreviação com correspondência única. Se a identificação permanecer ambígua, o ranking conserva as quantidades separadas e pede o OPS.

## Atualização e sessão

O [controlador](../../js/reports/employee-ranking/controller.js) reaproveita o resumo derivado de Expedição e observa a lista de recebedores de Processamento. Editar o etiquetador ou a quantidade de erros atualiza apenas Erros de Etiquetagem. A edição da lista de OPS via importação recalcula a identificação dos três blocos acumuláveis. O [estado do ranking](../../js/reports/employee-ranking/state.js) guarda os acumulados e a lista importada na parte do Relatório Final. [Salvamento de sessão](../Menu%20Principal/salvamento-de-sessao.md)

Os recortes de Avarias Recebidas e Pacotes OFF ficam na parte **Avarias e Perdas** da sessão. Reimportar a planilha substitui os recortes. Limpar Avarias e Perdas limpa os dois blocos. A prévia atualiza cada bloco quando sua fonte muda. Planilhas sem as colunas da contagem e sessões sem o recorte exibem travessões no bloco correspondente. [Estado de Avarias](../../js/reports/damage-and-losses/state.js) · [Estado de Perdas](../../js/reports/damage-and-losses/losses-state.js)

O [roteiro de navegador](../../tests/employee-ranking.browser.mjs) cobre o CSV de Expedição, o cálculo combinado, a cópia formatada, a imagem e a lixeira. Os testes de [planilha](../../tests/damage-and-losses-workbook.test.mjs) cobrem a virada de mês e a ordem crescente de Avarias Recebidas e Pacotes OFF. Os testes do [modelo](../../tests/employee-ranking-model.test.mjs) cobrem a atribuição dos erros e a soma do acumulado. Os testes de [clipboard](../../tests/employee-ranking-clipboard.test.mjs) verificam o formato dos cinco blocos.
