# Salvamento e importação de sessão

O dashboard guarda o trabalho automaticamente no `sessionStorage` da aba. **Salvar sessão** baixa um arquivo com os relatórios e as preferências atuais para recuperar o trabalho depois de fechar a aba ou em outro navegador. [session.js](../../js/reports/session.js) conecta os botões do menu ao [ReportManager](../../js/reports/core/report-manager.js) e às [preferências do dashboard](../../js/spreadsheets/load-spreadsheets.js).

## Salvamento automático na aba

Após restaurar a sessão, o módulo observa os estados dos relatórios e os campos globais. Importações, edições e limpezas agendam uma gravação em `dashboard-report-session-v1`. As notificações de uma mesma operação são agrupadas em uma única gravação. O Relatório Final é recalculado a partir dos dados restaurados.

Ao recarregar a mesma aba, o dashboard restaura a última gravação. Ao fechar a aba, o navegador encerra a sessão. Se a gravação falhar por cota ou acesso ao armazenamento, o dashboard avisa e a opção de baixar o arquivo usa os dados atuais dos relatórios.

As bases importadas em [Análises](../Painel%20An%C3%A1lises/README.md) e [Filtragem](../Painel%20Filtragem/README.md) também são guardadas na aba em chaves próprias.

## Arquivo de sessão

`createReportSessionPayload()` coleta o contexto da janela, as preferências e o estado que cada um dos sete relatórios operacionais exporta. `downloadReportSession()` valida o objeto e inicia o download de `sessao-dashboard-AAAA-MM-DD_HH-MM-SS.js`. O arquivo contém JSON dentro de uma atribuição a `DASHBOARD_REPORT_SESSION`, com esquema `dashboard-report-session` e versão 1. O clique só inicia o download.

## Importação e restauração

- O seletor aceita arquivos `.js` de até 50 MB. O módulo lê o conteúdo como texto, extrai o JSON e valida o esquema, a versão e a estrutura dos relatórios. A leitura usa `JSON.parse()` sem executar o JavaScript do arquivo.
- Um arquivo de relatórios aplica o contexto, chama `importSession()` em cada módulo presente, aplica as preferências do arquivo quando disponíveis e renderiza o Relatório Final. A sessão da aba é gravada após a aplicação bem-sucedida. Se a aplicação falhar, o código tenta reaplicar os estados, o contexto e as preferências anteriores.
- Sessões v1 antigas podem conter apenas Planejamento, Processamento, Expedição e Taxa de Perdas. A importação aplica os relatórios presentes no arquivo e conserva o estado atual dos demais.
- O botão do menu também aceita arquivos só de configurações. Nesse fluxo ele aplica e grava as preferências diretamente na aba. Veja [Página de Configurações](../P%C3%A1gina%20de%20Configura%C3%A7%C3%B5es/README.md) para o fluxo do editor.

## Prioridade no recarregamento

`restoreSavedReportSession()` recupera os dados operacionais da última cópia da aba. Para as preferências, usa primeiro a chave de configurações e, na ausência dela, as preferências incluídas na cópia dos relatórios. Uma alteração no nome ou no turno do perfil salvo pode atualizar o analista e a janela operacionais. Mudanças apenas de tema ou de links preservam os campos da sessão restaurada.

## Verificação

Rode `node --test tests/report-session.test.mjs tests/report-session-autosave.test.mjs tests/dashboard-settings.test.mjs`. As suítes cobrem a gravação automática, a separação entre gravação e download, a restauração dos sete relatórios, a leitura de arquivos antigos e a tentativa de reversão em caso de falha. O [roteiro de navegador](../../tests/dashboard-settings.browser.mjs) também verifica a recuperação na aba e a prioridade das preferências.
