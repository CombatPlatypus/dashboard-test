# Página de Configurações

A página [settings.html](../../settings.html) personaliza o dashboard para o analista. O editor usa o mesmo modelo de preferências que o painel Planilhas, o menu e o rodapé.

| Configuração | Onde é aplicada |
| --- | --- |
| Perfil | Guarda nome, e-mail, turno e ícone. Nome e turno podem preencher os campos operacionais. O ícone aparece no menu. |
| Planilhas | Nome, endereço e visibilidade de cada posição alimentam o [painel Planilhas](../Painel%20Planilhas/README.md). |
| Links | Endereço e visibilidade alimentam os botões configuráveis do [Footer](../Footer/README.md). |
| Tema | A escolha define `data-theme` no elemento raiz e ativa a paleta correspondente. |

## Edição, salvamento e importação

[load-spreadsheets.js](../../js/spreadsheets/load-spreadsheets.js) normaliza, valida, mantém e aplica as preferências. [page.js](../../js/settings/page.js) conecta os botões do editor. **Salvar configurações** valida os campos, inicia o download de `configurações-dashboard.js` e grava as preferências em `dashboard-settings-session-v1`. O nome do analista pode aparecer no nome do arquivo. **Salvar e Voltar** executa a mesma gravação e navega para o dashboard na aba do editor quando a gravação na aba é bem-sucedida.

[settings-file.js](../../js/settings/settings-file.js) serializa e lê o formato `dashboard-settings` versão 1. **Importar configurações** no editor preenche os campos a partir de um arquivo de preferências ou da seção de preferências de um arquivo de sessão e grava as preferências importadas na aba. **Salvar configurações** confirma as edições feitas nos campos do editor.

## Efeito entre abas

A engrenagem no [Menu Principal](../Menu%20Principal/README.md) abre o editor. A navegação na mesma aba e origem usa a mesma sessão. Se o editor for aberto em uma nova aba com acesso à aba de origem, a nova aba pode receber uma cópia inicial. Para aplicar preferências de outra aba, importe o arquivo de configurações pelo botão **Importar sessão** na aba desejada.

## Verificação

Rode `node --test tests/dashboard-settings.test.mjs tests/spreadsheet-default-config.test.mjs`. O [roteiro de navegador](../../tests/dashboard-settings.browser.mjs) cobre a abertura em outra aba, os efeitos do tema, o fluxo **Salvar e Voltar** e a falha de gravação no navegador.
