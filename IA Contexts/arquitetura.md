# Arquitetura do Dashboard do Inventário

O dashboard é uma aplicação web estática. A hospedagem entrega HTML, CSS e JavaScript, e o navegador carrega os módulos, lê as bases importadas, executa os cálculos e atualiza a interface. A página principal contém os quatro painéis. O Foundation controla a navegação por abas, a biblioteca XLSX lê os arquivos de planilha e o Chart.js renderiza os gráficos. [Página principal](../index.html) · [Padrão de gráficos](graficos.md)

## Painéis e fluxo de dados

| Painel | Da entrada ao resultado | Ponto de entrada no código |
| --- | --- | --- |
| [Planilhas](Painel%20Planilhas/README.md) | Abre os links operacionais, com carregamento da planilha selecionada em um `iframe` sob demanda. O Google Planilhas controla o acesso e a edição. | [load-spreadsheets.js](../js/spreadsheets/load-spreadsheets.js) |
| [Relatórios](Painel%20Relat%C3%B3rios/README.md) | Recebe arquivos, dados copiados ou campos preenchidos, conforme o relatório. Calcula os indicadores da operação e atualiza as prévias e o Relatório Final. | [init.js](../js/reports/init.js) |
| [Análises](Painel%20An%C3%A1lises/README.md) | Importa uma base CSV, XLS ou XLSX. A prévia fornece as linhas filtradas e as colunas visíveis às abas de estatísticas e comparação. | [index.js](../js/data-analysis/index.js) |
| [Filtragem](Painel%20Filtragem/README.md) | Procura uma lista de valores em um arquivo ou em dados copiados. A finalidade escolhida define as colunas de busca e o conteúdo da prévia, da cópia e do CSV. | [init.js](../js/filter/init.js) |

A página de Configurações edita preferências usadas pelo painel Planilhas, pelo menu e pelo rodapé. Nome e turno também podem preencher os campos operacionais de Relatórios. [Página de Configurações](P%C3%A1gina%20de%20Configura%C3%A7%C3%B5es/README.md)

## Como o painel Relatórios organiza os dados

O painel registra sete módulos operacionais e o módulo do Relatório Final no `ReportManager`. Cada módulo oferece a mesma interface para inicializar, renderizar, limpar, importar dados, exportar ou restaurar seu estado de sessão e indicar se pode exportar. Os campos globais formam o contexto da janela, com turno, analista, volume planejado, número de colaboradores e capacidade. [Inicialização](../js/reports/init.js) · [Gerenciador](../js/reports/core/report-manager.js) · [Contrato dos módulos](../js/reports/core/report-contract.js) · [Contexto da janela](../js/reports/core/report-context.js)

Dentro de um relatório, o controlador conecta os eventos da interface aos módulos. O importador interpreta a fonte, o estado guarda os registros em memória, e o estado ou o modelo calcula os indicadores. As visualizações usam esses resultados para atualizar tabelas e gráficos. O Relatório Final observa as fontes que utiliza e recalcula as seções afetadas. [Fluxo compartilhado de Relatórios](Painel%20Relat%C3%B3rios/README.md#fluxo-compartilhado) · [Controlador do Relatório Final](../js/reports/overall-analysis/controller.js)

## Atualização seletiva

Esta regra vale para funções atuais e futuras em todos os painéis. Ao conectar um input, uma importação ou outro evento, identifique os dados que ele altera e os componentes que os consomem. Uma mudança de Planejamento, por exemplo, atualiza os itens afetados em Planejamento e a própria parte da sessão.

- Use o tipo da alteração e o campo afetado para limitar os ouvintes e a renderização. Um filtro local deve alcançar somente as tabelas ou os gráficos que usam esse filtro. Compare os valores do componente quando o mesmo evento puder deixar seu conteúdo igual.
- Reaproveite cálculos derivados enquanto suas entradas forem as mesmas. Use o estado atual na hora de copiar ou exportar e calcule formatos como HTML e TSV quando a ação for executada.
- Agrupe alterações que formam uma operação. Uma planilha de Avarias e Perdas publica Avarias, Perdas e Taxa juntas para o Consolidado e o Final lerem o conjunto completo uma vez. Para as prévias dos relatórios, use `requestReportUpdate` com uma função de renderização estável dentro de `batchReportUpdates`. O lote é síncrono e termina dentro do fluxo de restauração. [Atualização das prévias](../js/reports/core/report-updates.js)
- Registre no salvamento automático somente o relatório que mudou. Preferências de visualização que não modificam a base podem ser persistidas separadamente. A exportação da sessão continua reunindo todos os estados. [Salvamento da sessão](Menu%20Principal/salvamento-de-sessao.md)
- Verifique um componente dependente e um independente ao testar o fluxo. Em mudanças de importação ou armazenamento, confira também a restauração e as exportações correspondentes.

### Exemplo com o Gestão Audit

1. O analista exporta o Gestão Audit do SPX e importa o arquivo em **Relatórios > Expedição**. O importador identifica as colunas, monta um registro por rota e ignora códigos de rota repetidos. [Importação de Expedição](../js/reports/expedition/import.js)
2. O estado conta como feitas as rotas cujo status é `Validated` ou `Validado`. Se 8 de 10 rotas tiverem esses status, a prévia mostra **8 feitas, 2 pendentes e 80%** em **Progresso da Conferência**. O filtro por conferente afeta a tabela, enquanto a barra de progresso usa todas as rotas importadas. [Estado](../js/reports/expedition/state.js) · [Prévia](../js/reports/expedition/view.js) · [Teste do progresso](../tests/expedition-progress.test.mjs)
3. A alteração no estado também atualiza os dados de Expedição usados pelo Relatório Final e aciona o salvamento automático na aba. [Controlador do Relatório Final](../js/reports/overall-analysis/controller.js) · [Gerenciador de sessão](../js/reports/session.js)

## Barra de notificações

O texto completo de cada mensagem exibida na barra de notificações deve ter no máximo **146 caracteres**, incluindo espaços, pontuação e trechos dinâmicos. Verifique o limite depois de montar a mensagem final.

## Sessão da aba e arquivos baixados

- **Salvamento automático.** O `sessionStorage` guarda os dados para restaurar o trabalho ao recarregar a mesma aba. Relatórios, Análises, Filtragem e Configurações gravam em chaves próprias. [Salvamento e importação de sessão](Menu%20Principal/salvamento-de-sessao.md)
- **Arquivo de sessão.** **Salvar sessão** baixa um `.js` com os estados dos relatórios, o contexto da janela e as preferências. Ao reimportá-lo, o dashboard restaura esses dados e recalcula o Relatório Final. O arquivo permite retomar o trabalho após fechar a aba ou em outro navegador. [Formato e restauração da sessão](Menu%20Principal/salvamento-de-sessao.md#arquivo-de-sess%C3%A3o)
- **Exportação do Relatório Final.** Quando os critérios de completude são atendidos, o dashboard gera um HTML com uma cópia dos dados da janela e os recursos de renderização incorporados. O arquivo pode ser aberto offline. [Critérios de completude](../js/reports/overall-analysis/completeness.js) · [Exportador HTML](../js/reports/overall-analysis/standalone-export.js)
