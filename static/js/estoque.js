// ------------------------------------------------------------
// Tela de estoque (edição) — fala com a API Flask via fetch
// ------------------------------------------------------------

let produtos = [];

const listaEl = document.getElementById("lista-produtos");
const estadoVazioEl = document.getElementById("estado-vazio");
const campoBusca = document.getElementById("campo-busca");

// --- Carregar produtos do servidor ---

async function carregarProdutos() {
  const resposta = await fetch("/api/produtos");
  produtos = await resposta.json();
  renderizarLista();
}

function renderizarLista() {
  const termo = campoBusca.value.trim().toLowerCase();
  const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(termo));

  listaEl.innerHTML = "";

  if (filtrados.length === 0) {
    estadoVazioEl.classList.remove("oculto");
    return;
  }
  estadoVazioEl.classList.add("oculto");

  filtrados.forEach(produto => {
    listaEl.appendChild(criarCartaoProduto(produto));
  });
}

function criarCartaoProduto(produto) {
  const abaixoDoMinimo = produto.quantidade <= produto.quantidade_minima;
  const proporcao = produto.quantidade_minima > 0
    ? Math.min(100, Math.round((produto.quantidade / (produto.quantidade_minima * 2)) * 100))
    : 100;

  const div = document.createElement("div");
  div.className = "cartao-produto";
  div.innerHTML = `
    <div class="cartao-produto__nome">${produto.nome}</div>

    <div class="cartao-produto__linha">
      <div>
        <span class="cartao-produto__quantidade">${produto.quantidade}</span>
        <span class="cartao-produto__unidade">un.</span>
      </div>
    </div>

    <div class="medidor">
      <div class="medidor__preenchimento ${abaixoDoMinimo ? "medidor__preenchimento--baixo" : ""}" style="width:${proporcao}%"></div>
    </div>

    ${abaixoDoMinimo ? `<div class="cartao-produto__aviso">Abaixo do estoque mínimo (${produto.quantidade_minima})</div>` : ""}
    ${produto.observacoes ? `<div class="cartao-produto__observacoes">${produto.observacoes}</div>` : ""}

    <div class="cartao-produto__acoes">
      <button class="passo passo--saida" data-acao="saida" data-id="${produto.id}" aria-label="Registrar saída">−</button>
      <button class="passo passo--entrada" data-acao="entrada" data-id="${produto.id}" aria-label="Registrar entrada">+</button>
      <span class="espaco"></span>
      <button class="link-discreto" data-acao="editar" data-id="${produto.id}">Editar</button>
      <button class="link-discreto" data-acao="excluir" data-id="${produto.id}">Excluir</button>
    </div>
  `;
  return div;
}

campoBusca.addEventListener("input", renderizarLista);

// --- Clique nos botões dos cartões (delegação de evento) ---

listaEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  const id = Number(botao.dataset.id);
  const acao = botao.dataset.acao;
  const produto = produtos.find(p => p.id === id);

  if (acao === "entrada" || acao === "saida") {
    abrirModalMovimento(produto, acao);
  } else if (acao === "editar") {
    abrirModalProduto(produto);
  } else if (acao === "excluir") {
    excluirProduto(produto);
  }
});

// ------------------------------------------------------------
// Modal: novo / editar produto
// ------------------------------------------------------------

const sobreposicaoProduto = document.getElementById("sobreposicao-produto");
const formProduto = document.getElementById("form-produto");
const erroProduto = document.getElementById("erro-produto");

document.getElementById("botao-novo-produto").addEventListener("click", () => abrirModalProduto(null));
document.getElementById("botao-cancelar-produto").addEventListener("click", fecharModalProduto);

function abrirModalProduto(produto) {
  erroProduto.style.display = "none";
  document.getElementById("titulo-modal-produto").textContent = produto ? "Editar produto" : "Novo produto";
  document.getElementById("produto-id").value = produto ? produto.id : "";
  document.getElementById("produto-nome").value = produto ? produto.nome : "";
  document.getElementById("produto-quantidade").value = produto ? produto.quantidade : 0;
  document.getElementById("produto-quantidade").disabled = !!produto; // qtd só muda via movimentação
  document.getElementById("produto-minimo").value = produto ? produto.quantidade_minima : 0;
  document.getElementById("produto-observacoes").value = produto ? (produto.observacoes || "") : "";
  sobreposicaoProduto.classList.remove("oculto");

  // Foco automático no campo nome, assim que o modal aparece na tela
  requestAnimationFrame(() => {
    document.getElementById("produto-nome").focus();
  });
}

function fecharModalProduto() {
  sobreposicaoProduto.classList.add("oculto");
}

formProduto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroProduto.style.display = "none";

  const id = document.getElementById("produto-id").value;
  const corpo = {
    nome: document.getElementById("produto-nome").value.trim(),
    observacoes: document.getElementById("produto-observacoes").value.trim(),
    quantidade_minima: document.getElementById("produto-minimo").value,
  };
  if (!id) {
    corpo.quantidade = document.getElementById("produto-quantidade").value;
  }

  const url = id ? `/api/produtos/${id}` : "/api/produtos";
  const metodo = id ? "PUT" : "POST";

  const resposta = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    const erro = await resposta.json();
    erroProduto.textContent = erro.erro || "Não foi possível salvar o produto.";
    erroProduto.style.display = "block";
    return;
  }

  fecharModalProduto();
  await carregarProdutos();
});

async function excluirProduto(produto) {
  const confirmar = window.confirm(`Excluir "${produto.nome}" do estoque? Essa ação não pode ser desfeita.`);
  if (!confirmar) return;

  await fetch(`/api/produtos/${produto.id}`, { method: "DELETE" });
  await carregarProdutos();
}

// ------------------------------------------------------------
// Modal: movimentar estoque (entrada / saída)
// ------------------------------------------------------------

const sobreposicaoMovimento = document.getElementById("sobreposicao-movimento");
const formMovimento = document.getElementById("form-movimento");
const erroMovimento = document.getElementById("erro-movimento");

document.getElementById("botao-cancelar-movimento").addEventListener("click", fecharModalMovimento);

function abrirModalMovimento(produto, tipo) {
  erroMovimento.style.display = "none";
  document.getElementById("movimento-produto-id").value = produto.id;
  document.getElementById("movimento-tipo").value = tipo;
  document.getElementById("movimento-quantidade").value = 1;
  document.getElementById("movimento-observacao").value = "";

  const titulo = tipo === "entrada" ? `Entrada — ${produto.nome}` : `Saída — ${produto.nome}`;
  document.getElementById("titulo-modal-movimento").textContent = titulo;

  const botaoConfirmar = document.getElementById("botao-confirmar-movimento");
  botaoConfirmar.className = "botao " + (tipo === "entrada" ? "botao--primario" : "botao--perigo botao--fantasma");

  sobreposicaoMovimento.classList.remove("oculto");
  document.getElementById("movimento-quantidade").focus();
}

function fecharModalMovimento() {
  sobreposicaoMovimento.classList.add("oculto");
}

formMovimento.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroMovimento.style.display = "none";

  const id = document.getElementById("movimento-produto-id").value;
  const corpo = {
    tipo: document.getElementById("movimento-tipo").value,
    quantidade: document.getElementById("movimento-quantidade").value,
    observacao: document.getElementById("movimento-observacao").value.trim(),
  };

  const resposta = await fetch(`/api/produtos/${id}/movimentar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    const erro = await resposta.json();
    erroMovimento.textContent = erro.erro || "Não foi possível registrar a movimentação.";
    erroMovimento.style.display = "block";
    return;
  }

  fecharModalMovimento();
  await carregarProdutos();
});

// ------------------------------------------------------------
// Maiúsculo invertido: sem shift = MAIÚSCULO, com shift = minúsculo
// ------------------------------------------------------------

function aplicarMaiusculoInvertido(input) {
  input.addEventListener("keydown", (evento) => {
    const ehLetra = evento.key.length === 1 && /[a-zA-Z]/.test(evento.key);
    if (!ehLetra) return;

    evento.preventDefault();

    const letra = evento.shiftKey ? evento.key.toLowerCase() : evento.key.toUpperCase();
    const inicio = input.selectionStart;
    const fim = input.selectionEnd;
    const valorAtual = input.value;

    input.value = valorAtual.slice(0, inicio) + letra + valorAtual.slice(fim);
    input.selectionStart = input.selectionEnd = inicio + 1;

    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// ------------------------------------------------------------
// Seleciona todo o conteúdo do campo ao focar — assim, ao digitar,
// o valor antigo (ex: o "0" padrão) é substituído na hora, sem
// precisar apagar na mão primeiro.
// ------------------------------------------------------------

function selecionarTudoAoFocar(input) {
  input.addEventListener("focus", () => {
    setTimeout(() => input.select(), 0);
  });
}

[
  document.getElementById("produto-quantidade"),
  document.getElementById("produto-minimo"),
  document.getElementById("movimento-quantidade"),
].forEach(selecionarTudoAoFocar);

aplicarMaiusculoInvertido(document.getElementById("produto-nome"));

// --- Início ---
carregarProdutos();