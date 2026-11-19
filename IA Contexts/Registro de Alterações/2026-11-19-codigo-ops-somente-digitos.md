# 2026-11-19 · Código OPS do etiquetador somente com dígitos

O campo de código OPS do etiquetador filtra letras e símbolos ao digitar ou colar, preserva zeros à esquerda e usa `123` como exemplo. A prévia continua formatando o código como `[ops123]`.

Os 299 testes Node passaram. A verificação no Edge cobriu digitação, colagem, posição do cursor, prévia, ranking e restauração da sessão. [Contexto de Processamento](../Painel%20Relat%C3%B3rios/README.md#processamento)
