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

// Executada no editor do Planilhas. Lê somente o texto produzido pelo comando Copiar.
async function lerCelulaI7(urlEsperada) {
  const abaAtiva = document.querySelector(".docs-sheet-active-tab .docs-sheet-tab-name")?.textContent.trim();
  if (location.href !== urlEsperada || (abaAtiva && abaAtiva !== "Visão Geral")) {
    return { erro: "Abra a aba Visão Geral da planilha Resumo Operação." };
  }

  const caixaNome = document.querySelector("#t-name-box");
  const campo = caixaNome?.matches("input") ? caixaNome : caixaNome?.querySelector("input");
  if (!campo) return { erro: "Não encontrei a caixa de nome da planilha." };

  async function aguardar(condicao) {
    for (let tentativa = 0; tentativa < 12; tentativa++) {
      if (condicao()) return true;
      await new Promise((resolve) => setTimeout(resolve, 75));
    }
    return false;
  }

  if (!await aguardar(() => document.hasFocus())) {
    return { erro: "A planilha ficou sem foco. Tente novamente com a janela do Opera ativa." };
  }

  const selecionouI7 = () => campo.isConnected && campo.value.trim().toUpperCase() === "I7"
    && document.activeElement !== campo;
  if (!selecionouI7()) {
    campo.focus();
    campo.value = "I7";
    campo.dispatchEvent(new Event("input", { bubbles: true }));

    const tecla = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    if (campo.dispatchEvent(new KeyboardEvent("keydown", tecla)) && document.activeElement === campo) {
      campo.dispatchEvent(new KeyboardEvent("keypress", { ...tecla, charCode: 13 }));
    }
    campo.dispatchEvent(new KeyboardEvent("keyup", tecla));

    if (!await aguardar(selecionouI7)) {
      return { erro: "A seleção automática não foi confirmada. Selecione I7 na Visão Geral e tente novamente." };
    }
  }

  try {
    const anterior = await navigator.clipboard.readText();
    const foco = document.activeElement;
    if (!document.hasFocus() || !selecionouI7() || foco?.matches("input, textarea, [contenteditable='true']")
      || document.getSelection()?.isCollapsed === false) {
      return { erro: "Deixe I7 selecionada na grade, sem editar a célula, e tente novamente." };
    }

    const documento = foco?.matches("iframe") ? foco.contentDocument ?? document : document;
    if (!documento.execCommand("copy")) {
      return { erro: "O Opera GX não executou a cópia de I7. Confira as permissões da extensão." };
    }

    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const texto = await navigator.clipboard.readText();
      if (texto !== anterior) {
        if (!document.hasFocus() || !selecionouI7()) break;
        return { valor: texto.trim() };
      }
      await new Promise((resolve) => setTimeout(resolve, 75));
    }

    return { erro: "Não confirmei uma nova cópia. Se o valor já estava copiado, copie outro texto e tente novamente." };
  } catch (erro) {
    console.warn("Cópia de I7:", erro.message);
    return { erro: "O Opera GX bloqueou a leitura ou a cópia. Confira o acesso à área de transferência." };
  }
}

async function localizarPlanilha(remetente) {
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

  return { aba: abas[0] };
}

async function buscarTitulo(remetente) {
  const { aba, erro } = await localizarPlanilha(remetente);
  if (erro) return { erro };

  const [leitura] = await chrome.scripting.executeScript({
    target: { tabId: aba.id },
    func: lerTituloSelecionado,
  });

  return leitura?.result ?? { erro: "Não consegui ler a seleção na planilha." };
}

async function buscarI7(remetente) {
  const { aba, erro } = await localizarPlanilha(remetente);
  if (erro) return { erro };
  if (!Number.isInteger(remetente.tab?.id)) {
    return { erro: "Abra a página de testes em uma aba do Opera GX." };
  }

  await chrome.tabs.update(aba.id, { active: true });
  try {
    const [leitura] = await chrome.scripting.executeScript({
      target: { tabId: aba.id },
      func: lerCelulaI7,
      args: [aba.url],
    });
    return leitura?.result ?? { erro: "Não consegui ler I7 na planilha." };
  } finally {
    const [ativa] = await chrome.tabs.query({ windowId: aba.windowId, active: true });
    if (ativa?.id === aba.id) await chrome.tabs.update(remetente.tab.id, { active: true });
  }
}

chrome.runtime.onMessageExternal.addListener((mensagem, remetente, responder) => {
  if (!remetente.url?.startsWith(dashboardTeste)) return;
  if (mensagem?.tipo === "PING") {
    responder({ tipo: "PONG" });
    return;
  }

  if (remetente.url.split(/[?#]/, 1)[0] !== paginaTeste) return;

  const lerI7 = mensagem?.tipo === "LER_I7_PLANILHA";
  if (!lerI7 && mensagem?.tipo !== "LER_TITULO_PLANILHA") return;

  const tipo = lerI7 ? "VALOR_I7_PLANILHA" : "TITULO_PLANILHA";
  (lerI7 ? buscarI7(remetente) : buscarTitulo(remetente))
    .then((resultado) => responder({ tipo, ...resultado }))
    .catch((erro) => {
      console.warn("Leitura da planilha:", erro.message);
      responder({
        tipo,
        erro: "Não consegui acessar a planilha. Confira as permissões da extensão e recarregue a aba.",
      });
    });

  return true;
});
