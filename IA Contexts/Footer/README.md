# Footer

O rodapé dá acesso à documentação e a ferramentas externas da operação. A estrutura aparece em [index.html](../../index.html) e em [settings.html](../../settings.html).

## Links fixos e configuráveis

**Documentação** e **Sistema SPX** têm endereço definido no HTML. **Planilhas Base** está declarado e oculto no HTML. **Forms de Reversa**, **Pack Recovery**, **App das Avarias** e **App das Coletas** recebem endereço e visibilidade pela [Página de Configurações](../P%C3%A1gina%20de%20Configura%C3%A7%C3%B5es/README.md).

`renderExternalLinks()`, em [load-spreadsheets.js](../../js/spreadsheets/load-spreadsheets.js), usa `externalLinks` para preencher `data-url` e `footerVisibility` para mostrar ou ocultar o item. Um botão exibido fica desabilitado enquanto estiver sem endereço válido. O clique abre o endereço em outra aba. A ação está no script de [index.html](../../index.html) e em [page.js](../../js/settings/page.js) no editor.

## Verificação

Ao alterar um link configurável, confira os estados visível e oculto e teste a presença ou ausência de um endereço válido nas duas páginas. Consulte [dashboard-settings.test.mjs](../../tests/dashboard-settings.test.mjs) para a compatibilidade das preferências e [dashboard-settings.browser.mjs](../../tests/dashboard-settings.browser.mjs) para o efeito na interface.
