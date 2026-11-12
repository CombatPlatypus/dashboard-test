# Painel Planilhas

O painel reúne as planilhas operacionais usadas no dia a dia. O usuário escolhe uma entrada na lista para abrir a planilha dentro do dashboard, ou usa a seta da entrada para abri-la no Google Planilhas em outra guia. A interação com a planilha e suas permissões de acesso ficam a cargo do Google.

## Lista de planilhas

Na inicialização, [load-spreadsheets.js](../../js/spreadsheets/load-spreadsheets.js) consulta as preferências salvas na aba. O cadastro suporta até 20 posições com link, nome de menu e visibilidade. A lista padrão vem de [spreadsheets.json](../../config/spreadsheets.json), carregado por [default-spreadsheets.js](../../js/spreadsheets/default-spreadsheets.js). Se essa leitura falhar, o módulo usa a lista incorporada em [spreadsheet-presets.js](../../js/spreadsheets/spreadsheet-presets.js).

O ícone do [Menu Principal](../Menu%20Principal/README.md) também oferece o atalho **Carregar planilhas da operação**. Ele aplica uma lista própria às 20 posições e grava a configuração na aba. A edição manual de cada posição fica na [Página de Configurações](../P%C3%A1gina%20de%20Configura%C3%A7%C3%B5es/README.md).

## Visualização integrada

O HTML define o contêiner `#spreadsheets` em [index.html](../../index.html). Em [load-spreadsheets.js](../../js/spreadsheets/load-spreadsheets.js), `getVisibleSpreadsheetConfigurations()` seleciona as posições visíveis com endereço válido. Se a lista ficar vazia, o painel exibe posições de exemplo. `renderSpreadsheetInterface()` monta as abas e `initializeSpreadsheetNavigation()` reage à navegação.

O endereço fica em `data-src`. O módulo só atribui `src` ao iframe da planilha selecionada enquanto **Planilhas** está aberto. Ao trocar de planilha ou sair do painel, o iframe anterior é descarregado.

## Teste de leitura pela extensão

A [página de teste](../../extension-test.html) mantém **Testar conexão** e oferece **Ler título da planilha**. [extension-connection.js](../../extensions/extension-connection.js) envia o pedido e exibe a resposta no parágrafo `#status-conexao-extensao`. [background.js](../../extensions/background.js) aceita a leitura somente da página de teste publicada e procura uma única planilha aberta na janela do Dashboard.

No Opera GX, recarregue a extensão da pasta `extensions` e permita o acesso a `docs.google.com`. Na aba **Visão Geral** de **Resumo Operação**, selecione o título mesclado `B2:R3`, deixe a barra de fórmulas visível e clique em **Ler título da planilha** no Dashboard. O teste confere a seleção e lê o texto da barra de fórmulas. Não usa a API do Google Planilhas, não alterna o foco e não modifica o arquivo. Como depende dos elementos da interface do editor, valide essa leitura no navegador após mudar a extensão.

**Ler célula I7** testa o valor exibido sem usar a barra de fórmulas. Com a **Visão Geral** aberta, a extensão ativa a planilha, tenta ir a `I7` pela caixa de nome e copia a seleção. O texto copiado aparece em `#status-conexao-extensao` e a extensão volta ao Dashboard. Esse teste usa as permissões de área de transferência; uma cópia bem-sucedida substitui o conteúdo dela. Se a seleção automática não for confirmada, selecione `I7` e repita o teste. Se a área de transferência já contiver o mesmo texto, copie outro texto antes de testar novamente para permitir a confirmação da nova cópia.

## Verificação

Rode `node --test tests/spreadsheet-default-config.test.mjs` para conferir a ordem da lista padrão, a correspondência da lista incorporada e o carregamento da configuração. Em mudanças de navegação, confira a seleção da planilha, a seta de abertura e a troca para outro painel.
