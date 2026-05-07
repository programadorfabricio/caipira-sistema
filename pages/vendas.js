// pages/vendas.js — 🛒 PDV unificado (Salão + Balcão) mobile-first

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Modal from "@/components/Modal";
import BotoesPagamento from "@/components/BotoesPagamento";
import { sb } from "@/lib/supabase";
import { R, hoje, TAMANHOS, TIPOS_PRATO, getPreco } from "@/lib/helpers";

const COM_SALADA = ["Prato Feito"];

// ── IMPRESSÃO ──────────────────────────────────────────────────────────────
function imprimirPedido({ destino, mesa, numero, carrinho, formaPag, total }) {
  // remove acentos para impressora termica
  function semAcento(str) {
    return (str || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  }

  const agora = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const data = new Date().toLocaleDateString("pt-BR");

  const linhas = carrinho
    .map((item) => {
      if (item.tipo === "prato") {
        const d = item.pratoData;
        const blocos = [
          d.misturas ? { cat: "MISTURA", val: semAcento(d.misturas) } : null,
          d.base ? { cat: "BASE", val: semAcento(d.base) } : null,
          d.acompanhamentos
            ? { cat: "ACOMP", val: semAcento(d.acompanhamentos) }
            : null,
          d.salada ? { cat: "SALADA", val: semAcento(d.salada) } : null,
          d.obs ? { cat: "OBS", val: semAcento(d.obs), obs: true } : null,
        ].filter(Boolean);

        const blocosHtml = blocos
          .map(
            (b) => `
        <div class="${b.obs ? "bloco-obs" : "bloco"}">
          <div class="bloco-cat">${b.cat}</div>
          <div class="bloco-val">${b.val}</div>
        </div>
      `,
          )
          .join("");

        return `
        <div class="item">
          <div class="item-nome">${semAcento(item.nome)}</div>
          ${blocosHtml}
          <div class="item-preco">${R(item.preco)}</div>
        </div>`;
      } else {
        return `
        <div class="item">
          <div class="item-nome">${item.quantidade}x ${item.nome}</div>
          <div class="item-preco">${R(item.preco * item.quantidade)}</div>
        </div>`;
      }
    })
    .join('<div class="divider"></div>');

  const destLabel =
    destino === "salao" ? `MESA ${semAcento(mesa)}` : `BALCAO #${numero}`;

  const pagLabel = semAcento(formaPag) || "PAGAR DEPOIS";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pedido</title>
  <style>
    @media print {
      @page { margin: 2mm; }
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', monospace;
      width: 72mm;
      padding: 3mm;
      background: #fff;
      color: #000;
      font-size: 16px;
    }
    .cabecalho {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .restaurante {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 3px;
    }
    .destino {
      font-size: 36px;
      font-weight: 900;
      margin: 8px 0 4px;
      letter-spacing: 1px;
      line-height: 1.4;
    }
    .hora {
      font-size: 16px;
      color: #333;
      margin-top: 4px;
    }
    .item {
      padding: 16px 0;
    }
    .item-nome {
      font-size: 26px;
      font-weight: 900;
      line-height: 1.5;
      text-transform: uppercase;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .item-det {
      font-size: 20px;
      font-weight: 700;
      margin-top: 8px;
      padding-left: 4px;
      line-height: 1.6;
    }
    .item-obs {
      font-size: 22px;
      font-weight: 900;
      margin-top: 10px;
      padding: 8px 10px;
      border: 3px solid #000;
      text-transform: uppercase;
      line-height: 1.5;
    }
    .item-preco {
      font-size: 18px;
      color: #444;
      margin-top: 8px;
      text-align: right;
    }
    .bloco {
      border-top: 3px solid #000;
      margin-top: 16px;
      padding-top: 10px;
    }
    .bloco-obs {
      border-top: 3px solid #000;
      border-bottom: 3px solid #000;
      margin-top: 10px;
      padding: 8px 0;
    }
    .bloco-cat {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 4px;
    }
    .bloco-val {
      font-size: 28px;
      font-weight: 900;
      line-height: 1.6;
      text-transform: uppercase;
    }
    .divider {
      border-top: 2px dashed #666;
      margin: 16px 0;
    }
    .rodape {
      border-top: 3px solid #000;
      margin-top: 20px;
      padding-top: 14px;
    }
    .total-label {
      font-size: 18px;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .total-valor {
      font-size: 32px;
      font-weight: 900;
      margin: 4px 0;
    }
    .pag {
      font-size: 22px;
      font-weight: 900;
      margin-top: 8px;
      padding: 6px 0;
      border-top: 1px dashed #666;
      text-transform: uppercase;
    }
    .pag-depois {
      font-size: 26px;
      font-weight: 900;
      padding: 8px;
      border: 4px solid #000;
      text-align: center;
      margin-top: 10px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="cabecalho">
    <div class="restaurante">O CAIPIRA</div>
    <div class="destino">${destLabel}</div>
    <div class="hora">${data} - ${agora}</div>
  </div>

  ${linhas}

  <div class="rodape">
    <div class="total-label">TOTAL</div>
    <div class="total-valor">${R(total)}</div>
    ${
      formaPag
        ? `<div class="pag">${pagLabel}</div>`
        : `<div class="pag-depois">${pagLabel}</div>`
    }
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=700");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 600);
}

// ──────────────────────────────────────────────────────────────────────────

export default function Vendas() {
  const [mesas, setMesas] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [precos, setPrecos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [proxNumBalcao, setProxNumBalcao] = useState(1);

  const [carrinho, setCarrinho] = useState([]);
  const [prato, setPrato] = useState({
    tipo_prato: "Prato Feito",
    tamanho: "M",
    misturas: [],
    acomp_sel: [],
    base_sel: [],
    salada_sel: [],
    obs: "",
  });
  const [destino, setDestino] = useState(null);
  const [mesa, setMesa] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const [
      { data: ms },
      { data: card },
      { data: estq },
      { data: balPed },
      { data: prc },
    ] = await Promise.all([
      sb.from("mesas").select("*").order("numero"),
      sb.from("cardapio_dia").select("*").eq("data", hoje()).order("tipo"),
      sb
        .from("estoque")
        .select("*")
        .eq("venda_direta", true)
        .gt("qty", 0)
        .order("cat")
        .order("nome"),
      sb.from("balcao_pedidos").select("numero").eq("data", hoje()),
      sb.from("precos").select("*"),
    ]);
    if (ms) setMesas(ms);
    if (card) setCardapio(card);
    if (estq) setEstoque(estq);
    if (prc) setPrecos(prc);
    if (balPed)
      setProxNumBalcao(
        balPed.length === 0 ? 1 : Math.max(...balPed.map((p) => p.numero)) + 1,
      );
    setLoading(false);
  }

  function getPrecoLocal(tipo, tamanho, misturas = []) {
    if (tipo === "Marmitex") {
      const ehFeijoada = Array.isArray(misturas)
        ? misturas.some((m) =>
            (m.nome || "").toLowerCase().includes("feijoada"),
          )
        : false;

      if (ehFeijoada) {
        const found = precos.find(
          (p) => p.tipo === "Feijoada" && p.tamanho === tamanho,
        );
        if (found) return Number(found.preco);
      }

      const numMist = Array.isArray(misturas) ? misturas.length || 1 : misturas;
      const found = precos.find(
        (p) =>
          p.tipo === "Marmitex" &&
          p.tamanho === tamanho &&
          p.num_misturas === numMist,
      );
      if (found) return Number(found.preco);

      const fallback = precos.find(
        (p) => p.tipo === "Marmitex" && p.tamanho === tamanho,
      );
      return fallback ? Number(fallback.preco) : 0;
    }
    const found = precos.find((p) => p.tipo === tipo && p.tamanho === tamanho);
    return found ? Number(found.preco) : 0;
  }

  const misturasDia = cardapio.filter((c) => c.tipo === "mistura");
  const acompDia = cardapio.filter((c) => c.tipo === "acompanhamento");
  const baseDia = cardapio.filter((c) => c.tipo === "base");
  const saladaDia = cardapio.filter((c) => c.tipo === "salada");
  const categorias = [...new Set(estoque.map((e) => e.cat))];
  const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const tam = TAMANHOS.find((t) => t.key === prato.tamanho);
  const temSalada = COM_SALADA.includes(prato.tipo_prato);

  function addProduto(item) {
    const jatem = carrinho.find(
      (c) => c.id === item.id && c.tipo === "produto",
    );
    if (jatem) {
      setCarrinho((prev) =>
        prev.map((c) =>
          c.id === item.id && c.tipo === "produto"
            ? { ...c, quantidade: c.quantidade + 1 }
            : c,
        ),
      );
    } else {
      setCarrinho((prev) => [
        ...prev,
        {
          id: item.id,
          tipo: "produto",
          nome: item.nome,
          preco: item.preco_venda || 0,
          quantidade: 1,
          estoqueId: item.id,
        },
      ]);
    }
  }

  function removerItem(idx) {
    setCarrinho((prev) => prev.filter((_, i) => i !== idx));
  }

  function addPrato() {
    if (prato.misturas?.length === 0)
      return alert("Selecione pelo menos 1 mistura!");
    const acompSel = prato.acomp_sel.length === 0 ? acompDia : prato.acomp_sel;
    const baseSel = prato.base_sel.length === 0 ? baseDia : prato.base_sel;
    const saladaSel =
      prato.salada_sel.length === 0 ? saladaDia : prato.salada_sel;

    const descricao = [
      prato.misturas.map((m) => m.nome).join(", "),
      baseSel.length > 0
        ? `Base: ${baseSel.map((b) => b.nome).join(", ")}`
        : "",
      acompSel.length > 0
        ? `Acomp: ${acompSel.map((a) => a.nome).join(", ")}`
        : "",
      temSalada && saladaSel.length > 0
        ? `Salada: ${saladaSel.map((s) => s.nome).join(", ")}`
        : "",
      prato.obs ? `Obs: ${prato.obs}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const preco = getPrecoLocal(
      prato.tipo_prato,
      prato.tamanho,
      prato.misturas,
    );

    setCarrinho((prev) => [
      ...prev,
      {
        id: Date.now(),
        tipo: "prato",
        nome: `${prato.tipo_prato} ${prato.tamanho}`,
        descricao,
        preco,
        quantidade: 1,
        pratoData: {
          tipo_prato: prato.tipo_prato,
          tamanho: prato.tamanho,
          misturas: prato.misturas.map((m) => m.nome).join(", "),
          acompanhamentos: acompSel.map((a) => a.nome).join(", "),
          base: baseSel.map((b) => b.nome).join(", "),
          salada: temSalada ? saladaSel.map((s) => s.nome).join(", ") : "",
          obs: prato.obs,
        },
      },
    ]);
    setPrato({
      tipo_prato: "Prato Feito",
      tamanho: "M",
      misturas: [],
      acomp_sel: [],
      base_sel: [],
      salada_sel: [],
      obs: "",
    });
    setModal(null);
  }

  function toggleMistura(item) {
    const ehFeijoada = (item.nome || "").toLowerCase().includes("feijoada");
    const jaTemFeijoada = prato.misturas.some((m) =>
      (m.nome || "").toLowerCase().includes("feijoada"),
    );

    // feijoada sozinha só na Marmitex
    if (jaTemFeijoada && !ehFeijoada && prato.tipo_prato === "Marmitex") {
      return alert("Na Marmitex a Feijoada é sozinha!");
    }

    if (
      ehFeijoada &&
      prato.misturas.length > 0 &&
      !prato.misturas.find((m) => m.id === item.id) &&
      prato.tipo_prato === "Marmitex"
    ) {
      return setPrato((f) => ({ ...f, misturas: [item] }));
    }

    const jatem = prato.misturas.find((m) => m.id === item.id);
    if (jatem) {
      setPrato((f) => ({
        ...f,
        misturas: f.misturas.filter((m) => m.id !== item.id),
      }));
    } else if (prato.misturas.length >= tam.misturas) {
      setPrato((f) => ({ ...f, misturas: [...f.misturas.slice(1), item] }));
    } else {
      setPrato((f) => ({ ...f, misturas: [...f.misturas, item] }));
    }
  }

  function toggleGrupo(item, campo, listaDia) {
    const base = prato[campo].length === 0 ? listaDia : prato[campo];
    const jatem = base.find((x) => x.id === item.id);
    if (jatem)
      setPrato((f) => ({
        ...f,
        [campo]: base.filter((x) => x.id !== item.id),
      }));
    else setPrato((f) => ({ ...f, [campo]: [...base, item] }));
  }

  // ── CONFIRMAR PEDIDO ──
  async function confirmar(formaPag) {
    if (!destino) return alert("Selecione o destino!");
    if (destino === "salao" && !mesa) return alert("Selecione a mesa!");
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    const pratosNoCarrinho = carrinho.filter((c) => c.tipo === "prato");
    const produtosNoCarrinho = carrinho.filter((c) => c.tipo === "produto");
    const totalFinal = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);

    if (destino === "salao") {
      for (const item of pratosNoCarrinho) {
        const { data: cmd } = await sb
          .from("comandas")
          .insert({
            numero: Math.floor(Math.random() * 900000 + 100000).toString(),
            mesa,
            cliente_nome: `Mesa ${mesa}`,
            tipo_prato: item.pratoData.tipo_prato,
            tamanho: item.pratoData.tamanho,
            misturas: item.pratoData.misturas,
            acompanhamentos: item.pratoData.acompanhamentos,
            base: item.pratoData.base,
            salada: item.pratoData.salada,
            obs: item.pratoData.obs,
            status: "aberta",
            total: item.preco,
            forma_pagamento: formaPag || null,
            data: hoje(),
          })
          .select()
          .single();

        if (produtosNoCarrinho.length > 0) {
          await sb.from("comanda_itens").insert(
            produtosNoCarrinho.map((p) => ({
              comanda_id: cmd.id,
              nome: p.nome,
              quantidade: p.quantidade,
              preco_unitario: p.preco,
            })),
          );
          await sb
            .from("comandas")
            .update({
              total:
                item.preco +
                produtosNoCarrinho.reduce(
                  (s, p) => s + p.preco * p.quantidade,
                  0,
                ),
            })
            .eq("id", cmd.id);
        }
      }
      await sb
        .from("mesas")
        .update({ status: "ocupada" })
        .eq("numero", Number(mesa));
    } else {
      for (const item of pratosNoCarrinho) {
        const { data: ped } = await sb
          .from("balcao_pedidos")
          .insert({
            numero: proxNumBalcao,
            data: hoje(),
            tipo_prato: item.pratoData.tipo_prato,
            tamanho: item.pratoData.tamanho,
            misturas: item.pratoData.misturas,
            acompanhamentos: item.pratoData.acompanhamentos,
            base: item.pratoData.base,
            salada: item.pratoData.salada,
            obs: item.pratoData.obs,
            status: "aberto",
            total: item.preco,
            forma_pagamento: formaPag || null,
          })
          .select()
          .single();

        if (produtosNoCarrinho.length > 0) {
          await sb.from("balcao_itens").insert(
            produtosNoCarrinho.map((p) => ({
              pedido_id: ped.id,
              tipo: "bebida",
              nome: p.nome,
              preco: p.preco,
            })),
          );
        }
      }
    }

    if (pratosNoCarrinho.length === 0 && produtosNoCarrinho.length > 0) {
      if (destino === "salao") {
        const { data: cmd } = await sb
          .from("comandas")
          .insert({
            numero: Math.floor(Math.random() * 900000 + 100000).toString(),
            mesa,
            cliente_nome: `Mesa ${mesa}`,
            tipo_prato: "",
            tamanho: "",
            misturas: "",
            status: "aberta",
            total: totalFinal,
            forma_pagamento: formaPag || null,
            data: hoje(),
          })
          .select()
          .single();
        await sb.from("comanda_itens").insert(
          produtosNoCarrinho.map((p) => ({
            comanda_id: cmd.id,
            nome: p.nome,
            quantidade: p.quantidade,
            preco_unitario: p.preco,
          })),
        );
      }
    }

    if (formaPag) {
      await sb.from("financeiro").insert({
        tipo: "receita",
        descricao:
          destino === "salao" ? `Mesa ${mesa}` : `Balcão #${proxNumBalcao}`,
        valor: totalFinal,
        categoria: "Vendas",
        pagamento: formaPag,
        data: hoje(),
        origem: destino,
      });
    }

    for (const p of produtosNoCarrinho) {
      const item = estoque.find((e) => e.id === p.estoqueId);
      if (item) {
        await sb
          .from("estoque")
          .update({ qty: Math.max(0, item.qty - p.quantidade) })
          .eq("id", item.id);
      }
    }

    for (const item of pratosNoCarrinho) {
      await sb.from("vendas_dia").insert({
        data: hoje(),
        tipo_prato: item.pratoData.tipo_prato,
        tamanho: item.pratoData.tamanho,
        origem: destino,
        quantidade: 1,
      });
    }

    // ── IMPRESSÃO AUTOMÁTICA ──
    imprimirPedido({
      destino,
      mesa,
      numero: proxNumBalcao,
      carrinho,
      formaPag,
      total: totalFinal,
    });

    await carregar();
    setCarrinho([]);
    setDestino(null);
    setMesa("");
    setModal(null);
  }

  if (loading)
    return (
      <Layout title="Vendas">
        <div className="loading-overlay">
          <div className="loading-icon">🛒</div>
          <div className="loading-txt">Carregando...</div>
        </div>
      </Layout>
    );

  return (
    <Layout title="Vendas">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          paddingBottom: "180px",
        }}
      >
        {/* ── PRATO ── */}
        <div className="panel">
          <div className="panel-hd">
            <div className="panel-title">🍽️ Prato</div>
          </div>
          <button
            className="btn btn-ora"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: ".9rem",
            }}
            onClick={() => setModal("prato")}
          >
            + Adicionar Prato
          </button>
        </div>

        {/* ── PRODUTOS DO ESTOQUE ── */}
        {categorias.map((cat) => {
          const itens = estoque.filter((e) => e.cat === cat);
          return (
            <div key={cat} className="panel">
              <div className="panel-hd">
                <div className="panel-title">{cat}</div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: ".5rem",
                }}
              >
                {itens.map((item) => {
                  const noCarrinho = carrinho.find(
                    (c) => c.estoqueId === item.id,
                  );
                  return (
                    <button
                      key={item.id}
                      style={{
                        padding: ".7rem .5rem",
                        borderRadius: 10,
                        border: `2px solid ${noCarrinho ? "var(--ora)" : "var(--c3)"}`,
                        background: noCarrinho
                          ? "rgba(255,106,0,.1)"
                          : "var(--c2)",
                        cursor: "pointer",
                        transition: "all .15s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: ".3rem",
                      }}
                      onClick={() => addProduto(item)}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font)",
                          fontWeight: 700,
                          fontSize: ".82rem",
                          color: noCarrinho ? "var(--ora)" : "var(--branco)",
                          textAlign: "center",
                        }}
                      >
                        {item.nome}
                      </div>
                      {item.preco_venda > 0 && (
                        <div
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: ".72rem",
                            color: "var(--txt)",
                          }}
                        >
                          {R(item.preco_venda)}
                        </div>
                      )}
                      {noCarrinho && (
                        <div
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: ".72rem",
                            color: "var(--ora)",
                            fontWeight: 700,
                          }}
                        >
                          x{noCarrinho.quantidade}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CARRINHO FIXO EMBAIXO ── */}
      {carrinho.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--c1)",
            borderTop: "2px solid var(--ora)",
            padding: "1rem",
            zIndex: 100,
          }}
        >
          <div
            style={{ maxHeight: 120, overflowY: "auto", marginBottom: ".8rem" }}
          >
            {carrinho.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: ".82rem",
                  padding: ".25rem 0",
                  borderBottom: "1px solid var(--c2)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700 }}>
                    {item.quantidade}x {item.nome}
                  </span>
                  {item.descricao && (
                    <div style={{ fontSize: ".72rem", color: "var(--txt)" }}>
                      {item.descricao}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".5rem",
                  }}
                >
                  {item.preco > 0 && (
                    <span
                      style={{ fontFamily: "var(--mono)", color: "var(--ora)" }}
                    >
                      {R(item.preco * item.quantidade)}
                    </span>
                  )}
                  <button
                    className="btn btn-vm btn-icon btn-sm"
                    onClick={() => removerItem(idx)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: ".72rem", color: "var(--txt)" }}>
                Total
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  color: "var(--ora)",
                }}
              >
                {R(total)}
              </div>
            </div>
            <button
              className="btn btn-ora"
              style={{ flex: 1, justifyContent: "center", padding: ".85rem" }}
              onClick={() => setModal("destino")}
            >
              Confirmar Pedido →
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL PRATO ── */}
      <Modal
        open={modal === "prato"}
        onClose={() => setModal(null)}
        title="Adicionar Prato 🍽️"
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button className="btn btn-ora" onClick={addPrato}>
              Adicionar ao Carrinho
            </button>
          </>
        }
      >
        <div className="fg">
          <label>Tipo</label>
          <div style={{ display: "flex", gap: ".5rem" }}>
            {TIPOS_PRATO.map((t) => (
              <button
                key={t.key}
                className={`btn ${prato.tipo_prato === t.key ? "btn-ora" : "btn-ghost"}`}
                style={{
                  flex: 1,
                  flexDirection: "column",
                  gap: ".2rem",
                  padding: ".8rem .4rem",
                }}
                onClick={() =>
                  setPrato((f) => ({
                    ...f,
                    tipo_prato: t.key,
                    misturas: [],
                    salada_sel: [],
                  }))
                }
              >
                <span style={{ fontSize: "1.2rem" }}>{t.ico}</span>
                <span style={{ fontSize: ".72rem", fontWeight: 700 }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="fg">
          <label>Tamanho</label>
          <div style={{ display: "flex", gap: ".5rem" }}>
            {TAMANHOS.map((t) => (
              <button
                key={t.key}
                className={`btn ${prato.tamanho === t.key ? "btn-ora" : "btn-ghost"}`}
                style={{
                  flex: 1,
                  flexDirection: "column",
                  gap: ".2rem",
                  padding: ".8rem .4rem",
                }}
                onClick={() =>
                  setPrato((f) => ({ ...f, tamanho: t.key, misturas: [] }))
                }
              >
                <span style={{ fontWeight: 800 }}>{t.key}</span>
                <span
                  style={{
                    fontSize: ".62rem",
                    fontFamily: "var(--mono)",
                    color: prato.tamanho === t.key ? "#000" : "var(--ora)",
                  }}
                >
                  {getPrecoLocal(prato.tipo_prato, t.key, prato.misturas) > 0
                    ? R(getPrecoLocal(prato.tipo_prato, t.key, prato.misturas))
                    : t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="fg">
          <label>
            🍖 Mistura{tam.misturas > 1 ? "s" : ""} ({prato.misturas.length}/
            {tam.misturas})
          </label>
          {misturasDia.length === 0 ? (
            <div style={{ color: "var(--amar)", fontSize: ".82rem" }}>
              ⚠️ Configure o cardápio do dia primeiro!
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {misturasDia.map((m) => {
                const sel = prato.misturas.find((x) => x.id === m.id);
                return (
                  <button
                    key={m.id}
                    className={`btn btn-sm ${sel ? "btn-ora" : "btn-ghost"}`}
                    onClick={() => toggleMistura(m)}
                  >
                    {sel ? "✓ " : ""}
                    {m.nome}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {baseDia.length > 0 && (
          <div className="fg">
            <label>🍚 Base (desmarque o que não quer)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {baseDia.map((a) => {
                const base =
                  prato.base_sel.length === 0 ? baseDia : prato.base_sel;
                const sel = base.find((x) => x.id === a.id);
                return (
                  <button
                    key={a.id}
                    className={`btn btn-sm ${sel ? "btn-az" : "btn-ghost"}`}
                    style={{ opacity: sel ? 1 : 0.5 }}
                    onClick={() => toggleGrupo(a, "base_sel", baseDia)}
                  >
                    {sel ? "✓ " : "✕ "}
                    {a.nome}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {acompDia.length > 0 && (
          <div className="fg">
            <label>🥗 Acomp. (desmarque o que não quer)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {acompDia.map((a) => {
                const base =
                  prato.acomp_sel.length === 0 ? acompDia : prato.acomp_sel;
                const sel = base.find((x) => x.id === a.id);
                return (
                  <button
                    key={a.id}
                    className={`btn btn-sm ${sel ? "btn-vd" : "btn-ghost"}`}
                    style={{ opacity: sel ? 1 : 0.5 }}
                    onClick={() => toggleGrupo(a, "acomp_sel", acompDia)}
                  >
                    {sel ? "✓ " : "✕ "}
                    {a.nome}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {temSalada && saladaDia.length > 0 && (
          <div className="fg">
            <label>🥬 Salada (desmarque o que não quer)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {saladaDia.map((a) => {
                const base =
                  prato.salada_sel.length === 0 ? saladaDia : prato.salada_sel;
                const sel = base.find((x) => x.id === a.id);
                return (
                  <button
                    key={a.id}
                    className={`btn btn-sm ${sel ? "btn-vd" : "btn-ghost"}`}
                    style={{ opacity: sel ? 1 : 0.5 }}
                    onClick={() => toggleGrupo(a, "salada_sel", saladaDia)}
                  >
                    {sel ? "✓ " : "✕ "}
                    {a.nome}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="fg">
          <label>Observação</label>
          <input
            type="text"
            placeholder="Sem sal, bem passado..."
            value={prato.obs}
            onChange={(e) => setPrato((f) => ({ ...f, obs: e.target.value }))}
          />
        </div>
      </Modal>

      {/* ── MODAL DESTINO ── */}
      <Modal
        open={modal === "destino"}
        onClose={() => setModal(null)}
        title="Para onde vai? 📍"
      >
        <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem" }}>
          <button
            className={`btn ${destino === "salao" ? "btn-ora" : "btn-ghost"}`}
            style={{
              flex: 1,
              padding: "1rem",
              justifyContent: "center",
              flexDirection: "column",
              gap: ".3rem",
            }}
            onClick={() => setDestino("salao")}
          >
            <span style={{ fontSize: "1.5rem" }}>🍽️</span>
            <span style={{ fontWeight: 700 }}>Salão</span>
          </button>
          <button
            className={`btn ${destino === "balcao" ? "btn-az" : "btn-ghost"}`}
            style={{
              flex: 1,
              padding: "1rem",
              justifyContent: "center",
              flexDirection: "column",
              gap: ".3rem",
            }}
            onClick={() => setDestino("balcao")}
          >
            <span style={{ fontSize: "1.5rem" }}>🥡</span>
            <span style={{ fontWeight: 700 }}>Balcão #{proxNumBalcao}</span>
          </button>
        </div>

        {destino === "salao" && (
          <div className="fg">
            <label>Mesa</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: ".5rem",
              }}
            >
              {mesas.map((m) => (
                <button
                  key={m.id}
                  style={{
                    padding: ".7rem",
                    borderRadius: 8,
                    border: `2px solid ${mesa === String(m.numero) ? "var(--ora)" : m.status === "ocupada" ? "var(--verm)" : "var(--c3)"}`,
                    background:
                      mesa === String(m.numero)
                        ? "rgba(255,106,0,.15)"
                        : "transparent",
                    color:
                      m.status === "ocupada" ? "var(--verm)" : "var(--branco)",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                  onClick={() => setMesa(String(m.numero))}
                >
                  {m.numero}
                  {m.status === "ocupada" && (
                    <div style={{ fontSize: ".6rem" }}>ocupada</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid var(--c2)",
            paddingTop: "1rem",
            marginTop: ".5rem",
          }}
        >
          <div
            style={{
              fontSize: ".75rem",
              color: "var(--txt)",
              marginBottom: ".8rem",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Pagamento
          </div>
          <BotoesPagamento onPagar={(forma) => confirmar(forma)} />
          <button
            className="btn btn-ghost btn-sm"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: ".5rem",
            }}
            onClick={() => confirmar(null)}
          >
            💾 Salvar sem pagar agora
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
