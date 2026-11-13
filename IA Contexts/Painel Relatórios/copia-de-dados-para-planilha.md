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

## Planejamento

A cópia de Planejamento começa em `B2` da aba **Modelo**, na planilha própria do relatório. Ela usa os dados da prévia e termina na última linha ocupada pelas listas de LHs, segregação ou backlog. [Montagem do bloco](../../js/reports/planning/clipboard.js)

Os [testes da cópia](../../tests/report-summary-copy.test.mjs) verificam os destinos, a ordem dos campos, as mesclagens e o texto tabulado.
