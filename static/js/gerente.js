// ------------------------------------------------------------
// Painel da gerência — somente leitura, atualiza sozinho
// ------------------------------------------------------------

function formatarPreco(valor) {
  return "R$ " + Number(valor).toFixed(2).replace(".", ",");
}

function formatarData(isoString) {
  const data = new Date(isoString);
  return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

async function carregarPainel() {
  const [respostaProdutos, respostaMovimentacoes] = await Promise.all([
    fetch("/api/produtos"),
    fetch("/api/movimentacoes"),
  ]);
  const produtos = await respostaProdutos.json();
  const movimentacoes = await respostaMovimentacoes.json();

  renderizarStats(produtos);
  renderizarTabela(produtos);
  renderizarMovimentacoes(movimentacoes);
}

function renderizarStats(produtos) {
  const valorTotal = produtos.reduce((soma, p) => soma + p.quantidade * p.preco, 0);
  const abaixoMinimo = produtos.filter(p => p.quantidade <= p.quantidade_minima).length;

  document.getElementById("stat-total-produtos").textContent = produtos.length;
  document.getElementById("stat-valor-total").textContent = formatarPreco(valorTotal);
  document.getElementById("stat-abaixo-minimo").textContent = abaixoMinimo;
}

function renderizarTabela(produtos) {
  const corpo = document.getElementById("corpo-tabela-produtos");
  corpo.innerHTML = "";

  produtos.forEach(produto => {
    const abaixoDoMinimo = produto.quantidade <= produto.quantidade_minima;
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.observacoes || "—"}</td>
      <td>${produto.quantidade}</td>
      <td>${produto.quantidade_minima}</td>
      <td>${formatarPreco(produto.preco)}</td>
      <td>
        <span class="badge ${abaixoDoMinimo ? "badge--alerta" : "badge--ok"}">
          ${abaixoDoMinimo ? "Abaixo do mínimo" : "Normal"}
        </span>
      </td>
    `;
    corpo.appendChild(linha);
  });
}

function renderizarMovimentacoes(movimentacoes) {
  const lista = document.getElementById("lista-movimentacoes");
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
      <span>${mov.produto_nome} — ${mov.quantidade} un.${mov.observacao ? " · " + mov.observacao : ""}</span>
      <span class="item-movimentacao__data">${formatarData(mov.data)}</span>
    `;
    lista.appendChild(item);
  });
}

carregarPainel();
setInterval(carregarPainel, 30000); // atualiza sozinho a cada 30s