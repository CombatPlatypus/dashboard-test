# Salvamento e importação de sessão

O dashboard guarda o trabalho automaticamente no `sessionStorage` da aba. **Salvar sessão** baixa um arquivo com os relatórios e as preferências atuais para recuperar o trabalho depois de fechar a aba ou em outro navegador. [session.js](../../js/reports/session.js) conecta os botões do menu ao [ReportManager](../../js/reports/core/report-manager.js) e às [preferências do dashboard](../../js/spreadsheets/load-spreadsheets.js).

## Salvamento automático na aba

Após restaurar a sessão, o módulo observa os estados dos relatórios e os campos globais. O índice `dashboard-report-session-v2` aponta para as partes gravadas em `dashboard-report-state-v2:<id>:<revisão>`. Uma edição exporta, valida e grava apenas o relatório afetado. O filtro e a classificação manual do Parcel Sweeper ficam no índice e reutilizam a parte que guarda os pacotes.

Notificações da mesma operação são agrupadas. Se a operação altera vários relatórios, as novas partes são gravadas antes de publicar o índice e as referências anteriores são liberadas após o sucesso. Edições restritas aos campos globais gravam `dashboard-report-context-v1`. A revisão do índice permite recuperar o contexto mais recente, inclusive quando o volume planejado foi apagado. A cópia antiga em `dashboard-report-session-v1` continua legível e é migrada na primeira gravação de dados dos relatórios.

Ao recarregar a aba, o dashboard restaura os dados gravados e o Relatório Final é recalculado a partir das fontes recuperadas. Ao fechar a aba, o navegador encerra a sessão. Na falta de espaço para uma gravação, a última cópia válida é preservada, o dashboard mostra um aviso e tenta guardar as alterações pendentes na próxima edição. **Salvar sessão** baixa os dados atuais.

As bases importadas em [Análises](../Painel%20An%C3%A1lises/README.md) e [Filtragem](../Painel%20Filtragem/README.md) também são guardadas na aba em chaves próprias.

O [Ranking Mensal de Colaboradores](../Painel%20Relat%C3%B3rios/ranking-de-colaboradores.md) grava o acumulado importado na parte `overall-analysis` quando ele muda ou é descartado. A prévia recupera as rotas atuais da parte de Expedição.

## Arquivo de sessão

`createReportSessionPayload()` coleta o contexto da janela, as preferências, os sete relatórios operacionais e o acumulado importado do Ranking de Colaboradores. `downloadReportSession()` valida o objeto e inicia o download de `sessao-dashboard-AAAA-MM-DD_HH-MM-SS.js`. O arquivo contém JSON dentro de uma atribuição a `DASHBOARD_REPORT_SESSION`, com esquema `dashboard-report-session` e versão 1. O clique só inicia o download.

## Importação e restauração

- O seletor aceita arquivos `.js` de até 50 MB. O módulo lê o conteúdo como texto, extrai o JSON e valida o esquema, a versão e a estrutura dos relatórios. A leitura usa `JSON.parse()` sem executar o JavaScript do arquivo.
- Um arquivo de relatórios aplica o contexto, chama `importSession()` nos módulos presentes e aplica as preferências disponíveis. As visualizações dependentes são atualizadas no mesmo lote após aplicar os dados. A sessão da aba é gravada após o sucesso. Se a aplicação falhar, o código tenta reaplicar os estados afetados, o contexto e as preferências anteriores.
- Sessões v1 antigas podem conter apenas Planejamento, Processamento, Expedição e Taxa de Perdas. A importação aplica os relatórios presentes no arquivo e conserva o estado atual dos demais.
- O botão do menu também aceita arquivos só de configurações. Nesse fluxo ele aplica e grava as preferências diretamente na aba. Veja [Página de Configurações](../P%C3%A1gina%20de%20Configura%C3%A7%C3%B5es/README.md) para o fluxo do editor.

## Prioridade no recarregamento

`restoreSavedReportSession()` recupera os dados operacionais da última cópia da aba. Para as preferências, usa primeiro a chave de configurações e, na ausência dela, as preferências incluídas na cópia dos relatórios. Uma alteração no nome ou no turno do perfil salvo pode atualizar o analista e a janela operacionais. Mudanças apenas de tema ou de links preservam os campos da sessão restaurada.

## Verificação

Rode `node --test tests/report-session.test.mjs tests/report-session-autosave.test.mjs tests/dashboard-settings.test.mjs`. As suítes cobrem quais partes são gravadas, a migração, a separação entre gravação e download, a restauração dos relatórios e do ranking e a reversão ou nova tentativa após falhas. O [roteiro de navegador](../../tests/dashboard-settings.browser.mjs) também verifica a recuperação na aba e a prioridade das preferências.
