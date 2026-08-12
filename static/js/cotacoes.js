// ------------------------------------------------------------
// Cotações — lista de todas as cotações já feitas
// ------------------------------------------------------------

function formatarPreco(valor) {
  return "R$ " + Number(valor).toFixed(2).replace(".", ",");
}

function formatarData(isoString) {
  return new Date(isoString).toLocaleDateString("pt-BR");
}

async function carregarCotacoes() {
  const resposta = await fetch("/api/cotacoes");
  const cotacoes = await resposta.json();

  const lista = document.getElementById("lista-cotacoes");
  lista.innerHTML = "";

  if (cotacoes.length === 0) {
    lista.innerHTML = `<div class="estado-vazio">Nenhuma cotação ainda. Toque em + pra criar a primeira.</div>`;
    return;
  }

  cotacoes.forEach(cotacao => {
    const item = document.createElement("a");
    item.href = `/cotacoes/${cotacao.id}`;
    item.className = "cartao-cotacao";
    item.innerHTML = `
      <div class="cartao-cotacao__titulo">${cotacao.titulo}</div>
      <div class="cartao-cotacao__info">
        ${cotacao.total_itens} ${cotacao.total_itens === 1 ? "item" : "itens"} ·
        ${formatarPreco(cotacao.valor_total)} · ${formatarData(cotacao.criado_em)}
      </div>
    `;
    lista.appendChild(item);
  });
}

document.getElementById("botao-nova-cotacao").addEventListener("click", async () => {
  const titulo = window.prompt("Título da cotação (ex: \"Material de escritório — pedido do João\"):");
  if (!titulo || !titulo.trim()) return;

  const resposta = await fetch("/api/cotacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo: titulo.trim() }),
  });

  if (!resposta.ok) {
    alert("Não foi possível criar a cotação.");
    return;
  }

  const nova = await resposta.json();
  window.location.href = `/cotacoes/${nova.id}`;
});

carregarCotacoes();