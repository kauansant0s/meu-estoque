// ------------------------------------------------------------
// Painel da gerência — somente leitura, atualiza sozinho
// ------------------------------------------------------------

function formatarData(isoString) {
  const data = new Date(isoString);
  return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ------------------------------------------------------------
// Depois que os itens são desenhados na tela, checa se o texto
// de cada um "estourou" a linha (não coube). Se sim, mostra o
// botão "ver mais" pra expandir aquele item específico.
// ------------------------------------------------------------

function aplicarExpansorDeTexto(containerEl) {
  requestAnimationFrame(() => {
    containerEl.querySelectorAll(".item-movimentacao__texto").forEach(textoEl => {
      const botao = textoEl.nextElementSibling;
      if (!botao) return;

      const estourou = textoEl.scrollWidth > textoEl.clientWidth + 1;
      if (!estourou) return;

      botao.classList.remove("oculto");
      botao.addEventListener("click", () => {
        const item = textoEl.closest(".item-movimentacao");
        const expandido = item.classList.toggle("item-movimentacao--expandido");
        botao.textContent = expandido ? "ver menos" : "ver mais";
      });
    });
  });
}

async function carregarPainel() {
  const [respostaProdutos, respostaLogs] = await Promise.all([
    fetch("/api/produtos"),
    fetch("/api/logs?tipos=entrada,saida&limite=15"),
  ]);
  const produtos = await respostaProdutos.json();
  const movimentacoes = await respostaLogs.json();

  renderizarStats(produtos);
  renderizarTabela(produtos);
  renderizarMovimentacoes(movimentacoes);
}

function renderizarStats(produtos) {
  const abaixoMinimo = produtos.filter(p => p.quantidade <= p.quantidade_minima).length;

  document.getElementById("stat-total-produtos").textContent = produtos.length;
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
      <td>${produto.estoque_nome}</td>
      <td>${produto.observacoes || "—"}</td>
      <td>${produto.quantidade}</td>
      <td>${produto.quantidade_minima}</td>
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
      <div class="item-movimentacao__conteudo">
        <span class="item-movimentacao__texto">${mov.produto_nome} — ${mov.detalhes || ""}</span>
        <button type="button" class="item-movimentacao__expandir oculto">ver mais</button>
      </div>
      <span class="item-movimentacao__data">${formatarData(mov.data)}</span>
    `;
    lista.appendChild(item);
  });

  aplicarExpansorDeTexto(lista);
}

carregarPainel();
setInterval(carregarPainel, 30000); // atualiza sozinho a cada 30s