// ------------------------------------------------------------
// Menu lateral — compartilhado por todas as páginas
// ------------------------------------------------------------

const botaoMenu = document.getElementById("botao-menu-lateral");
const fundoMenu = document.getElementById("fundo-menu-lateral");
const menuLateral = document.getElementById("menu-lateral");
const botaoFecharMenu = document.getElementById("botao-fechar-menu");

function abrirMenu() {
  fundoMenu.classList.remove("oculto");
}

function fecharMenu() {
  fundoMenu.classList.add("oculto");
}

botaoMenu.addEventListener("click", abrirMenu);
botaoFecharMenu.addEventListener("click", fecharMenu);

// Clicar fora do painel (no fundo escurecido) fecha o menu
fundoMenu.addEventListener("click", fecharMenu);

// Clicar dentro do painel não deve fechar o menu
menuLateral.addEventListener("click", (evento) => evento.stopPropagation());