# Manutenção do Dashboard do Inventário

Siga este fluxo em toda manutenção no código do dashboard, inclusive correções pequenas e refatorações.

1. **Consulte o contexto antes de editar.** Abra o [índice de contexto](IA%20Contexts/README.md), localize as funções ou áreas envolvidas e leia os arquivos correspondentes. Use-os para identificar regras, dependências e pontos de entrada no código.
2. **Faça a manutenção solicitada.** Confira o comportamento no código e faça as verificações pertinentes à alteração.
3. **Atualize o contexto ao concluir.** Edite os arquivos das funções ou áreas afetadas para refletir a implementação resultante. Quando faltar um arquivo para a função, acrescente o contexto no guia da área correspondente ou crie um arquivo na pasta dessa área.
4. **Registre a alteração.** Crie uma entrada em [Registro de Alterações](IA%20Contexts/Registro%20de%20Altera%C3%A7%C3%B5es/README.md) descrevendo o que mudou no código e indicando os contextos atualizados.

Ao criar ou alterar gráficos em qualquer painel ou na exportação HTML, siga o [padrão de gráficos do dashboard](IA%20Contexts/graficos.md).
