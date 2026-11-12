const dashboardTeste = "https://combatplatypus.github.io/dashboard-test/";

chrome.runtime.onMessageExternal.addListener((mensagem, remetente, responder) => {
  if (!remetente.url?.startsWith(dashboardTeste)) return;
  if (mensagem?.tipo !== "PING") return;

  responder({ tipo: "PONG" });
});