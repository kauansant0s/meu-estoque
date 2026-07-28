// ------------------------------------------------------------
// Logs — histórico completo de movimentações
// ------------------------------------------------------------

function formatarData(isoString) {
  const data = new Date(isoString);
  return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

async function carregarLogs() {
  const resposta = await fetch("/api/movimentacoes?limite=200");
  const movimentacoes = await resposta.json();

  const lista = document.getElementById("lista-logs");
  lista.innerHTML = "";

  if (movimentacoes.length === 0) {
    lista.innerHTML = `<div class="estado-vazio">Nenhuma movimentação registrada ainda.</div>`;
    return;
  }

  movimentacoes.forEach(mov => {
    const item = document.createElement("div");
    item.className = "item-movimentacao";
    item.innerHTML = `
      <span class="item-movimentacao__tipo item-movimentacao__tipo--${mov.tipo}">${mov.tipo}</span>
      <span>${mov.produto_nome} — ${mov.quantidade} un.${mov.observacao ? " · Motivo: " + mov.observacao : " · Sem motivo informado"}</span>
      <span class="item-movimentacao__data">${formatarData(mov.data)}</span>
    `;
    lista.appendChild(item);
  });
}

carregarLogs();