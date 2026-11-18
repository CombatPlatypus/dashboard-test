# Cópia de dados para planilha

O botão de cópia de dados usa o estado atual do relatório para montar a tabela. A área de transferência recebe HTML com mesclagens, bordas e alinhamento, além de texto tabulado. A dica do botão e a mensagem de sucesso indicam a aba e a célula inicial. Use `Ctrl+V` para colar o bloco formatado. [Implementação](../../js/reports/summary-copy.js)

## Resumo da Operação

Cole os blocos na aba **Base de Dados**, começando pela primeira célula do intervalo indicado.

| Relatório | AM | PM1 | PM2 |
| --- | --- | --- | --- |
| Processamento | `C7:F62` | `C67:F122` | `C127:F182` |
| Expedição | `G7:J62` | `G67:J122` | `G127:J182` |

Cada bloco por janela tem 56 linhas. Processamento copia o resumo de LHs, os volumes e a lista dos recebedores selecionados. Expedição copia o resumo de rotas e volumes, a análise de erros e o ranking dos conferentes selecionados. As linhas restantes da lista ficam vazias para limpar os dados de uma colagem anterior. A cópia informa quando a seleção excede a capacidade do bloco.

| Relatório | Intervalo | Data | Indicadores |
| --- | --- | --- | --- |
| Parcel Sweeper | `C185:J187` | `G185` | Porcentagem em `C187`, separador em `D187`, Total de Bipado em `E187`, Exception em `G187` e Missorted em `I187` |
| Reversa | `C189:J191` | `G189` | Return em `C191`, Missorted em `E191`, Liquidate em `G191` e Confiscado em `I191` |

Parcel Sweeper e Reversa usam o dia da cópia no horário de São Paulo e os totais do relatório. A janela selecionada não altera esses dois destinos.

### Expedição do Ranking Mensal

No [Ranking Mensal de Colaboradores](ranking-de-colaboradores.md), selecione o título mesclado `C2:P3` da aba **Ranking de Colaboradores** e cole com `Ctrl+V`. O HTML aplica o alinhamento horizontal e vertical centralizado e a fonte diretamente às células. A fonte Open Sans usa 20 pt no título mesclado, 12 pt nos títulos das seções, 11 pt nos cabeçalhos das colunas e 10 pt nos dados.

Mesa de Recebimento ocupa C:D, Erros de Etiquetagem ocupa F:G, Rotas Conferidas ocupa I:J, Avarias Recebidas ocupa L:M e Pacotes OFF ocupa O:P. Cada bloco leva os nomes abreviados e as quantidades na ordem exibida na prévia.

A cópia ocupa as colunas C a P, a partir da linha 2. Os títulos dos blocos ficam na linha 5, os cabeçalhos de coluna na linha 6 e os dados começam na linha 7.

A cópia define as quatro bordas externas de cada título mesclado e as quatro bordas de cada célula nos cabeçalhos e dados. Os separadores E, H, K e N levam as mesclagens e as bordas do modelo.

O bloco tem pelo menos 150 linhas de dados. Se as tabelas já ocuparam mais linhas na aba do navegador, a cópia inclui vazios até esse tamanho para sobrescrever a colagem anterior. O HTML dos três blocos acumuláveis leva fórmulas como `="Cayo"&T(N("Nome e id do conferente: [ops114012] Cayo"))`. A célula mostra `Cayo` e a fórmula conserva o OPS junto do nome para a reimportação. [Cópia do ranking](../../js/reports/employee-ranking/clipboard.js)

Recebimento, Erros de Etiquetagem e Rotas Conferidas incluem apenas os totais com OPS identificado. Um aviso junto da confirmação da cópia indica quando há registros pendentes na fonte.

## Listas de pacotes da Reversa

O botão ao lado do título de Return, Missorted, Liquidate ou Confiscado copia os pares da tabela correspondente em texto tabulado. A colagem começa pelo primeiro pacote e preenche **Código BR** na primeira coluna e **Respectiva TO** na segunda. [Implementação](../../js/reports/reverse/package-copy.js) · [Teste](../../tests/reverse-packages.test.mjs)

## Planejamento

A cópia de Planejamento começa em `B2` da aba **Modelo**, na planilha própria do relatório. Ela usa os dados da prévia e termina na última linha ocupada pelas listas de LHs, segregação ou backlog. [Montagem do bloco](../../js/reports/planning/clipboard.js)

Os [testes da cópia](../../tests/report-summary-copy.test.mjs) verificam os destinos, a ordem dos campos, as mesclagens e o texto tabulado.
