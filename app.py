from flask import Flask, render_template, request, jsonify
from datetime import datetime
import sqlite3
import os

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "estoque.db")

ROTULOS_ESTOQUE = {
    "casa": "Casa",
    "sala_convivio": "Sala de convívio",
    "servidor": "Servidor",
}


# ---------- Banco de dados ----------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # permite acessar colunas pelo nome
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            observacoes TEXT,
            estoque TEXT NOT NULL DEFAULT 'casa',
            quantidade INTEGER NOT NULL DEFAULT 0,
            quantidade_minima INTEGER NOT NULL DEFAULT 0,
            preco REAL NOT NULL DEFAULT 0,
            criado_em TEXT,
            atualizado_em TEXT
        )
    """)
    # Tabela única de logs: cobre criação, edição, exclusão e
    # movimentação (entrada/saída). produto_nome fica salvo direto
    # aqui (não é uma referência ao id do produto) porque queremos
    # que o log continue existindo mesmo depois que o produto for
    # excluído.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            produto_nome TEXT NOT NULL,
            detalhes TEXT,
            data TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def registrar_log(conn, tipo, produto_nome, detalhes=""):
    conn.execute(
        "INSERT INTO logs (tipo, produto_nome, detalhes, data) VALUES (?, ?, ?, ?)",
        (tipo, produto_nome, detalhes, datetime.now().isoformat())
    )


def rotulo_estoque(chave):
    return ROTULOS_ESTOQUE.get(chave, chave)


# ---------- Páginas ----------

@app.route("/")
def pagina_estoque():
    # Tela principal - usada pela colega, com permissão de editar
    return render_template("estoque.html")


@app.route("/gerente")
def pagina_gerente():
    # Tela só leitura - usada pela gerente
    return render_template("gerente.html")


@app.route("/logs")
def pagina_logs():
    # Histórico completo: criação, edição, exclusão e movimentações
    return render_template("logs.html")


# ---------- API: produtos ----------

@app.route("/api/produtos", methods=["GET"])
def listar_produtos():
    conn = get_db()
    produtos = conn.execute("SELECT * FROM produtos ORDER BY nome").fetchall()
    conn.close()
    return jsonify([dict(p) for p in produtos])


@app.route("/api/produtos", methods=["POST"])
def criar_produto():
    dados = request.get_json()

    nome = (dados.get("nome") or "").strip()
    if not nome:
        return jsonify({"erro": "Nome do produto é obrigatório"}), 400

    observacoes = (dados.get("observacoes") or "").strip()
    estoque = (dados.get("estoque") or "casa").strip()
    quantidade = int(dados.get("quantidade", 0))
    quantidade_minima = int(dados.get("quantidade_minima", 0))

    agora = datetime.now().isoformat()
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO produtos (nome, observacoes, estoque, quantidade, quantidade_minima, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (nome, observacoes, estoque, quantidade, quantidade_minima, agora, agora)
    )
    novo_id = cursor.lastrowid

    detalhes = f"Cadastrado em '{rotulo_estoque(estoque)}' com estoque mínimo {quantidade_minima}"
    if observacoes:
        detalhes += f" — Obs: {observacoes}"
    registrar_log(conn, "criacao", nome, detalhes)

    conn.commit()
    produto = conn.execute("SELECT * FROM produtos WHERE id = ?", (novo_id,)).fetchone()
    conn.close()

    return jsonify(dict(produto)), 201


@app.route("/api/produtos/<int:produto_id>", methods=["PUT"])
def editar_produto(produto_id):
    dados = request.get_json()
    conn = get_db()
    produto = conn.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
    if produto is None:
        conn.close()
        return jsonify({"erro": "Produto não encontrado"}), 404

    nome = dados.get("nome", produto["nome"])
    observacoes = dados.get("observacoes", produto["observacoes"])
    estoque = dados.get("estoque", produto["estoque"])
    quantidade_minima = int(dados.get("quantidade_minima", produto["quantidade_minima"]))

    # Monta uma descrição legível do que mudou, comparando valor antigo x novo
    mudancas = []
    if nome != produto["nome"]:
        mudancas.append(f"nome '{produto['nome']}' → '{nome}'")
    if observacoes != (produto["observacoes"] or ""):
        antiga = produto["observacoes"] or "(vazio)"
        nova = observacoes or "(vazio)"
        mudancas.append(f"observações: '{antiga}' → '{nova}'")
    if estoque != produto["estoque"]:
        mudancas.append(f"estoque '{rotulo_estoque(produto['estoque'])}' → '{rotulo_estoque(estoque)}'")
    if quantidade_minima != produto["quantidade_minima"]:
        mudancas.append(f"mínimo {produto['quantidade_minima']} → {quantidade_minima}")
    detalhes = "; ".join(mudancas) if mudancas else "Nenhuma alteração detectada"

    conn.execute(
        "UPDATE produtos SET nome = ?, observacoes = ?, estoque = ?, quantidade_minima = ?, atualizado_em = ? WHERE id = ?",
        (nome, observacoes, estoque, quantidade_minima, datetime.now().isoformat(), produto_id)
    )
    registrar_log(conn, "edicao", nome, detalhes)

    conn.commit()
    produto = conn.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
    conn.close()
    return jsonify(dict(produto))


@app.route("/api/produtos/<int:produto_id>", methods=["DELETE"])
def excluir_produto(produto_id):
    conn = get_db()
    produto = conn.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
    if produto is None:
        conn.close()
        return jsonify({"erro": "Produto não encontrado"}), 404

    conn.execute("DELETE FROM produtos WHERE id = ?", (produto_id,))
    registrar_log(conn, "exclusao", produto["nome"], "Produto removido do sistema")
    conn.commit()
    conn.close()
    return jsonify({"sucesso": True})


# ---------- API: movimentações (entrada/saída de estoque) ----------

@app.route("/api/produtos/<int:produto_id>/movimentar", methods=["POST"])
def movimentar_estoque(produto_id):
    dados = request.get_json()
    tipo = dados.get("tipo")  # "entrada" ou "saida"
    quantidade = int(dados.get("quantidade", 0))
    observacao = (dados.get("observacao") or "").strip()

    if tipo not in ("entrada", "saida"):
        return jsonify({"erro": "Tipo deve ser 'entrada' ou 'saida'"}), 400
    if quantidade <= 0:
        return jsonify({"erro": "Quantidade deve ser maior que zero"}), 400

    conn = get_db()
    produto = conn.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
    if produto is None:
        conn.close()
        return jsonify({"erro": "Produto não encontrado"}), 404

    nova_quantidade = produto["quantidade"] + quantidade if tipo == "entrada" else produto["quantidade"] - quantidade
    if nova_quantidade < 0:
        conn.close()
        return jsonify({"erro": "Estoque insuficiente para essa saída"}), 400

    agora = datetime.now().isoformat()
    conn.execute("UPDATE produtos SET quantidade = ?, atualizado_em = ? WHERE id = ?", (nova_quantidade, agora, produto_id))

    detalhes = f"{quantidade} un. — Motivo: {observacao}" if observacao else f"{quantidade} un. — Motivo não informado"
    registrar_log(conn, tipo, produto["nome"], detalhes)

    conn.commit()
    produto_atualizado = conn.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
    conn.close()
    return jsonify(dict(produto_atualizado))


@app.route("/api/logs", methods=["GET"])
def listar_logs():
    limite = int(request.args.get("limite", 30))
    tipos_param = request.args.get("tipos")  # ex: "entrada,saida"

    conn = get_db()
    if tipos_param:
        tipos = tipos_param.split(",")
        marcadores = ",".join(["?"] * len(tipos))
        linhas = conn.execute(
            f"SELECT * FROM logs WHERE tipo IN ({marcadores}) ORDER BY data DESC LIMIT ?",
            (*tipos, limite)
        ).fetchall()
    else:
        linhas = conn.execute("SELECT * FROM logs ORDER BY data DESC LIMIT ?", (limite,)).fetchall()
    conn.close()
    return jsonify([dict(l) for l in linhas])


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)