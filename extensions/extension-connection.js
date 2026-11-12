const idExtensao = "aoagcglalglmemlllchbpbadppnloejb";

const botaoConexao = document.querySelector("#testar-conexao-extensao");
const botaoTitulo = document.querySelector("#ler-titulo-planilha");
const botaoI7 = document.querySelector("#ler-i7-planilha");
const botoes = [botaoConexao, botaoTitulo, botaoI7];
const status = document.querySelector("#status-conexao-extensao");

function executarTeste(tipo, emAndamento, lerResposta) {
  if (!/^[a-p]{32}$/.test(idExtensao)) {
    status.textContent = "Configure o ID da extensão antes de testar.";
    return;
  }

  const runtime = globalThis.chrome?.runtime;

  if (!runtime?.sendMessage) {
    status.textContent = "Extensão indisponível nesta página.";
    return;
  }

  botoes.forEach((botao) => { botao.disabled = true; });
  status.textContent = emAndamento;

  function concluir(texto) {
    botoes.forEach((botao) => { botao.disabled = false; });
    status.textContent = texto;
  }

  try {
    runtime.sendMessage(idExtensao, { tipo }, (resposta) => {
      const erro = runtime.lastError;
      if (erro) console.warn("Teste da extensão:", erro.message);

      concluir(lerResposta(erro ? undefined : resposta));
    });
  } catch (erro) {
    console.warn("Teste da extensão:", erro.message);
    concluir(lerResposta(undefined));
  }
}

botaoConexao.addEventListener("click", () => {
  executarTeste("PING", "Testando conexão…", (resposta) => (
    resposta?.tipo === "PONG" ? "Extensão conectada." : "Não foi possível conectar à extensão."
  ));
});

botaoTitulo.addEventListener("click", () => {
  executarTeste("LER_TITULO_PLANILHA", "Lendo o título da planilha…", (resposta) => (
    resposta?.tipo === "TITULO_PLANILHA"
      ? resposta.erro ?? resposta.titulo ?? "O título não foi retornado."
      : "Não consegui ler o título. Recarregue a extensão no Opera GX e tente novamente."
  ));
});

botaoI7.addEventListener("click", () => {
  executarTeste("LER_I7_PLANILHA", "Lendo a célula I7…", (resposta) => (
    resposta?.tipo === "VALOR_I7_PLANILHA"
      ? resposta.erro ?? (resposta.valor || "I7 está vazia.")
      : "Não consegui ler I7. Recarregue a extensão no Opera GX e tente novamente."
  ));
});
