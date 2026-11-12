const idExtensao = "aoagcglalglmemlllchbpbadppnloejb";

const botao = document.querySelector("#testar-conexao-extensao");
const status = document.querySelector("#status-conexao-extensao");

botao.addEventListener("click", () => {
  if (!/^[a-p]{32}$/.test(idExtensao)) {
    status.textContent = "Configure o ID da extensão antes de testar.";
    return;
  }

  const runtime = globalThis.chrome?.runtime;

  if (!runtime?.sendMessage) {
    status.textContent = "Extensão indisponível nesta página.";
    return;
  }

  botao.disabled = true;
  status.textContent = "Testando conexão…";

  runtime.sendMessage(idExtensao, { tipo: "PING" }, (resposta) => {
    const erro = runtime.lastError;
    botao.disabled = false;

    if (erro || resposta?.tipo !== "PONG") {
      status.textContent = "Não foi possível conectar à extensão.";
      if (erro) console.warn("Teste da extensão:", erro.message);
      return;
    }

    status.textContent = "Extensão conectada.";
  });
});