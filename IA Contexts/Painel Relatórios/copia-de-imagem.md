# Cópia de imagem dos relatórios

O clique no botão com ícone de imagem gera um PNG da visualização do relatório e o envia para a área de transferência. Quando as subabas exibem visualizações diferentes, a captura segue a subaba aberta. Quando as subabas trocam apenas os controles, a captura usa a prévia compartilhada. Um relatório de visualização única usa sua área completa.

## Área capturada por relatório

| Relatório | Área da imagem |
| --- | --- |
| Processamento | Descarregamento de LHs, Mesa de Recebimento ou Ranking de Recebedores, conforme a subaba aberta. |
| Expedição | Resumo de Expedição, Ranking de Conferentes, Análise de Erros ou Análise de Ruas, conforme a subaba aberta. |
| Planejamento | Prévia de Planejamento. Lista de LHs, TOs a Segregar, Backlog e Collection Pool e Indicadores alternam os controles de edição. |
| Avarias e Perdas | Avarias do Mês, Histórico Consolidado ou Perdas do Mês, conforme a subaba aberta. |
| Taxa de Perdas | Prévia atualizada com o mês selecionado e o gráfico de histórico anual. |
| Parcel Sweeper | Prévia com as tabelas atualizadas pelo filtro de pacotes ativo. |
| Reversa | Prévia completa da Reversa. |
| Relatório Final | Área completa do Relatório Final. |

## Implementação

[export.js](../../js/reports/export.js) liga o clique à cópia e o pressionamento de 1,5 segundo ao download. A imagem é gerada com `html2canvas` e escrita na área de transferência como `image/png`.

- [Processamento](../../js/reports/receipt/export.js) identifica a subaba ativa e usa a mesma validação para habilitar o botão e executar a exportação. Descarregamento de LHs usa os LHs cadastrados. Mesa de Recebimento e Ranking exigem recebedor selecionado, volume esperado e erros preenchidos.
- [Expedição](../../js/reports/expedition/export.js) seleciona a área associada à subaba ativa. [Avarias e Perdas](../../js/reports/damage-and-losses/actions.js) seleciona a área de avarias, histórico ou perdas conforme a subaba aberta.
- [Planejamento](../../js/reports/planning/view.js) captura `#planningReportExportArea`. O [Relatório Final](../../js/reports/overall-analysis/actions.js) captura `#overallAnalysisReportExportArea`.

Para verificar a seleção e a validação das subabas de Processamento, rode `node --test tests/receipt-image-export.test.mjs`.
