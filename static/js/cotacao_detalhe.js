// ------------------------------------------------------------
// Detalhe de uma cotação: lista de itens, adicionar, excluir,
// exportar pra Excel
// ------------------------------------------------------------

let cotacaoAtual = null;

function formatarPreco(valor) {
  return "R$ " + Number(valor).toFixed(2).replace(".", ",");
}

async function carregarCotacao() {
  const resposta = await fetch(`/api/cotacoes/${COTACAO_ID}`);
  if (!resposta.ok) {
    alert("Cotação não encontrada.");
    window.location.href = "/cotacoes";
    return;
  }
  cotacaoAtual = await resposta.json();
  renderizarCotacao();
}

function renderizarCotacao() {
  document.getElementById("titulo-cotacao").textContent = cotacaoAtual.titulo;
  document.getElementById("subtitulo-cotacao").textContent =
    new Date(cotacaoAtual.criado_em).toLocaleDateString("pt-BR");

  const total = cotacaoAtual.itens.reduce((soma, item) => soma + item.preco + item.frete, 0);
  document.getElementById("valor-total-cotacao").textContent = formatarPreco(total);

  const lista = document.getElementById("lista-itens-cotacao");
  lista.innerHTML = "";

  if (cotacaoAtual.itens.length === 0) {
    lista.innerHTML = `<div class="estado-vazio">Nenhum item ainda. Toque em + pra adicionar.</div>`;
    return;
  }

  cotacaoAtual.itens.forEach(item => {
    const subtotal = item.preco + item.frete;
    const div = document.createElement("div");
    div.className = "item-cotacao";
    div.innerHTML = `
      ${item.imagem_arquivo
        ? `<img class="item-cotacao__imagem" src="/static/uploads/cotacoes/${item.imagem_arquivo}" alt="">`
        : `<div class="item-cotacao__imagem item-cotacao__imagem--vazia"></div>`}
      <div class="item-cotacao__info">
        <div class="item-cotacao__nome">${item.nome}</div>
        <div class="item-cotacao__loja">${item.loja || "—"}</div>
        <div class="item-cotacao__precos">
          ${formatarPreco(item.preco)} + frete ${formatarPreco(item.frete)} = <strong>${formatarPreco(subtotal)}</strong>
        </div>
        ${item.observacao ? `<div class="item-cotacao__observacao">${item.observacao}</div>` : ""}
        ${item.link ? `<a class="item-cotacao__link" href="${item.link}" target="_blank" rel="noopener">Ver produto</a>` : ""}
      </div>
      <div class="item-cotacao__acoes">
        <button class="link-discreto" data-acao="editar-item" data-id="${item.id}">Editar</button>
        <button class="link-discreto" data-acao="excluir-item" data-id="${item.id}">Excluir</button>
      </div>
    `;
    lista.appendChild(div);
  });
}

document.getElementById("lista-itens-cotacao").addEventListener("click", async (evento) => {
  const botaoExcluir = evento.target.closest("button[data-acao='excluir-item']");
  if (botaoExcluir) {
    const confirmar = window.confirm("Excluir esse item da cotação?");
    if (!confirmar) return;

    await fetch(`/api/cotacoes/${COTACAO_ID}/itens/${botaoExcluir.dataset.id}`, { method: "DELETE" });
    await carregarCotacao();
    return;
  }

  const botaoEditar = evento.target.closest("button[data-acao='editar-item']");
  if (botaoEditar) {
    const item = cotacaoAtual.itens.find(i => i.id === Number(botaoEditar.dataset.id));
    if (item) abrirFormularioEdicao(item);
  }
});

document.getElementById("botao-excluir-cotacao").addEventListener("click", async () => {
  const confirmar = window.confirm(`Excluir a cotação "${cotacaoAtual.titulo}" inteira? Essa ação não pode ser desfeita.`);
  if (!confirmar) return;

  await fetch(`/api/cotacoes/${COTACAO_ID}`, { method: "DELETE" });
  window.location.href = "/cotacoes";
});

document.getElementById("botao-exportar-excel").addEventListener("click", () => {
  window.location.href = `/api/cotacoes/${COTACAO_ID}/exportar`;
});

// ------------------------------------------------------------
// Modal: adicionar item (dois passos — com link ou sem link)
// ------------------------------------------------------------

const sobreposicaoItem = document.getElementById("sobreposicao-item");
const passoLink = document.getElementById("passo-link");
const formItem = document.getElementById("form-item");
let itemEmEdicao = null; // null = criando um item novo; senão, é o id do item sendo editado

document.getElementById("botao-novo-item").addEventListener("click", () => {
  itemEmEdicao = null;
  document.getElementById("titulo-modal-item").textContent = "Adicionar item";
  document.getElementById("item-link").value = "";
  document.getElementById("erro-busca").style.display = "none";
  passoLink.classList.remove("oculto");
  formItem.classList.add("oculto");
  sobreposicaoItem.classList.remove("oculto");
});

document.getElementById("botao-cancelar-item").addEventListener("click", () => {
  sobreposicaoItem.classList.add("oculto");
});

document.getElementById("botao-sem-link").addEventListener("click", () => {
  abrirFormularioCompleto({ semLink: true });
});

document.getElementById("botao-buscar-link").addEventListener("click", async () => {
  const link = document.getElementById("item-link").value.trim();
  const erroEl = document.getElementById("erro-busca");
  erroEl.style.display = "none";

  if (!link) {
    erroEl.textContent = 'Cola um link, ou usa "Adicionar sem link".';
    erroEl.style.display = "block";
    return;
  }

  const botaoBuscar = document.getElementById("botao-buscar-link");
  botaoBuscar.disabled = true;
  botaoBuscar.textContent = "Buscando...";

  try {
    const resposta = await fetch("/api/buscar-produto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: link }),
    });
    const dadosBusca = await resposta.json();
    abrirFormularioCompleto({ semLink: false, link, dadosBusca });
  } finally {
    botaoBuscar.disabled = false;
    botaoBuscar.textContent = "Buscar";
  }
});

function abrirFormularioCompleto({ semLink, link, dadosBusca }) {
  passoLink.classList.add("oculto");
  formItem.classList.remove("oculto");

  document.getElementById("erro-item").style.display = "none";
  document.getElementById("aviso-nome").classList.add("oculto");
  document.getElementById("preview-imagem-wrap").style.display = "none";
  document.getElementById("campo-upload-imagem").style.display = semLink ? "block" : "none";
  document.getElementById("item-imagem-arquivo").value = "";
  document.getElementById("item-imagem-existente").value = "";

  document.getElementById("item-nome").value = "";
  document.getElementById("item-loja").value = "";
  document.getElementById("item-preco").value = 0;
  document.getElementById("item-frete").value = 0;
  document.getElementById("item-observacao").value = "";

  if (!semLink && dadosBusca) {
    if (dadosBusca.nome) {
      document.getElementById("item-nome").value = dadosBusca.nome;
    } else {
      document.getElementById("aviso-nome").classList.remove("oculto");
    }
    if (dadosBusca.loja) {
      document.getElementById("item-loja").value = dadosBusca.loja;
    }
    if (dadosBusca.imagem_arquivo) {
      document.getElementById("item-imagem-existente").value = dadosBusca.imagem_arquivo;
      document.getElementById("preview-imagem-wrap").style.display = "block";
      document.getElementById("preview-imagem").src = `/static/uploads/cotacoes/${dadosBusca.imagem_arquivo}`;
    }
  }

  // Guarda o link (se tiver) direto no form, pra usar no submit
  formItem.dataset.link = semLink ? "" : (link || "");
}

function abrirFormularioEdicao(item) {
  itemEmEdicao = item.id;
  document.getElementById("titulo-modal-item").textContent = "Editar item";

  passoLink.classList.add("oculto");
  formItem.classList.remove("oculto");

  document.getElementById("erro-item").style.display = "none";
  document.getElementById("aviso-nome").classList.add("oculto");
  document.getElementById("campo-upload-imagem").style.display = "block";
  document.getElementById("item-imagem-arquivo").value = "";
  document.getElementById("item-imagem-existente").value = item.imagem_arquivo || "";

  if (item.imagem_arquivo) {
    document.getElementById("preview-imagem-wrap").style.display = "block";
    document.getElementById("preview-imagem").src = `/static/uploads/cotacoes/${item.imagem_arquivo}`;
  } else {
    document.getElementById("preview-imagem-wrap").style.display = "none";
  }

  document.getElementById("item-nome").value = item.nome;
  document.getElementById("item-loja").value = item.loja || "";
  document.getElementById("item-preco").value = item.preco;
  document.getElementById("item-frete").value = item.frete;
  document.getElementById("item-observacao").value = item.observacao || "";

  formItem.dataset.link = item.link || "";
  sobreposicaoItem.classList.remove("oculto");
}

formItem.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const erroEl = document.getElementById("erro-item");
  erroEl.style.display = "none";

  const formData = new FormData();
  formData.append("nome", document.getElementById("item-nome").value.trim());
  formData.append("loja", document.getElementById("item-loja").value.trim());
  formData.append("preco", document.getElementById("item-preco").value);
  formData.append("frete", document.getElementById("item-frete").value);
  formData.append("observacao", document.getElementById("item-observacao").value.trim());
  formData.append("link", formItem.dataset.link || "");
  formData.append("imagem_arquivo_existente", document.getElementById("item-imagem-existente").value);

  const arquivoImagem = document.getElementById("item-imagem-arquivo").files[0];
  if (arquivoImagem) {
    formData.append("imagem", arquivoImagem);
  }

  const url = itemEmEdicao
    ? `/api/cotacoes/${COTACAO_ID}/itens/${itemEmEdicao}`
    : `/api/cotacoes/${COTACAO_ID}/itens`;
  const metodo = itemEmEdicao ? "PUT" : "POST";

  const resposta = await fetch(url, {
    method: metodo,
    body: formData,
  });

  if (!resposta.ok) {
    const erro = await resposta.json();
    erroEl.textContent = erro.erro || "Não foi possível salvar o item.";
    erroEl.style.display = "block";
    return;
  }

  sobreposicaoItem.classList.add("oculto");
  await carregarCotacao();
});

carregarCotacao();