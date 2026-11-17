# 17/11/2026 · Identificação por OPS no Ranking de Colaboradores

Recebimento, Erros de Etiquetagem e Expedição passaram a somar pela identidade OPS quando disponível. Códigos distintos separam homônimos. A identificação por nome continua disponível para registros sem OPS e sinaliza correspondências ambíguas.

A cópia começa em B2 e mescla o título até S3. A Base de Colaboradores fica em R5:S5, com os cabeçalhos em R6 e S6 e uma linha por OPS a partir de R7:S7. R:S pode ficar oculto na planilha. As fórmulas das células de colaborador guardam os códigos e mostram os nomes abreviados. A importação lê tanto a fórmula quanto a lista da seleção, e a sessão guarda os códigos e a lista importada.

A verificação local conferiu a mesclagem do título e a fórmula B7 em Resumo da Operação (2). Os testes cobrem a posição atualizada dos cabeçalhos, a reimportação em HTML, a leitura da lista em texto, a soma para dois nomes iguais com códigos distintos e a restauração de sessão. Os 296 testes Node passaram.

Contextos atualizados

- [Painel Relatórios](../Painel%20Relat%C3%B3rios/README.md#ranking-mensal-de-colaboradores)
- [Ranking Mensal de Colaboradores](../Painel%20Relat%C3%B3rios/ranking-de-colaboradores.md)
- [Cópia para planilha](../Painel%20Relat%C3%B3rios/copia-de-dados-para-planilha.md#expedição-do-ranking-mensal)
- [Salvamento de sessão](../Menu%20Principal/salvamento-de-sessao.md)
