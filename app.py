from flask import Flask, render_template, request, jsonify
from datetime import datetime
import sqlite3
import os

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "estoque.db")


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
            quantidade INTEGER NOT NULL DEFAULT 0,
            quantidade_minima INTEGER NOT NULL DEFAULT 0,
            preco REAL NOT NULL DEFAULT 0,
            atualizado_em TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            observacao TEXT,
            data TEXT NOT NULL,
            FOREIGN KEY (produto_id) REFERENCES produtos (id)
        )
    """)
    conn.commit()
    conn.close()


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
    # Histórico completo de movimentações (quando e por quê)
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
    quantidade = int(dados.get("quantidade", 0))
    quantidade_minima = int(dados.get("quantidade_minima", 0))
    preco = float(dados.get("preco", 0))

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO produtos (nome, observacoes, quantidade, quantidade_minima, preco, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)",
        (nome, observacoes, quantidade, quantidade_minima, preco, datetime.now().isoformat())
    )
    conn.commit()
    novo_id = cursor.lastrowid
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
    quantidade_minima = int(dados.get("quantidade_minima", produto["quantidade_minima"]))
    preco = float(dados.get("preco", produto["preco"]))

    conn.execute(
        "UPDATE produtos SET nome = ?, observacoes = ?, quantidade_minima = ?, preco = ?, atualizado_em = ? WHERE id = ?",
        (nome, observacoes, quantidade_minima, preco, datetime.now().isoformat(), produto_id)
    )
    conn.commit()
    produto = conn.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
    conn.close()
    return jsonify(dict(produto))


@app.route("/api/produtos/<int:produto_id>", methods=["DELETE"])
def excluir_produto(produto_id):
    conn = get_db()
    conn.execute("DELETE FROM produtos WHERE id = ?", (produto_id,))
    conn.execute("DELETE FROM movimentacoes WHERE produto_id = ?", (produto_id,))
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
    conn.execute(
        "INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao, data) VALUES (?, ?, ?, ?, ?)",
        (produto_id, tipo, quantidade, observacao, agora)
    )
    conn.commit()
    produto_atualizado = conn.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
    conn.close()
    return jsonify(dict(produto_atualizado))


@app.route("/api/movimentacoes", methods=["GET"])
def listar_movimentacoes():
    limite = int(request.args.get("limite", 30))
    conn = get_db()
    linhas = conn.execute("""
        SELECT m.id, m.tipo, m.quantidade, m.observacao, m.data, p.nome as produto_nome
        FROM movimentacoes m
        JOIN produtos p ON p.id = m.produto_id
        ORDER BY m.data DESC
        LIMIT ?
    """, (limite,)).fetchall()
    conn.close()
    return jsonify([dict(l) for l in linhas])


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)