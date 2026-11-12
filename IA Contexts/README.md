# Contexto técnico do Dashboard do Inventário

Use este índice para localizar o código de uma função e entender quais dados, telas e testes ela envolve. A ordem dos painéis segue o menu de [index.html](../index.html).

Para manutenção no código, siga o [fluxo do repositório](../AGENTS.md) e consulte o [Registro de Alterações](Registro%20de%20Altera%C3%A7%C3%B5es/README.md) para ver o histórico.

## Painéis

| Painel | Funções principais |
| --- | --- |
| [Planilhas](Painel%20Planilhas/README.md) | Atalhos para planilhas operacionais e visualização integrada. |
| [Relatórios](Painel%20Relat%C3%B3rios/README.md) | Importação de bases operacionais, indicadores, tabelas, gráficos e Relatório Final. |
| [Análises](Painel%20An%C3%A1lises/README.md) | Prévia de uma base importada, análise por coluna e comparação de valores. |
| [Filtragem](Painel%20Filtragem/README.md) | Busca de uma lista de valores com regras de entrada e saída por finalidade. |

## Áreas compartilhadas

- [Menu Principal](Menu%20Principal/README.md) cobre navegação, atalhos e [salvamento e importação de sessões](Menu%20Principal/salvamento-de-sessao.md).
- [Página de Configurações](P%C3%A1gina%20de%20Configura%C3%A7%C3%B5es/README.md) cobre perfil, tema, planilhas e atalhos do rodapé.
- [Footer](Footer/README.md) cobre visibilidade, configuração e abertura dos links externos.
- [Gráficos](graficos.md) registra o padrão obrigatório dos gráficos atuais, futuros e exportados.

## Como registrar uma função

Inclua a finalidade para o usuário, o controle que inicia o fluxo, os módulos responsáveis, as entradas aceitas, o estado que a função altera e o resultado que produz. Registre dependências entre áreas e vincule os testes ou descreva um caso de verificação. Quando uma decisão depender de contexto operacional que só a equipe conhece, registre a dúvida junto da regra observada no código.

Se uma seção crescer, ela pode ganhar um arquivo próprio na pasta do painel. Atualize os links e as regras afetadas quando uma manutenção mudar o comportamento descrito.
