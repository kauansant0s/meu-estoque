// ------------------------------------------------------------
// Configurações — gerenciar os estoques (criar, editar, excluir)
// ------------------------------------------------------------

async function carregarEstoques() {
  const resposta = await fetch("/api/estoques");
  const estoques = await resposta.json();

  const lista = document.getElementById("lista-estoques");
  lista.innerHTML = "";

  if (estoques.length === 0) {
    lista.innerHTML = `<div class="estado-vazio">Nenhum estoque cadastrado.</div>`;
    return;
  }

  estoques.forEach(estoque => {
    const item = document.createElement("div");
    item.className = "item-estoque";
    item.innerHTML = `
      <span class="item-estoque__nome">${estoque.nome}</span>
      <div class="item-estoque__acoes">
        <button class="link-discreto" data-acao="editar" data-id="${estoque.id}" data-nome="${estoque.nome}">Editar</button>
        <button class="link-discreto" data-acao="excluir" data-id="${estoque.id}">Excluir</button>
      </div>
    `;
    lista.appendChild(item);
  });
}

document.getElementById("lista-estoques").addEventListener("click", async (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  const id = Number(botao.dataset.id);
  const acao = botao.dataset.acao;

  if (acao === "editar") {
    const nomeAtual = botao.dataset.nome;
    const novoNome = window.prompt("Novo nome do estoque:", nomeAtual);
    if (!novoNome || !novoNome.trim() || novoNome.trim() === nomeAtual) return;

    const resposta = await fetch(`/api/estoques/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome.trim() }),
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      alert(erro.erro || "Não foi possível renomear o estoque.");
      return;
    }
    await carregarEstoques();

  } else if (acao === "excluir") {
    const confirmar = window.confirm("Excluir esse estoque? Essa ação não pode ser desfeita.");
    if (!confirmar) return;

    const resposta = await fetch(`/api/estoques/${id}`, { method: "DELETE" });

    if (!resposta.ok) {
      const erro = await resposta.json();
      alert(erro.erro || "Não foi possível excluir o estoque.");
      return;
    }
    await carregarEstoques();
  }
});

document.getElementById("form-novo-estoque").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const campo = document.getElementById("novo-estoque-nome");
  const erroEl = document.getElementById("erro-estoque");
  erroEl.style.display = "none";

  const resposta = await fetch("/api/estoques", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: campo.value.trim() }),
  });

  if (!resposta.ok) {
    const erro = await resposta.json();
    erroEl.textContent = erro.erro || "Não foi possível criar o estoque.";
    erroEl.style.display = "block";
    return;
  }

  campo.value = "";
  await carregarEstoques();
});

carregarEstoques();