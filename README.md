# Sistema de Estoque — v1

Primeira versão funcional. Backend em Flask + SQLite, front-end em HTML/CSS/JS puro.

## Como rodar

1. Abra a pasta no VS Code.
2. No terminal, instale as dependências:
   ```
   pip install -r requirements.txt
   ```
3. Rode o servidor:
   ```
   python app.py
   ```
4. Abra no navegador:
   - `http://localhost:5000/` → tela da colega (edita o estoque)
   - `http://localhost:5000/gerente` → tela da gerente (só leitura)

O banco de dados (`estoque.db`) é criado automaticamente na primeira vez que o servidor roda, já com alguns produtos de exemplo.

## Estrutura do projeto

```
sistema-estoque/
  app.py                 -> servidor Flask: rotas de página e API
  estoque.db              -> banco SQLite (criado automaticamente)
  templates/
    base.html              -> layout compartilhado (fontes, CSS)
    estoque.html            -> tela de edição (colega)
    gerente.html            -> tela de leitura (gerente)
  static/
    css/style.css           -> estilo visual do sistema
    js/estoque.js            -> lógica da tela de edição
    js/gerente.js             -> lógica do painel da gerência
```

## Como testar no celular da sua colega (mesma rede Wi-Fi)

1. Descubra o IP do seu computador na rede local (Windows: `ipconfig`, procure "Endereço IPv4").
2. Com o servidor rodando, acesse do celular: `http://SEU_IP:5000/` (ex: `http://192.168.0.10:5000/`)
3. Isso só funciona enquanto seu computador estiver ligado e na mesma rede — quando quiser deixar acessível de qualquer lugar, o próximo passo é hospedar o site (dá pra ver isso mais pra frente).

## O que já funciona

- Cadastrar produto (nome, categoria, quantidade inicial, estoque mínimo, preço)
- Editar dados de um produto
- Excluir produto
- Registrar entrada e saída de estoque (com histórico salvo)
- Alerta visual quando o produto está abaixo do estoque mínimo
- Painel da gerência: totais, valor em estoque, produtos abaixo do mínimo, últimas movimentações

## O que ainda falta (próximos passos possíveis)

- Login (hoje qualquer pessoa com o link acessa as duas telas)
- Módulo de fornecedores e pedidos de compra
- Hospedar o site num servidor real (pra funcionar sem depender do seu computador ligado)
- Exportar relatórios (ex: para Excel)
