# 16/11/2026 · Pacotes OFF no Ranking Mensal de Colaboradores

A importação de Avarias e Perdas preenche Pacotes OFF a partir de Expedição e Log no Histórico de Retornados. A contagem usa o mês e o ano da importação em São Paulo e soma uma ocorrência por linha atribuída. O ranking agrega pelo nome completo, abrevia o nome na prévia e ordena pelo menor total, com desempate pelo nome.

A cópia para B2 leva Pacotes OFF em O:P. A sessão recupera o recorte mensal junto dos dados de Perdas. A tabela de Pacotes OFF se atualiza quando seu recorte muda ou é limpo.

O teste de XLSX cobre a virada de mês, códigos repetidos, nomes com diferenças de caixa e ordenação. A verificação local no navegador confirmou preenchimento, cópia e limpeza com um XLSX de teste. A suíte Node passou com 281 testes.

Contextos atualizados

- [Painel Relatórios](../Painel%20Relat%C3%B3rios/README.md)
- [Ranking Mensal de Colaboradores](../Painel%20Relat%C3%B3rios/ranking-de-colaboradores.md#pacotes-off)
- [Cópia para planilha](../Painel%20Relat%C3%B3rios/copia-de-dados-para-planilha.md#expedição-do-ranking-mensal)
- [Salvamento de sessão](../Menu%20Principal/salvamento-de-sessao.md)
