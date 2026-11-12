# 11/11/2026 · Salvamento automático na aba

- [Relatórios](../../js/reports/session.js) passam a gravar dados e campos globais no `sessionStorage` após importações, edições e limpezas. **Salvar sessão** baixa o arquivo `.js` com o estado atual. A inicialização continua lendo o formato de sessão v1.
- [Análises](../../js/data-analysis/core/analysis-store.js) guarda e recupera a base importada. [Filtragem](../../js/filter/init.js) guarda a base, a finalidade e a lista de valores, e refaz a filtragem aplicada ao recarregar.
- [Configurações](../../js/settings/page.js) grava na aba as preferências importadas pelo editor.

O [contexto de salvamento](../Menu%20Principal/salvamento-de-sessao.md), os guias dos painéis e a [ajuda do dashboard](../../docs.html) descrevem a recuperação na aba e pelo arquivo baixado.

Os testes verificam gravação de LHs e campos globais antes do download, restauração, limpeza e proteção contra uma importação de filtragem que termine depois da troca de finalidade.
