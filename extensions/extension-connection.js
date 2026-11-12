const idExtensao = "aoagcglalglmemlllchbpbadppnloejb";

const botaoConexao = document.querySelector("#testar-conexao-extensao");
const botaoTitulo = document.querySelector("#ler-titulo-planilha");
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

  botaoConexao.disabled = true;
  botaoTitulo.disabled = true;
  status.textContent = emAndamento;

  function concluir(texto) {
    botaoConexao.disabled = false;
    botaoTitulo.disabled = false;
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
