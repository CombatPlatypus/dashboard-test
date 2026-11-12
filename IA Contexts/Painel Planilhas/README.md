# Painel Planilhas

O painel reúne as planilhas operacionais usadas no dia a dia. O usuário escolhe uma entrada na lista para abrir a planilha dentro do dashboard, ou usa a seta da entrada para abri-la no Google Planilhas em outra guia. A interação com a planilha e suas permissões de acesso ficam a cargo do Google.

## Lista de planilhas

Na inicialização, [load-spreadsheets.js](../../js/spreadsheets/load-spreadsheets.js) consulta as preferências salvas na aba. O cadastro suporta até 20 posições com link, nome de menu e visibilidade. A lista padrão vem de [spreadsheets.json](../../config/spreadsheets.json), carregado por [default-spreadsheets.js](../../js/spreadsheets/default-spreadsheets.js). Se essa leitura falhar, o módulo usa a lista incorporada em [spreadsheet-presets.js](../../js/spreadsheets/spreadsheet-presets.js).

O ícone do [Menu Principal](../Menu%20Principal/README.md) também oferece o atalho **Carregar planilhas da operação**. Ele aplica uma lista própria às 20 posições e grava a configuração na aba. A edição manual de cada posição fica na [Página de Configurações](../P%C3%A1gina%20de%20Configura%C3%A7%C3%B5es/README.md).

## Visualização integrada

O HTML define o contêiner `#spreadsheets` em [index.html](../../index.html). Em [load-spreadsheets.js](../../js/spreadsheets/load-spreadsheets.js), `getVisibleSpreadsheetConfigurations()` seleciona as posições visíveis com endereço válido. Se a lista ficar vazia, o painel exibe posições de exemplo. `renderSpreadsheetInterface()` monta as abas e `initializeSpreadsheetNavigation()` reage à navegação.

O endereço fica em `data-src`. O módulo só atribui `src` ao iframe da planilha selecionada enquanto **Planilhas** está aberto. Ao trocar de planilha ou sair do painel, o iframe anterior é descarregado.

## Verificação

Rode `node --test tests/spreadsheet-default-config.test.mjs` para conferir a ordem da lista padrão, a correspondência da lista incorporada e o carregamento da configuração. Em mudanças de navegação, confira a seleção da planilha, a seta de abertura e a troca para outro painel.
