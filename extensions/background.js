const dashboardTeste = "https://combatplatypus.github.io/dashboard-test/";
const paginaTeste = `${dashboardTeste}extension-test.html`;
const planilhaEditavel = /^https:\/\/docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/[^/?#]+\/edit(?:[/?#]|$)/;

// Executada na aba do Google Planilhas, com o título já selecionado pelo usuário.
function lerTituloSelecionado() {
  function lerCampo(seletor) {
    const elemento = document.querySelector(seletor);
    if (!elemento) return null;

    const campo = elemento.matches("input, textarea")
      ? elemento
      : elemento.querySelector("input, textarea");

    return (campo?.value ?? elemento.textContent ?? "").replace(/\u200b/g, "").trim();
  }

  const abaAtiva = lerCampo(".docs-sheet-active-tab .docs-sheet-tab-name");
  const intervalo = lerCampo("#t-name-box");

  if (intervalo === null) {
    return { erro: "Não encontrei a caixa de seleção de células. Confira se a planilha já carregou." };
  }

  if ((abaAtiva && abaAtiva !== "Visão Geral") || !["B2", "B2:R3"].includes(intervalo.toUpperCase())) {
    return { erro: "Na aba Visão Geral, selecione o título em B2:R3 e tente novamente." };
  }

  const titulo = lerCampo("#t-formula-bar-input");
  if (!titulo || titulo.startsWith("=")) {
    return { erro: "Não consegui ler o título na barra de fórmulas. Confira se ela está visível e mostra o texto." };
  }

  return { titulo };
}

async function buscarTitulo(remetente) {
  const filtro = { url: "https://docs.google.com/spreadsheets/*" };
  if (Number.isInteger(remetente.tab?.windowId)) {
    filtro.windowId = remetente.tab.windowId;
  }

  const abas = (await chrome.tabs.query(filtro)).filter((aba) => planilhaEditavel.test(aba.url ?? ""));
  if (abas.length === 0) {
    return { erro: "Abra a planilha no Opera GX e permita à extensão acessar docs.google.com." };
  }
  if (abas.length > 1) {
    return { erro: "Para este teste, deixe só a planilha Resumo Operação aberta na janela do Dashboard." };
  }

  const [leitura] = await chrome.scripting.executeScript({
    target: { tabId: abas[0].id },
    func: lerTituloSelecionado,
  });

  return leitura?.result ?? { erro: "Não consegui ler a seleção na planilha." };
}

chrome.runtime.onMessageExternal.addListener((mensagem, remetente, responder) => {
  if (!remetente.url?.startsWith(dashboardTeste)) return;
  if (mensagem?.tipo === "PING") {
    responder({ tipo: "PONG" });
    return;
  }

  if (mensagem?.tipo !== "LER_TITULO_PLANILHA" || remetente.url.split(/[?#]/, 1)[0] !== paginaTeste) return;

  buscarTitulo(remetente)
    .then((resultado) => responder({ tipo: "TITULO_PLANILHA", ...resultado }))
    .catch((erro) => {
      console.warn("Leitura da planilha:", erro.message);
      responder({
        tipo: "TITULO_PLANILHA",
        erro: "Não consegui acessar a planilha. Confira as permissões da extensão e recarregue a aba.",
      });
    });

  return true;
});
