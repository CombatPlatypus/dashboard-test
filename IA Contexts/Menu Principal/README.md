# Menu Principal

O menu reúne a navegação pelos quatro painéis e as ações disponíveis de qualquer painel. O HTML fica em [index.html](../../index.html), com as abas em `#change-panel` e as ações em `.nav-actions`.

| Função | Onde começa |
| --- | --- |
| Trocar de painel | A aba aponta para `#spreadsheets`, `#reports`, `#analysis` ou `#filter`. O Foundation gerencia a aba ativa. |
| Salvar ou importar sessão | Os controles `#reportDownloadButton` e `#reportImportButton` são ligados por [session.js](../../js/reports/session.js). Veja [Salvamento e importação de sessão](salvamento-de-sessao.md). |
| Abrir Configurações | `#dashboardSettingsLink` abre o editor. [load-spreadsheets.js](../../js/spreadsheets/load-spreadsheets.js) guarda as preferências atuais na aba antes da navegação. |
| Carregar planilhas da operação | O ícone de perfil aceita duplo clique, Enter ou Espaço. A ação chama `applyOperationSpreadsheetSettings()` e grava as preferências na aba. Veja [Planilhas](../Painel%20Planilhas/README.md). |
| Abrir o suporte | O ícone de suporte é um link do menu definido no próprio HTML. |

Ao alterar os controles de sessão, confira também `#reportSessionFeedback`, que mostra as notificações quando o usuário está fora do painel Relatórios.
