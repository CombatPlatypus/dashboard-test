# Painel Relatórios

O painel acompanha a operação da janela e consolida os dados no **Relatório Final**. Cada relatório tem suas próprias fontes de dados, controles e regras de cálculo. O painel começa em `#reports` de [index.html](../../index.html).

## Fluxo compartilhado

[init.js](../../js/reports/init.js) registra os módulos no [ReportManager](../../js/reports/core/report-manager.js). Cada módulo expõe ações de inicialização, renderização, limpeza, importação de dados e leitura e gravação da sessão. Os [campos globais](../../js/reports/global-inputs.js) atualizam o [contexto da janela](../../js/reports/core/report-context.js), com turno, analista, volume planejado, colaboradores e capacidade.

O analista atualiza o cabeçalho do Relatório Final e sua identificação na exportação. A janela atualiza o cabeçalho do Relatório Final e as indicações de destino da cópia de Processamento e Expedição. O volume planejado atualiza o volume esperado, o progresso e a disponibilidade da cópia em imagem no Processamento, quando aplicável. No Relatório Final, ele atualiza o fluxo, a capacidade, o volume esperado e o gráfico de Processamento. As ações de importação, cópia e download que usam a janela ou o volume leem o contexto atual ao executar. [Campos globais](../../js/reports/global-inputs.js) · [Controlador do Relatório Final](../../js/reports/overall-analysis/controller.js) · [Cópia para planilha](../../js/reports/summary-copy.js)

Dentro de cada relatório, siga o controlador para localizar os eventos da tela e a função que altera o estado. Consulte o importador para as regras do arquivo ou da área de transferência e o estado ou modelo para os cálculos. Uma mudança na estrutura exportada pode afetar a [restauração de sessões](../Menu%20Principal/salvamento-de-sessao.md) e o Relatório Final.

Importações, edições e limpezas passam pelas notificações do estado e seguem a [regra de atualização seletiva](../arquitetura.md#atualização-seletiva). Ao registrar dados, inclua-os no estado exportado e restaurado e emita uma notificação que identifique o tipo de alteração. Para um novo módulo, conecte em [session.js](../../js/reports/session.js) a inscrição que agenda a gravação daquela parte e o validador do estado. [Salvamento automático](../Menu%20Principal/salvamento-de-sessao.md)

Para criar ou alterar gráficos no painel ou no HTML do Relatório Final, siga o [padrão de gráficos do dashboard](../graficos.md).

O botão de imagem captura a visualização de dados da subaba aberta. Quando as subabas alternam apenas os controles, a captura usa a prévia compartilhada. Consulte o [contexto da cópia de imagem](copia-de-imagem.md) para os destinos de cada relatório.

O botão de cópia de dados usa os estados relevantes para indicar disponibilidade e destino. Os blocos em HTML e TSV para o Resumo da Operação e para Planejamento são montados no clique. Consulte os intervalos e o formato no [contexto da cópia de dados para planilha](copia-de-dados-para-planilha.md).

## Importação de LHs do SPX

Planejamento e Descarregamento de LHs usam a mesma regra para os dados copiados do SPX. O importador lê o CPT (`AM`, `PM1` ou `PM2`) e usa o nome da viagem quando a janela precisa ser recuperada. Outro CPT encerra o bloco. Em blocos mistos, a seleção considera os LHs com um vizinho consecutivo do mesmo CPT.

O STA/STD habilita dois casos. Um bloco com um único LH vale para qualquer Indicador de Pontualidade quando a data desse LH estiver entre hoje e dois dias à frente. Um bloco composto só por `Waiting` exige que todos os LHs selecionados do CPT tenham data na mesma faixa. A contagem usa dias do calendário de São Paulo e inclui os dois limites. A data é lida da coluna STA/STD e usada na seleção da importação.

Para cada CPT, vale o primeiro bloco elegível na ordem em que aparece nos dados copiados. Quando mais de um CPT tem um bloco válido, o modal permite escolher a janela. [Regra compartilhada](../../js/reports/core/spx-linehaul-rules.js) · [Teste dos importadores](../../tests/linehaul-import-alignment.test.mjs)

## Processamento

Acompanha **Descarregamento de LHs**, **Mesa de Recebimento** e **Ranking de Recebedores**. O [importador de LHs](../../js/reports/receipt/linehaul-import.js) trata a leitura e a seleção da janela. O [estado de LHs](../../js/reports/receipt/linehaul-state.js) deriva o volume restante a partir do volume esperado e dos LHs marcados como descarregados. O [importador de recebimento](../../js/reports/receipt/import.js) agrupa os registros por operador para a mesa e o ranking. A sessão reúne os dois estados no [controlador](../../js/reports/receipt/controller.js).

Os pacotes recebidos por operador e os erros preenchidos na Mesa de Recebimento alimentam Recebimento e Erros de Etiquetagem no [Ranking Mensal de Colaboradores](ranking-de-colaboradores.md#recebimento-e-erros-de-etiquetagem). O ranking atribui a quantidade ao OPS do etiquetador informado. Quando o campo estiver vazio ou sem OPS válido, atribui o total ao OPS do recebedor.

Verifique alinhamento, confirmação da importação e recálculo de volume em [linehaul-import-alignment.test.mjs](../../tests/linehaul-import-alignment.test.mjs), [linehaul-import-confirmation.test.mjs](../../tests/linehaul-import-confirmation.test.mjs) e [receipt-linehaul-remaining.test.mjs](../../tests/receipt-linehaul-remaining.test.mjs).

O [exportador de Processamento](../../js/reports/receipt/export.js) usa os dados da subaba ativa tanto para habilitar o botão de imagem quanto para executar a captura. Descarregamento de LHs pode ser copiado assim que houver LHs cadastrados. Mesa de Recebimento e Ranking de Recebedores usam a validação dos dados de recebimento.

Na Mesa, ajustes no etiquetador ou nos erros atualizam a linha e as métricas que dependem do valor. Somente os volumes alimentam a barra de progresso. O Relatório Final recebe o volume da Mesa e os totais do Descarregamento de LHs. O total de erros da Mesa entra na verificação de completude do HTML. Edições de motorista e origem ficam na prévia de LHs, enquanto código, quantidade e seleção também podem alterar o resumo de descarregamento. [Mesa](../../js/reports/receipt/view.js) · [LHs](../../js/reports/receipt/linehaul-view.js)

Em **Defina os Etiquetadores**, cada recebedor importado tem campos separados para o código OPS e o nome do etiquetador, junto ao seletor de erros e à seleção da linha. O campo de código mantém apenas dígitos de `0` a `9` ao digitar ou colar, preservando zeros à esquerda. A edição combina o código e o nome no valor `labeler`, como `[ops123] Pablo`, para a prévia, a cópia e o ranking. Ao restaurar a sessão, os controles separam novamente os dados desse valor. [Controles da Mesa](../../js/reports/receipt/view.js) · [Teste de navegador](../../tests/receipt-layout.browser.mjs)

Para preencher os códigos OPS, digite o primeiro nome e pelo menos mais um nome do etiquetador. Copie a aba **Análise de Colaborades** do Resumo da Operação, ou as colunas B e C da lista (**ID [OPS]** e **Nome do Colaborador**), e clique no botão ao lado de **Defina os Etiquetadores**. A busca aceita nomes em ordem, com diferenças de maiúsculas, acentos e preposições. Ela prioriza o nome completo e preenche os OPS em branco quando encontra um único código. Nomes ausentes ou ambíguos entram apenas na contagem da notificação, como `1 Código OPS não encontrado.`. A ação atualiza as atribuições de etiquetador no estado de Processamento e no ranking. [Busca](../../js/reports/receipt/labeler-lookup.js) · [Testes](../../tests/receipt-labeler-lookup.test.mjs)

As prévias de **Descarregamento de LHs** e **Mesa de Recebimento** começam pelo Volume Esperado. A seleção da janela fica no controle **Janela do Turno**, no topo do painel. [Estrutura das prévias](../../index.html)

Na lista da **Mesa de Recebimento**, as colunas Recebedor e Etiquetador exibem o código OPS seguido de um espaço e do primeiro nome com inicial maiúscula, como `[ops12345] Lucas`. A prévia usa o mesmo formatador da cópia para planilha. Se o registro trouxer apenas o código ou o nome, a lista mostra o dado disponível. A célula sem identificação exibe `—`. [Renderização da mesa](../../js/reports/receipt/view.js) · [Formatador de nomes](../../js/reports/core/person-name.js)

## Expedição

Acompanha rotas expedidas, ranking de conferentes, erros e ocorrências por rua. O [importador de expedição](../../js/reports/expedition/import.js) identifica as colunas e monta os registros por rota. A [importação de erros](../../js/reports/expedition/errors-import.js) alimenta as visões de erros e ruas. O [estado](../../js/reports/expedition/state.js) reúne rotas, volumes, erros e ajustes usados no resumo e no Relatório Final.

A prévia do **Resumo de Expedição** começa pela coluna Conferentes. A janela vem do controle **Janela do Turno**, no topo do painel. [Estrutura da prévia](../../index.html)

A barra **Progresso da Conferência** usa o mesmo componente visual de Processamento e mostra rotas feitas, rotas pendentes e o percentual concluído. O estado conta como feitas as rotas com status `Validated` ou `Validado` na coluna **AT/TO Validation Status** do Gestão Audit. As demais rotas importadas contam como pendentes. O percentual divide as rotas feitas pelo total importado. A seleção de conferentes filtra a tabela, enquanto a barra acompanha todas as rotas. A prévia atualiza a barra ao importar, restaurar uma sessão ou limpar o relatório. Sem rotas, os valores aparecem como travessões. A cópia em imagem do Resumo inclui a barra. [Cálculo](../../js/reports/expedition/state.js) · [Renderização](../../js/reports/expedition/view.js)

Na lista do **Resumo de Expedição**, a coluna Conferente usa o mesmo formato da Mesa de Recebimento e da cópia para planilha. [Renderização da lista](../../js/reports/expedition/view.js)

A subaba **Análise de Erros** fornece ao Relatório Final os mesmos totais por tipo, revertidos, saldo final e taxas que aparecem na Expedição. A configuração do gráfico **Acompanhamento dos Erros** é compartilhada entre a Expedição, a prévia do Relatório Final e o HTML offline. [Cálculo dos erros](../../js/reports/expedition/state.js) · [Gráfico compartilhado](../../js/reports/expedition/error-balance-chart.js)

Os ouvintes usam o tipo da alteração para decidir se atualizam progresso, ranking, erros ou ruas. Guardião altera a identificação da rua e os dados do gráfico de ocorrências. Duplicados, exceções e retirados ficam nos indicadores locais. O piso atualiza o volume no piso da Expedição e do Final. [Dependências](../../js/reports/expedition/state.js) · [Prévia](../../js/reports/expedition/view.js)

Verifique o botão de importação nas quatro abas em [expedition-import-tabs.test.mjs](../../tests/expedition-import-tabs.test.mjs), o progresso por status em [expedition-progress.test.mjs](../../tests/expedition-progress.test.mjs) e o volume de retirados em [expedition-withdrawn.test.mjs](../../tests/expedition-withdrawn.test.mjs).

O ranking de conferentes fornece a quantidade de rotas validadas ao [Ranking Mensal de Colaboradores](ranking-de-colaboradores.md). Os filtros da tabela de Expedição são locais.

## Planejamento

Organiza a lista de LHs, as TOs a segregar, o backlog e os indicadores de Collection Pool e veículos. A [importação de Planejamento](../../js/reports/planning/import.js) interpreta dados copiados do SPX e pede uma escolha quando detecta mais de uma janela válida. Os [cálculos](../../js/reports/planning/calculations.js) usam os dados da [janela e do planejamento](../../js/reports/planning/state.js) para montar os totais.

A prévia atualiza cada tabela de acordo com as mudanças em LHs e TOs. Quantidades do backlog, capacidade e veículos só atualizam os indicadores que as usam. A lista de códigos do backlog é reaproveitada enquanto o texto de origem permanece igual. [Prévia](../../js/reports/planning/view.js) · [Cálculos](../../js/reports/planning/calculations.js)

A cópia formatada usa o título mesclado `C2:L3` da aba **Modelo** e monta o título com o turno, a data e a hora da cópia. [Cópia de Planejamento](copia-de-dados-para-planilha.md#planejamento)

Verifique a origem do backlog e sua presença nos resumos em [planning-backlog.test.mjs](../../tests/planning-backlog.test.mjs) e [report-summary-copy.test.mjs](../../tests/report-summary-copy.test.mjs).

## Avarias e Perdas

Mostra Avarias do Mês, Perdas do Mês e Histórico Consolidado. O [importador](../../js/reports/damage-and-losses/import.js) identifica as abas e os blocos do XLSX. O [controlador](../../js/reports/damage-and-losses/controller.js) exporta os estados de avarias e perdas na mesma entrada da sessão. O [modelo consolidado](../../js/reports/damage-and-losses/consolidated-model.js) combina os históricos com o estado da Taxa de Perdas para o mês selecionado.

O importador converte a aba de histórico uma vez e lê os dois blocos a partir das mesmas linhas. Aplica Avarias, Perdas e Taxa em lote e atualiza o Consolidado e o Final uma vez por arquivo. Se a série anual mudar isoladamente, o Consolidado atualiza somente a célula da taxa. [Importação](../../js/reports/damage-and-losses/import.js) · [Consolidado](../../js/reports/damage-and-losses/consolidated-view.js)

As colunas **Data** e **Log** do **Histórico de Avarias Recebidas** alimentam Avarias Recebidas no [Ranking Mensal](ranking-de-colaboradores.md#avarias-recebidas-e-pacotes-off). As colunas **Expedição** e **Log** do **Histórico de Retornados** alimentam Pacotes OFF. Os recortes mensais acompanham os estados de Avarias e de Perdas na sessão.

Em **Perdas do Mês**, o gráfico **Pack Recovery** cruza os códigos BR do histórico com a coluna Pack Recovery da **Base de Análises**. A contagem do período selecionado usa **Feito**, **ID Inválido**, **Sem Dados** e **Aguardando**. Células vazias e pacotes sem correspondência na base entram em **Sem Dados**. Rótulos preenchidos fora da lista ficam fora da contagem do gráfico. [Importação](../../js/reports/damage-and-losses/import.js) · [Gráfico](../../js/reports/damage-and-losses/losses-charts.js) · [Testes](../../tests/damage-and-losses-losses.test.mjs)

A rosca do **Histórico Consolidado** também alimenta o Relatório Final. Ela usa **Em Análise** em azul, **Lost** em vermelho, **Avarias (Hub)** em verde e **Avarias (SOC)** em amarelo. A composição usa o mês atual quando há ocorrências e recorre ao mês anterior nos demais casos. [Período e dados](../../js/reports/damage-and-losses/consolidated-model.js) · [Rosca e legenda](../../js/reports/damage-and-losses/consolidated-charts.js)

Verifique o reconhecimento dos blocos lado a lado e a seleção mensal em [damage-and-losses-workbook.test.mjs](../../tests/damage-and-losses-workbook.test.mjs) e [consolidated-history.test.mjs](../../tests/consolidated-history.test.mjs).

## Taxa de Perdas

Acompanha a composição das ocorrências e a evolução da taxa ao longo do ano. O [leitor de histórico](../../js/reports/losses-rate/workbook.js) reconhece as colunas da planilha, converte os valores e monta a série de 12 meses. O [estado](../../js/reports/losses-rate/state.js) fornece os dados ao relatório, ao Histórico Consolidado e ao Relatório Final.

No **Histórico da Taxa de Perdas**, a linha pontilhada marca o limite de 0,030% com o rótulo **Max 0,030%**. [Gráfico](../../js/reports/losses-rate/charts.js)

Na **Composição das Ocorrências**, a fatia e a legenda de **Possíveis Perdas** usam o azul padrão `#2538a5`. [Gráfico](../../js/reports/losses-rate/charts.js) · [Legenda](../../index.html)

O histórico fornece ao Relatório Final a série anual. As duas prévias usam a mesma configuração, incluindo a linha de referência. O seletor da Taxa atualiza a sua tabela, a rosca e o destaque da linha com a série existente. O Consolidado e o Final usam seus próprios períodos. [Dados do gráfico](../../js/reports/losses-rate/state.js) · [Configuração compartilhada](../../js/reports/losses-rate/charts.js)

Verifique a leitura do formato em [losses-rate-workbook.test.mjs](../../tests/losses-rate-workbook.test.mjs) e a presença dos 12 meses em [report-session.test.mjs](../../tests/report-session.test.mjs).

## Parcel Sweeper

Acompanha a cobertura da varredura e apresenta recortes de pacotes por operador, aging, status e próxima ação. O [importador](../../js/reports/parcel-sweeper/import.js) normaliza os registros do arquivo. O [modelo](../../js/reports/parcel-sweeper/model.js) usa `Count Type` para a cobertura dos pacotes esperados e aplica as regras de classificação por operador. O [estado](../../js/reports/parcel-sweeper/state.js) guarda os registros e os ajustes manuais de classificação.

Prévia e gráficos reaproveitam o resumo até a troca das linhas. O filtro atualiza as duas tabelas de pacotes, a ordem muda só a tabela acionada, e a classificação manual atualiza o operador e a divisão entre comuns e volumosos. O Final usa apenas os totais de pacotes e cobertura. [Resumo compartilhado](../../js/reports/parcel-sweeper/state.js) · [Prévia](../../js/reports/parcel-sweeper/view.js)

Verifique cobertura, casos de exceção e classificação em [parcel-sweeper.test.mjs](../../tests/parcel-sweeper.test.mjs) e [parcel-sweeper-overrides.test.mjs](../../tests/parcel-sweeper-overrides.test.mjs).

## Reversa

Agrupa os pacotes por TO e mostra a composição de Return, Missorted, Liquidate e Confiscado. O usuário escolhe o tipo antes de o [importador](../../js/reports/reverse/import.js) processar o arquivo SPX. O importador lê o identificador da TO na célula B2 e usa o tipo escolhido para classificar os códigos únicos. Uma nova importação da mesma TO atualiza a entrada existente no [estado](../../js/reports/reverse/state.js).

A composição, o Final e a cópia compartilham os totais normalizados. Quando só os códigos BR mudam, a prévia atualiza as tabelas correspondentes. O gráfico e o bloco do Final acompanham mudanças nos totais. [Modelo](../../js/reports/reverse/model.js) · [Prévia](../../js/reports/reverse/view.js)

Os botões de cópia nas tabelas de pacotes enviam o **Código BR** e a **Respectiva TO** em duas colunas, na ordem exibida em cada tabela. [Cópia das listas de pacotes](copia-de-dados-para-planilha.md#listas-de-pacotes-da-reversa)

Verifique o tipo obrigatório, a reimportação sem duplicar totais e a compatibilidade das sessões antigas em [reverse-import.test.mjs](../../tests/reverse-import.test.mjs).

## Relatório Final

A aba **Relatório Final** corresponde ao módulo `overall-analysis`. O [controlador](../../js/reports/overall-analysis/controller.js) recebe as alterações das fontes usadas pelo [modelo](../../js/reports/overall-analysis/model.js) e atualiza as seções dependentes. Os gráficos acompanham os valores que exibem. A [verificação de completude](../../js/reports/overall-analysis/completeness.js) determina quando o HTML autônomo pode ser gerado. Parcel Sweeper e Reversa são opcionais nessa verificação. O [exportador](../../js/reports/overall-analysis/standalone-export.js) gera o HTML a partir de uma cópia dos dados da janela.

As alterações nos campos globais reaproveitam os dados derivados dos relatórios de origem. A prévia escreve os valores que mudaram e as ações usam o contexto atualizado para verificar a disponibilidade e gerar a exportação. [Modelo](../../js/reports/overall-analysis/model.js) · [Teste de integração](../../tests/overall-analysis-html.browser.mjs)

Na tabela **Processamento**, a prévia e o HTML exibem **LHs Descarregados**, **Volume Esperado**, **Volume Descarregado** e **Volume Recebido**, nessa ordem. A quantidade e o volume dos LHs vêm dos registros marcados como descarregados. Sem uma lista de LHs, os dois campos exibem travessões. Com uma lista e sem marcações, exibem zero. Alterações nos totais de LHs atualizam as respectivas células e os dados para exportação. O Volume Esperado vem do planejamento do turno e o Volume Recebido vem da Mesa de Recebimento. [Modelo](../../js/reports/overall-analysis/model.js) · [Teste](../../tests/overall-analysis-html.test.mjs)

Abaixo dos indicadores de **Avarias e Perdas**, o Relatório Final exibe dois gráficos sem títulos visuais. A rosca usa as quatro categorias, as cores, os percentuais e o período do **Histórico Consolidado**. Na prévia e no HTML, sua legenda tem largura máxima de 500 px quando há dados de Avarias e Perdas e 385 px quando o relatório está vazio. O gráfico de linha usa os 12 meses da **Taxa de Perdas**, com intervalos onde faltam dados. Ele destaca o mês do **Histórico Consolidado** de Avarias e Perdas quando há um ponto desse mês e ano na série. O HTML incorpora os dados dos dois gráficos no momento do download. [Modelo](../../js/reports/overall-analysis/model.js) · [Gráficos](../../js/reports/overall-analysis/charts.js) · [Teste de integração](../../tests/overall-analysis-html.browser.mjs)

A seção **Análise de Erros** fica entre os resumos de Processamento e Expedição e os de Parcel Sweeper e Reversa. O modelo reutiliza `getExpeditionErrorAnalysis` e copia os oito indicadores da tabela para a exportação. Alterações na Expedição atualizam a prévia pelo controlador do Relatório Final. Os indicadores indisponíveis aparecem como travessões conforme a origem e as barras usam zero para valores ausentes. [Modelo](../../js/reports/overall-analysis/model.js) · [Prévia](../../js/reports/overall-analysis/view.js) · [Teste de integração](../../tests/overall-analysis-html.browser.mjs)

Na prévia e no HTML baixado, o gráfico de erros aparece abaixo da tabela de totais com o nome acessível **Acompanhamento dos Erros**. Ao lado, a tabela por rua usa os mesmos valores da subaba **Análise de Ruas** da Expedição. A tabela mostra Rua, Pacotes Ausentes, Erros da Rua e Taxa de Erros. A prévia acompanha as atualizações da Expedição e conserva esses dados ao reimportar Avarias e Perdas. São exibidas pelo menos 12 linhas, preenchidas com travessões quando faltam ruas. [Prévia do Relatório Final](../../index.html) · [Modelo HTML](../../final-report.html)

A cópia em imagem captura a própria prévia e pode ser usada quando há dados disponíveis nos gráficos da Taxa de Perdas. O HTML baixado abre offline com as fontes e os ícones incorporados, as cores do tema ativo e o mesmo formato de data da prévia. Processamento e Expedição compartilham a configuração dos gráficos de volume entre a prévia e o HTML. Em telas de até 900 px, o HTML empilha os blocos que aparecem lado a lado no desktop. Ao mudar a prévia, confira no modelo a estrutura, a tipografia, as cores, as bordas e o espaçamento. [Modelo HTML](../../final-report.html) · [Gráficos de volume](../../js/reports/overall-analysis/volume-chart.js) · [Teste de paridade](../../tests/overall-analysis-html.browser.mjs)

Verifique indicadores e critérios de exportação em [overall-analysis-cards.test.mjs](../../tests/overall-analysis-cards.test.mjs) e [overall-analysis-html.test.mjs](../../tests/overall-analysis-html.test.mjs).

### Ranking Mensal de Colaboradores

A subaba [Ranking Mensal de Colaboradores](ranking-de-colaboradores.md) apresenta cinco blocos. Recebimento, Erros de Etiquetagem e Rotas Conferidas cruzam o OPS dos relatórios com os valores das colunas **ID OPS** da planilha Resumo da Operação. Avarias Recebidas e Pacotes OFF usam os históricos da planilha de Avarias e Perdas e exibem os colaboradores em ordem crescente de ocorrências.
