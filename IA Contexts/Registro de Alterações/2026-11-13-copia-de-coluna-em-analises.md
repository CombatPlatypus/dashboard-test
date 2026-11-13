# 13/11/2026 · Cópia de uma coluna em Análises

A prévia de planilhas ganhou um botão de cópia ao lado da ordenação quando há uma única coluna visível. O botão usa o ícone de 20 px do Parcel Sweeper e copia todos os valores filtrados na ordem atual, sem o cabeçalho e independentemente do limite da prévia. [Controlador](../../js/data-analysis/preview/preview-controller.js) · [Contexto do Painel Análises](../Painel%20An%C3%A1lises/README.md#visualização-de-planilhas)

A verificação pelo controlador da prévia cobriu a aparição do ícone, ordenação crescente e decrescente, filtro sem resultados, linhas além do limite, repetições, células vazias e falha da área de transferência. Os 265 testes do repositório passaram.
