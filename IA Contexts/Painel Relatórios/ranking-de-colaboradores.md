# Ranking Mensal de Colaboradores

Abra **Relatórios > Relatório Final > Ranking Mensal de Colaboradores**. **Processamento** alimenta Recebimento e Erros de Etiquetagem, **Expedição** alimenta Rotas Conferidas, e a planilha de **Avarias e Perdas** alimenta Avarias Recebidas e Pacotes OFF. As tabelas têm pelo menos 150 linhas de dados e crescem para acomodar o ranking completo. [HTML](../../index.html) · [Estilos](../../css/reports-style.css)

## Identificação por OPS

Recebimento, Erros de Etiquetagem e Rotas Conferidas somam os registros atuais e do histórico pelo código OPS. O [modelo do ranking](../../js/reports/employee-ranking/model.js) lê o código do SPX ou da fórmula no acumulado. Se a célula tiver apenas o nome, o modelo procura um OPS com correspondência única entre os registros e a Base de Colaboradores importada de Q:R. Em acumulados antigos copiados com nomes abreviados, a abreviação precisa aparecer uma única vez no bloco e identificar um único colaborador com OPS.

OPS diferentes mantêm quantidades separadas mesmo para homônimos. Registros com quantidade e sem OPS identificado ficam pendentes no relatório ou acumulado de origem. O dashboard avisa quantos ficaram fora da soma e recalcula ao receber a identificação.

## Recebimento e Erros de Etiquetagem

Importe o arquivo de recebimento do SPX em **Processamento > Mesa de Recebimento**. O [importador](../../js/reports/receipt/import.js) conta os pacotes únicos por recebedor. O ranking reúne os recebedores identificados e ordena do maior para o menor volume.

Na mesma subaba, preencha **Erros** e, quando houver um etiquetador, informe o nome completo em **Etiquetador**. A quantidade fica com o etiquetador indicado. Se o campo estiver vazio, a quantidade fica com o recebedor. O ranking ordena do menor para o maior total de erros. Uma quantidade informada como zero entra na contagem.

O ranking considera todos os turnos e mantém os recebedores identificados independentemente da seleção na prévia de Processamento. O nome abreviado aparece na tabela e desempata as quantidades iguais.

## Cálculo de Expedição

O [estado de Expedição](../../js/reports/expedition/state.js) fornece a contagem de rotas validadas por conferente. A janela e a seleção visual de conferentes são controles locais. O bloco **Rotas Conferidas** mostra o nome abreviado e a quantidade decrescente, com desempate pelo nome. Maria da Silva Santos aparece como Maria Silva.

## Avarias Recebidas e Pacotes OFF

Cada bloco conta uma ocorrência por linha com data do mês e ano da importação no horário de São Paulo e colaborador atribuído em Log. O agrupamento usa o nome completo, considerando todos os turnos. A prévia exibe o nome abreviado e ordena do menor para o maior total, com desempate pelo nome.

### Avarias Recebidas

O [importador](../../js/reports/damage-and-losses/import.js) lê **Data** e **Log** do **Histórico de Avarias Recebidas** para contar avarias.

### Pacotes OFF

O mesmo importador lê **Expedição** e **Log** do **Histórico de Retornados** para contar pacotes OFF.

## Botões

- **Importar** lê os acumulados de Recebimento, Erros e Rotas Conferidas e a lista OPS em Q:R da aba **Ranking de Colaboradores**. Use a base anterior aos dados de Processamento e Expedição carregados. O cálculo soma a base com os dados atuais e mantém os OPS presentes só no histórico. Repetir a importação da mesma base produz os mesmos totais. A importação aceita formatos anteriores, incluindo a lista em R:S, o nome completo na antiga coluna R e o bloco de Expedição com a coluna de tempo. Desse bloco lê a identificação e a quantidade.
- **Copiar** prepara o ranking formatado para colar em **B2**, com Recebimento em B:C, Erros de Etiquetagem em E:F, Avarias Recebidas em H:I, Rotas Conferidas em K:L e Pacotes OFF em N:O. A lista de códigos e nomes completos ocupa Q:R. As células de colaborador exibem o nome abreviado da prévia e guardam a identificação na fórmula. [Formato da cópia](copia-de-dados-para-planilha.md#expedição-do-ranking-mensal)
- **Imagem** copia o ranking para a área de transferência. Segure o botão para baixar o PNG. A imagem inclui todas as linhas com dados.
- **Lixeira** descarta o acumulado e a lista OPS importada e recalcula o ranking com os dados atuais dos relatórios. Ao limpar Processamento ou Expedição na aba de origem, os blocos correspondentes passam a mostrar o acumulado carregado.

## Atualização e sessão

O [controlador](../../js/reports/employee-ranking/controller.js) reaproveita o resumo derivado de Expedição e observa a lista de recebedores de Processamento. Editar o etiquetador ou a quantidade de erros atualiza apenas Erros de Etiquetagem. A edição da lista de OPS via importação recalcula a identificação dos três blocos acumuláveis. O [estado do ranking](../../js/reports/employee-ranking/state.js) guarda os acumulados e a lista importada na parte do Relatório Final. [Salvamento de sessão](../Menu%20Principal/salvamento-de-sessao.md)

Os recortes de Avarias Recebidas e Pacotes OFF ficam na parte **Avarias e Perdas** da sessão. Reimportar a planilha substitui os recortes. Limpar Avarias e Perdas limpa os dois blocos. A prévia atualiza cada bloco quando sua fonte muda. Planilhas sem as colunas da contagem e sessões sem o recorte exibem travessões no bloco correspondente. [Estado de Avarias](../../js/reports/damage-and-losses/state.js) · [Estado de Perdas](../../js/reports/damage-and-losses/losses-state.js)

O [roteiro de navegador](../../tests/employee-ranking.browser.mjs) cobre o CSV de Expedição, o cálculo combinado, a cópia formatada, a imagem e a lixeira. Os testes de [planilha](../../tests/damage-and-losses-workbook.test.mjs) cobrem a virada de mês e a ordem crescente de Avarias Recebidas e Pacotes OFF. Os testes do [modelo](../../tests/employee-ranking-model.test.mjs) cobrem a atribuição dos erros, a soma por OPS e os registros pendentes. Os testes de [clipboard](../../tests/employee-ranking-clipboard.test.mjs) verificam os cinco blocos, a base OPS, as mesclagens e as bordas.
