// ------------------------------------------------------------
// Logs — histórico completo: criação, edição, exclusão e movimentações
// ------------------------------------------------------------

const rotulos = {
  criacao: "Criação",
  edicao: "Edição",
  exclusao: "Exclusão",
  entrada: "Entrada",
  saida: "Saída",
};

function formatarData(isoString) {
  const data = new Date(isoString);
  return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

async function carregarLogs() {
  const resposta = await fetch("/api/logs?limite=200");
  const logs = await resposta.json();

  const lista = document.getElementById("lista-logs");
  lista.innerHTML = "";

  if (logs.length === 0) {
    lista.innerHTML = `<div class="estado-vazio">Nenhum registro ainda.</div>`;
    return;
  }

  logs.forEach(log => {
    const item = document.createElement("div");
    item.className = "item-movimentacao";
    item.innerHTML = `
      <span class="item-movimentacao__tipo item-movimentacao__tipo--${log.tipo}">${rotulos[log.tipo] || log.tipo}</span>
      <span>${log.produto_nome} — ${log.detalhes || ""}</span>
      <span class="item-movimentacao__data">${formatarData(log.data)}</span>
    `;
    lista.appendChild(item);
  });
}

carregarLogs();