# 2026-11-18 · Campos de OPS e nome do etiquetador

O Processamento ganhou campos separados para código OPS e nome na seção **Defina os Etiquetadores**. A edição atualiza a prévia com o código e o primeiro nome. O estado da sessão guarda os dois no campo `labeler`, que também alimenta a cópia e o ranking. Ao restaurar uma sessão, os controles recuperam o código e o nome desse campo.

Os 299 testes Node passaram. A verificação no Edge cobriu importação CSV, edição dos campos, prévia, cópia, atribuição de erros no ranking e restauração da sessão, incluindo recarregar a página. [Processamento](../Painel%20Relat%C3%B3rios/README.md#processamento) · [Ranking de Colaboradores](../Painel%20Relat%C3%B3rios/ranking-de-colaboradores.md#recebimento-e-erros-de-etiquetagem)
