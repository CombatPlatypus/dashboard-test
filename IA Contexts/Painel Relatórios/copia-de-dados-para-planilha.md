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

No [Ranking Mensal de Colaboradores](ranking-de-colaboradores.md), selecione o título mesclado `C2:S3` da aba **Ranking de Colaboradores** e cole com `Ctrl+V`. O HTML aplica o alinhamento horizontal e vertical centralizado e a fonte diretamente às células. A fonte Open Sans usa 20 pt no título mesclado, 12 pt nos títulos das seções, 11 pt nos cabeçalhos das colunas e 10 pt nos dados.

Mesa de Recebimento ocupa C:E, Erros de Etiquetagem ocupa G:I e Rotas Conferidas ocupa K:M. Esses blocos têm **ID OPS**, **Colaborador** e **Quantidade**. Os IDs são preenchidos em C, G e K. Avarias Recebidas ocupa O:P e Pacotes OFF ocupa R:S. Esses blocos têm **Colaborador** e **Quantidade**.

A cópia ocupa as colunas C a S, a partir da linha 2. Os títulos dos blocos ficam na linha 5, os cabeçalhos de coluna na linha 6 e os dados começam na linha 7.

A cópia define as quatro bordas externas de cada título mesclado e as quatro bordas de cada célula nos cabeçalhos e dados. Os separadores F, J, N e Q levam as mesclagens e as bordas do modelo.

O bloco tem pelo menos 150 linhas de dados. Se as tabelas já ocuparam mais linhas na aba do navegador, a cópia inclui vazios até esse tamanho para sobrescrever a colagem anterior. A célula de colaborador leva a posição seguida do nome abreviado, como `1º Bruno Santos`, em HTML e texto tabulado. Na reimportação, a área de transferência precisa incluir os IDs. Se a planilha copiar apenas os nomes, reexiba C, G e K e copie novamente. [Cópia do ranking](../../js/reports/employee-ranking/clipboard.js)

Recebimento, Erros de Etiquetagem e Rotas Conferidas incluem apenas os totais com OPS identificado. Um aviso junto da confirmação da cópia indica quando há registros pendentes na fonte.

## Listas de pacotes da Reversa

O botão ao lado do título de Return, Missorted, Liquidate ou Confiscado copia os pares da tabela correspondente em texto tabulado. A colagem começa pelo primeiro pacote e preenche **Código BR** na primeira coluna e **Respectiva TO** na segunda. [Implementação](../../js/reports/reverse/package-copy.js) · [Teste](../../tests/reverse-packages.test.mjs)

## Planejamento

Selecione o título mesclado `C2:L3` da aba **Modelo** na planilha de Planejamento e cole com `Ctrl+V`. O título usa o turno selecionado e a data e hora da cópia no horário de São Paulo, como `PLANEJAMENTO LM HUB SP 63 - AM 19/11 23:07`. [Montagem do bloco](../../js/reports/planning/clipboard.js)

LHs programados, LHs a segregar e TOs ocupam C:E e começam nas linhas 7, 29 e 51. O backlog começa na linha 7 em G:H. Os resumos e os valores da Collection Pool ficam em J:L até a linha 18, com os rótulos mesclados em J:K e os valores em L. A cópia termina na última linha necessária para incluir esses resumos e as listas preenchidas. F e I funcionam como separadores dentro desse recorte.

O HTML reproduz as bordas da grade e dos títulos mesclados, aplica Open Sans de 20 pt no título, 12 pt nos títulos das seções e nos cabeçalhos de segregação, 11 pt nos demais cabeçalhos e 10 pt nos dados e rótulos dos resumos. Os rótulos dos resumos ficam à esquerda e os dados são centralizados verticalmente. [Testes da cópia](../../tests/report-summary-copy.test.mjs)
