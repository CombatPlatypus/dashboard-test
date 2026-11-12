# Painel Relatórios

O painel acompanha a operação da janela e consolida os dados no **Relatório Final**. Cada relatório tem suas próprias fontes de dados, controles e regras de cálculo. O painel começa em `#reports` de [index.html](../../index.html).

## Fluxo compartilhado

[init.js](../../js/reports/init.js) registra os módulos no [ReportManager](../../js/reports/core/report-manager.js). Cada módulo expõe ações de inicialização, renderização, limpeza, importação de dados e leitura e gravação da sessão. Os [campos globais](../../js/reports/global-inputs.js) atualizam o [contexto da janela](../../js/reports/core/report-context.js), com turno, analista, volume planejado, colaboradores e capacidade.

Dentro de cada relatório, siga o controlador para localizar os eventos da tela e a função que altera o estado. Consulte o importador para as regras do arquivo ou da área de transferência e o estado ou modelo para os cálculos. Uma mudança na estrutura exportada pode afetar a [restauração de sessões](../Menu%20Principal/salvamento-de-sessao.md) e o Relatório Final.

Importações, edições e limpezas passam pelas notificações do estado e são [guardadas automaticamente na aba](../Menu%20Principal/salvamento-de-sessao.md). Ao registrar novos dados de um relatório, inclua os dados no estado que o módulo exporta e restaura e emita a notificação de mudança. Para um novo módulo, conecte a inscrição do estado em [session.js](../../js/reports/session.js).

Para criar ou alterar gráficos no painel ou no HTML do Relatório Final, siga o [padrão de gráficos do dashboard](../graficos.md).

O botão de imagem captura a visualização de dados da subaba aberta. Quando as subabas alternam apenas os controles, a captura usa a prévia compartilhada. Consulte o [contexto da cópia de imagem](copia-de-imagem.md) para os destinos de cada relatório.

## Processamento

Acompanha **Descarregamento de LHs**, **Mesa de Recebimento** e **Ranking de Recebedores**. O [importador de LHs](../../js/reports/receipt/linehaul-import.js) trata a leitura e a seleção da janela. O [estado de LHs](../../js/reports/receipt/linehaul-state.js) deriva o volume restante a partir do volume esperado e dos LHs marcados como descarregados. O [importador de recebimento](../../js/reports/receipt/import.js) agrupa os registros por operador para a mesa e o ranking. A sessão reúne os dois estados no [controlador](../../js/reports/receipt/controller.js).

Verifique alinhamento, confirmação da importação e recálculo de volume em [linehaul-import-alignment.test.mjs](../../tests/linehaul-import-alignment.test.mjs), [linehaul-import-confirmation.test.mjs](../../tests/linehaul-import-confirmation.test.mjs) e [receipt-linehaul-remaining.test.mjs](../../tests/receipt-linehaul-remaining.test.mjs).

O [exportador de Processamento](../../js/reports/receipt/export.js) usa os dados da subaba ativa tanto para habilitar o botão de imagem quanto para executar a captura. Descarregamento de LHs pode ser copiado assim que houver LHs cadastrados. Mesa de Recebimento e Ranking de Recebedores usam a validação dos dados de recebimento.

## Expedição

Acompanha rotas expedidas, ranking de conferentes, erros e ocorrências por rua. O [importador de expedição](../../js/reports/expedition/import.js) identifica as colunas e monta os registros por rota. A [importação de erros](../../js/reports/expedition/errors-import.js) alimenta as visões de erros e ruas. O [estado](../../js/reports/expedition/state.js) reúne rotas, volumes, erros e ajustes usados no resumo e no Relatório Final.

Verifique o botão de importação nas quatro abas em [expedition-import-tabs.test.mjs](../../tests/expedition-import-tabs.test.mjs) e o volume de retirados em [expedition-withdrawn.test.mjs](../../tests/expedition-withdrawn.test.mjs).

## Planejamento

Organiza a lista de LHs, as TOs a segregar, o backlog e os indicadores de Collection Pool e veículos. A [importação de Planejamento](../../js/reports/planning/import.js) interpreta dados copiados do SPX e pede uma escolha quando detecta mais de uma janela válida. Os [cálculos](../../js/reports/planning/calculations.js) usam os dados da [janela e do planejamento](../../js/reports/planning/state.js) para montar os totais.

Verifique a origem do backlog e sua presença nos resumos em [planning-backlog.test.mjs](../../tests/planning-backlog.test.mjs) e [report-summary-copy.test.mjs](../../tests/report-summary-copy.test.mjs).

## Avarias e Perdas

Mostra Avarias do Mês, Perdas do Mês e Histórico Consolidado. O [importador](../../js/reports/damage-and-losses/import.js) identifica as abas e os blocos do XLSX. O [controlador](../../js/reports/damage-and-losses/controller.js) exporta os estados de avarias e perdas na mesma entrada da sessão. O [modelo consolidado](../../js/reports/damage-and-losses/consolidated-model.js) combina os históricos com o estado da Taxa de Perdas para o mês selecionado.

Em **Perdas do Mês**, o gráfico **Pack Recovery** cruza os códigos BR do histórico com a coluna Pack Recovery da **Base de Análises**. A contagem do período selecionado usa **Feito**, **ID Inválido**, **Sem Dados** e **Aguardando**. Células vazias e pacotes sem correspondência na base entram em **Sem Dados**. Rótulos preenchidos fora da lista ficam fora da contagem do gráfico. [Importação](../../js/reports/damage-and-losses/import.js) · [Gráfico](../../js/reports/damage-and-losses/losses-charts.js) · [Testes](../../tests/damage-and-losses-losses.test.mjs)

Verifique o reconhecimento dos blocos lado a lado e a seleção mensal em [damage-and-losses-workbook.test.mjs](../../tests/damage-and-losses-workbook.test.mjs) e [consolidated-history.test.mjs](../../tests/consolidated-history.test.mjs).

## Taxa de Perdas

Acompanha a composição das ocorrências e a evolução da taxa ao longo do ano. O [leitor de histórico](../../js/reports/losses-rate/workbook.js) reconhece as colunas da planilha, converte os valores e monta a série de 12 meses. O [estado](../../js/reports/losses-rate/state.js) fornece os dados ao relatório, ao Histórico Consolidado e ao Relatório Final.

Verifique a leitura do formato em [losses-rate-workbook.test.mjs](../../tests/losses-rate-workbook.test.mjs) e a presença dos 12 meses em [report-session.test.mjs](../../tests/report-session.test.mjs).

## Parcel Sweeper

Acompanha a cobertura da varredura e apresenta recortes de pacotes por operador, aging, status e próxima ação. O [importador](../../js/reports/parcel-sweeper/import.js) normaliza os registros do arquivo. O [modelo](../../js/reports/parcel-sweeper/model.js) usa `Count Type` para a cobertura dos pacotes esperados e aplica as regras de classificação por operador. O [estado](../../js/reports/parcel-sweeper/state.js) guarda os registros e os ajustes manuais de classificação.

Verifique cobertura, casos de exceção e classificação em [parcel-sweeper.test.mjs](../../tests/parcel-sweeper.test.mjs) e [parcel-sweeper-overrides.test.mjs](../../tests/parcel-sweeper-overrides.test.mjs).

## Reversa

Agrupa os pacotes por TO e mostra a composição de Return, Missorted, Liquidate e Confiscado. O usuário escolhe o tipo antes de o [importador](../../js/reports/reverse/import.js) processar o arquivo SPX. O importador lê o identificador da TO na célula B2 e usa o tipo escolhido para classificar os códigos únicos. Uma nova importação da mesma TO atualiza a entrada existente no [estado](../../js/reports/reverse/state.js).

Verifique o tipo obrigatório, a reimportação sem duplicar totais e a compatibilidade das sessões antigas em [reverse-import.test.mjs](../../tests/reverse-import.test.mjs).

## Relatório Final

A aba **Relatório Final** corresponde ao módulo `overall-analysis`. O [controlador](../../js/reports/overall-analysis/controller.js) coleta os dados dos demais módulos e o [modelo](../../js/reports/overall-analysis/model.js) calcula o resumo da janela. A [verificação de completude](../../js/reports/overall-analysis/completeness.js) determina quando o HTML autônomo pode ser gerado. Parcel Sweeper e Reversa são opcionais nessa verificação. O [exportador](../../js/reports/overall-analysis/standalone-export.js) gera o HTML a partir de uma cópia dos dados da janela.

Verifique indicadores e critérios de exportação em [overall-analysis-cards.test.mjs](../../tests/overall-analysis-cards.test.mjs) e [overall-analysis-html.test.mjs](../../tests/overall-analysis-html.test.mjs).
