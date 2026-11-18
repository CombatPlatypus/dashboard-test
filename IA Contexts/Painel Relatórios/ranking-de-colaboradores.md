# Ranking Mensal de Colaboradores

Abra **Relatórios > Relatório Final > Ranking Mensal de Colaboradores**. **Processamento** alimenta Recebimento e Erros de Etiquetagem, **Expedição** alimenta Rotas Conferidas, e a planilha de **Avarias e Perdas** alimenta Avarias Recebidas e Pacotes OFF. As tabelas têm pelo menos 150 linhas de dados e crescem para acomodar o ranking completo. [HTML](../../index.html) · [Estilos](../../css/reports-style.css)

## Identificação por OPS

Recebimento, Erros de Etiquetagem e Rotas Conferidas somam por OPS. O [modelo do ranking](../../js/reports/employee-ranking/model.js) usa o código nos registros atuais e o código guardado na fórmula da célula de colaborador no acumulado. Uma célula antiga que contém o OPS junto do nome também pode ser lida. Os nomes servem para exibição e desempate.

OPS diferentes mantêm quantidades separadas mesmo para homônimos. Registros com quantidade e sem OPS ficam pendentes no relatório ou no acumulado de origem. O dashboard avisa quantos ficaram fora da soma. A importação lê os blocos do ranking e ignora listas auxiliares de colaboradores em versões antigas.

## Recebimento e Erros de Etiquetagem

Importe o arquivo de recebimento do SPX em **Processamento > Mesa de Recebimento**. O [importador](../../js/reports/receipt/import.js) conta os pacotes únicos por recebedor. O ranking reúne os recebedores identificados e ordena do maior para o menor volume.

Na mesma subaba, preencha **Erros** e informe o etiquetador com seu OPS em **Etiquetador**, como `[ops123] Nome`. A quantidade fica com o OPS do etiquetador quando o campo contém um código válido. Quando o campo estiver vazio ou sem OPS válido, o ranking atribui os erros ao OPS do recebedor. O ranking ordena do menor para o maior total de erros. Uma quantidade informada como zero entra na contagem.

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

- **Importar** lê os acumulados de Mesa de Recebimento, Erros de Etiquetagem e Rotas Conferidas da aba **Ranking de Colaboradores**. Copie o acumulado anterior com as fórmulas das células. O cálculo soma esse histórico com os dados atuais e mantém os OPS presentes só no histórico. Repetir a importação do mesmo acumulado produz os mesmos totais. A importação também lê os títulos antigos e a quantidade do bloco de Expedição com a coluna de tempo.
- **Copiar** prepara o ranking formatado para colar a partir do título mesclado **C2:P3**, com Mesa de Recebimento em C:D, Erros de Etiquetagem em F:G, Rotas Conferidas em I:J, Avarias Recebidas em L:M e Pacotes OFF em O:P. As células dos três blocos acumuláveis exibem o nome abreviado da prévia e guardam a identificação na fórmula. [Formato da cópia](copia-de-dados-para-planilha.md#expedição-do-ranking-mensal)
- **Imagem** copia o ranking para a área de transferência. Segure o botão para baixar o PNG. A imagem inclui todas as linhas com dados.
- **Lixeira** descarta o acumulado e recalcula o ranking com os dados atuais dos relatórios. Ao limpar Processamento ou Expedição na aba de origem, os blocos correspondentes passam a mostrar o acumulado carregado.

## Atualização e sessão

O [controlador](../../js/reports/employee-ranking/controller.js) reaproveita o resumo derivado de Expedição e observa a lista de recebedores de Processamento. Editar o etiquetador ou a quantidade de erros atualiza apenas Erros de Etiquetagem. O [estado do ranking](../../js/reports/employee-ranking/state.js) guarda os acumulados na parte do Relatório Final e sinaliza quais blocos mudaram na importação. [Salvamento de sessão](../Menu%20Principal/salvamento-de-sessao.md)

Os recortes de Avarias Recebidas e Pacotes OFF ficam na parte **Avarias e Perdas** da sessão. Reimportar a planilha substitui os recortes. Limpar Avarias e Perdas limpa os dois blocos. A prévia atualiza cada bloco quando sua fonte muda. Planilhas sem as colunas da contagem e sessões sem o recorte exibem travessões no bloco correspondente. [Estado de Avarias](../../js/reports/damage-and-losses/state.js) · [Estado de Perdas](../../js/reports/damage-and-losses/losses-state.js)

O [roteiro de navegador](../../tests/employee-ranking.browser.mjs) cobre o CSV de Expedição, o cálculo combinado, a cópia formatada, a imagem e a lixeira. Os testes de [planilha](../../tests/damage-and-losses-workbook.test.mjs) cobrem a virada de mês e a ordem crescente de Avarias Recebidas e Pacotes OFF. Os testes do [modelo](../../tests/employee-ranking-model.test.mjs) cobrem a atribuição dos erros, a soma por OPS e os registros pendentes. Os testes de [clipboard](../../tests/employee-ranking-clipboard.test.mjs) verificam as fórmulas, a posição dos cinco blocos, as mesclagens e as bordas.
