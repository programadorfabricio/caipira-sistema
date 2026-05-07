// pages/whatsapp.js — 📱 Pedidos WhatsApp com bairros e taxas

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Modal from "@/components/Modal";
import BotoesPagamento from "@/components/BotoesPagamento";
import { sb } from "@/lib/supabase";
import {
  R,
  hoje,
  statusPedido,
  TAMANHOS,
  TIPOS_PRATO,
  getPreco,
} from "@/lib/helpers";

// ── IMPRESSÃO ──────────────────────────────────────────────────────────────
function imprimirPedidoWpp({ pedido, itens }) {
  function semAcento(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }
  const fmt = (v) =>
    `R$ ${Number(v || 0)
      .toFixed(2)
      .replace(".", ",")}`;
  const agora = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const data = new Date().toLocaleDateString("pt-BR");
  const tipoLabel = pedido.tipo_entrega === "entrega" ? "ENTREGA" : "RETIRADA";

  const linhaItens = [
    `<div class="item-nome">${semAcento(pedido.tipo_prato)} ${pedido.tamanho}</div>`,
    pedido.misturas
      ? `<div class="det"><span class="det-cat">MISTURA</span><span class="det-val">${semAcento(pedido.misturas)}</span></div>`
      : "",
    pedido.acompanhamentos
      ? `<div class="det"><span class="det-cat">ACOMP</span><span class="det-val">${semAcento(pedido.acompanhamentos)}</span></div>`
      : "",
    ...itens.map(
      (i) =>
        `<div class="det"><span class="det-cat">${i.tipo === "bebida" ? "BEBIDA" : "ADICIONAL"}</span><span class="det-val">${semAcento(i.nome)} — ${fmt(i.preco)}</span></div>`,
    ),
    pedido.obs ? `<div class="obs">OBS: ${semAcento(pedido.obs)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  function via(titulo, mostrarTotal) {
    return `
    <div class="via">
      <div class="cabecalho">
        <div class="restaurante">O CAIPIRA</div>
        <div class="tipo">${tipoLabel}</div>
        <div class="subtipo">${titulo}</div>
        <div class="hora-txt">${data} — ${agora}</div>
      </div>
      <div class="cliente">${semAcento(pedido.cliente_nome)}</div>
      ${pedido.bairro ? `<div class="bairro">BAIRRO: ${semAcento(pedido.bairro)}</div>` : ""}
      ${pedido.endereco ? `<div class="end">${semAcento(pedido.endereco)}</div>` : ""}
      ${pedido.horario ? `<div class="hora-ent">HORARIO: ${pedido.horario}</div>` : ""}
      <div class="itens">${linhaItens}</div>
      ${
        mostrarTotal
          ? `
      <div class="rodape">
        <div class="total-label">TOTAL</div>
        <div class="total-val">${fmt(pedido.total)}</div>
        ${pedido.taxa_entrega > 0 ? `<div class="taxa">incl. taxa ${fmt(pedido.taxa_entrega)}</div>` : ""}
      </div>`
          : ""
      }
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pedido WPP</title>
  <style>
    @media print { @page { margin: 2mm; } .pagebreak { page-break-after: always; } }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Courier New',monospace; width:72mm; padding:3mm; background:#fff; color:#000; }
    .cabecalho { text-align:center; border-bottom:3px solid #000; padding-bottom:10px; margin-bottom:14px; }
    .restaurante { font-size:20px; font-weight:900; letter-spacing:3px; }
    .tipo { font-size:30px; font-weight:900; margin:6px 0 2px; }
    .subtipo { font-size:13px; font-weight:700; letter-spacing:2px; border:2px solid #000; display:inline-block; padding:2px 8px; margin-top:4px; }
    .hora-txt { font-size:13px; color:#333; margin-top:6px; }
    .cliente { font-size:26px; font-weight:900; text-transform:uppercase; margin:10px 0 6px; border-bottom:2px dashed #000; padding-bottom:6px; }
    .bairro { font-size:20px; font-weight:900; margin:6px 0 3px; }
    .end { font-size:16px; font-weight:700; color:#333; margin-bottom:3px; }
    .hora-ent { font-size:16px; font-weight:700; margin-bottom:8px; }
    .itens { border-top:3px solid #000; padding-top:12px; margin-top:10px; }
    .item-nome { font-size:24px; font-weight:900; text-transform:uppercase; margin-bottom:10px; border-bottom:2px solid #000; padding-bottom:6px; }
    .det { margin-top:10px; }
    .det-cat { display:block; font-size:13px; font-weight:900; letter-spacing:2px; color:#555; margin-bottom:3px; }
    .det-val { display:block; font-size:20px; font-weight:900; text-transform:uppercase; line-height:1.4; }
    .obs { font-size:18px; font-weight:900; border:3px solid #000; padding:8px; margin-top:12px; text-transform:uppercase; line-height:1.4; }
    .rodape { border-top:3px solid #000; margin-top:14px; padding-top:10px; }
    .total-label { font-size:14px; color:#333; text-transform:uppercase; letter-spacing:1px; }
    .total-val { font-size:30px; font-weight:900; margin:4px 0; }
    .taxa { font-size:13px; color:#555; }
    .pagebreak { border-top:4px dashed #aaa; margin:16px 0; }
  </style>
</head>
<body>
  ${via("VIA COZINHA", false)}
  <div class="pagebreak"></div>
  ${via("VIA ENTREGA", true)}
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

export default function WhatsApp() {
  const [pedidos, setPedidos] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [bebidas, setBebidas] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [pedidoAtivo, setPedidoAtivo] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [conferidos, setConferidos] = useState(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem(`wpp_conf_${hoje()}`) || "[]"),
      );
    } catch {
      return new Set();
    }
  });

  function toggleConferido(id) {
    setConferidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(`wpp_conf_${hoje()}`, JSON.stringify([...next]));
      return next;
    });
  }

  const [form, setForm] = useState({
    cliente_nome: "",
    tipo_prato: "Marmitex",
    tamanho: "M",
    misturas: [],
    acomp_sel: [],
    adicionais_sel: [],
    bebidas_sel: [],
    tipo_entrega: "retirada",
    bairro: "",
    taxa_entrega: 0,
    endereco: "",
    horario: "",
    obs: "",
  });

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const [{ data: ped }, { data: card }, { data: estq }, { data: bairr }] =
      await Promise.all([
        sb
          .from("wpp_pedidos")
          .select("*, wpp_itens(*)")
          .eq("data", hoje())
          .order("created_at", { ascending: false }),
        sb.from("cardapio_dia").select("*").eq("data", hoje()).order("tipo"),
        sb
          .from("estoque")
          .select("*")
          .eq("cat", "Bebidas")
          .gt("qty", 0)
          .order("nome"),
        sb.from("bairros_entrega").select("*"),
      ]);
    if (ped) setPedidos(ped);
    if (card) setCardapio(card);
    if (estq) setBebidas(estq);
    if (bairr) setBairros(bairr);
    setLoading(false);
  }

  const misturasDia = cardapio.filter((c) => c.tipo === "mistura");
  const acompDia = cardapio.filter((c) => c.tipo === "acompanhamento");
  const adicionaisDia = cardapio.filter((c) => c.tipo === "adicional");

  // ── tipos de prato filtrados por entrega ──
  // entrega → só Marmitex | retirada → todos
  const tiposDisponiveis = TIPOS_PRATO.filter(
    (t) =>
      t.local.includes("whatsapp") &&
      (form.tipo_entrega === "retirada" || t.key === "Marmitex"),
  );

  function toggleMistura(item) {
    const tam = TAMANHOS.find((t) => t.key === form.tamanho);
    const ehFeijoada = (item.nome || "").toLowerCase().includes("feijoada");
    const jaTemFeijoada = form.misturas.some((m) =>
      (m.nome || "").toLowerCase().includes("feijoada"),
    );

    // se já tem feijoada, não deixa adicionar outra mistura
    if (jaTemFeijoada && !ehFeijoada) {
      return alert("Feijoada é sozinha, não combina com outra mistura!");
    }

    // se selecionou feijoada e já tinha outra mistura, limpa e coloca só feijoada
    if (
      ehFeijoada &&
      form.misturas.length > 0 &&
      !form.misturas.find((m) => m.id === item.id)
    ) {
      return setForm((f) => ({ ...f, misturas: [item] }));
    }

    const jatem = form.misturas.find((m) => m.id === item.id);
    if (jatem) {
      setForm((f) => ({
        ...f,
        misturas: f.misturas.filter((m) => m.id !== item.id),
      }));
    } else if (form.misturas.length >= tam.misturas) {
      setForm((f) => ({ ...f, misturas: [...f.misturas.slice(1), item] }));
    } else {
      setForm((f) => ({ ...f, misturas: [...f.misturas, item] }));
    }
  }

  function toggleAcomp(item) {
    const base = form.acomp_sel.length === 0 ? acompDia : form.acomp_sel;
    const jatem = base.find((x) => x.id === item.id);
    if (jatem)
      setForm((f) => ({
        ...f,
        acomp_sel: base.filter((x) => x.id !== item.id),
      }));
    else setForm((f) => ({ ...f, acomp_sel: [...base, item] }));
  }

  function toggleItem(item, campo) {
    const jatem = form[campo].find((i) => i.id === item.id);
    if (jatem)
      setForm((f) => ({
        ...f,
        [campo]: f[campo].filter((i) => i.id !== item.id),
      }));
    else setForm((f) => ({ ...f, [campo]: [...f[campo], item] }));
  }

  async function criarPedido() {
    if (!form.cliente_nome.trim()) return alert("Nome do cliente obrigatório!");
    const tam = TAMANHOS.find((t) => t.key === form.tamanho);
    if (form.misturas.length === 0)
      return alert("Selecione pelo menos 1 mistura!");
    if (form.tipo_entrega === "entrega" && !form.bairro)
      return alert("Selecione o bairro!");
    if (form.tipo_entrega === "entrega" && !form.endereco.trim())
      return alert("Informe o endereço!");

    const acompSel = form.acomp_sel.length === 0 ? acompDia : form.acomp_sel;
    const precoBase = await getPreco(
      sb,
      form.tipo_prato,
      form.tamanho,
      form.misturas,
    );
    const totalAdic = form.adicionais_sel.reduce(
      (s, a) => s + (a.preco || 0),
      0,
    );
    const totalBeb = form.bebidas_sel.reduce(
      (s, b) => s + (b.preco_venda || 0),
      0,
    );
    const taxa =
      form.tipo_entrega === "entrega" ? Number(form.taxa_entrega) : 0;
    const total = precoBase + totalAdic + totalBeb + taxa;

    const { data, error } = await sb
      .from("wpp_pedidos")
      .insert({
        data: hoje(),
        cliente_nome: form.cliente_nome.trim(),
        tipo_prato: form.tipo_prato,
        tamanho: form.tamanho,
        misturas: form.misturas.map((m) => m.nome).join(", "),
        acompanhamentos: acompSel.map((a) => a.nome).join(", "),
        tipo_entrega: form.tipo_entrega,
        bairro: form.bairro,
        taxa_entrega: taxa,
        endereco: form.endereco,
        horario: form.horario,
        obs: form.obs,
        status: "aberto",
        total,
      })
      .select()
      .single();

    if (error) return alert("Erro: " + error.message);

    const itens = [
      ...form.adicionais_sel.map((a) => ({
        pedido_id: data.id,
        tipo: "adicional",
        nome: a.nome,
        preco: a.preco || 0,
      })),
      ...form.bebidas_sel.map((b) => ({
        pedido_id: data.id,
        tipo: "bebida",
        nome: b.nome,
        preco: b.preco_venda || 0,
      })),
    ];
    if (itens.length > 0) await sb.from("wpp_itens").insert(itens);

    imprimirPedidoWpp({ pedido: data, itens });
    await carregar();
    setPedidoAtivo({ ...data, wpp_itens: itens });
    setModal("ver");
    resetForm();
  }

  function resetForm() {
    setForm({
      cliente_nome: "",
      tipo_prato: "Marmitex",
      tamanho: "M",
      misturas: [],
      acomp_sel: [],
      adicionais_sel: [],
      bebidas_sel: [],
      tipo_entrega: "retirada",
      bairro: "",
      taxa_entrega: 0,
      endereco: "",
      horario: "",
      obs: "",
    });
  }

  async function mudarStatus(novoStatus) {
    await sb
      .from("wpp_pedidos")
      .update({ status: novoStatus })
      .eq("id", pedidoAtivo.id);
    await carregar();
    setPedidoAtivo((prev) => ({ ...prev, status: novoStatus }));
  }

  async function pagar(forma) {
    await sb
      .from("wpp_pedidos")
      .update({ status: "pago", forma_pagamento: forma })
      .eq("id", pedidoAtivo.id);
    await sb.from("financeiro").insert({
      tipo: "receita",
      descricao: `WhatsApp — ${pedidoAtivo.cliente_nome} (${pedidoAtivo.tipo_entrega === "entrega" ? "Entrega" : "Retirada"})`,
      valor: pedidoAtivo.total,
      categoria: "Vendas",
      pagamento: forma,
      data: hoje(),
      origem: "whatsapp",
    });
    await sb.from("vendas_dia").insert({
      data: hoje(),
      tipo_prato: pedidoAtivo.tipo_prato,
      tamanho: pedidoAtivo.tamanho,
      origem: "whatsapp",
      quantidade: 1,
    });
    await carregar();
    setModal(null);
    setPedidoAtivo(null);
  }

  async function cancelar() {
    if (!confirm("Cancelar pedido?")) return;
    await sb
      .from("wpp_pedidos")
      .update({ status: "cancelado" })
      .eq("id", pedidoAtivo.id);
    await carregar();
    setModal(null);
    setPedidoAtivo(null);
  }

  const filtrados = pedidos.filter((p) =>
    filtro === "todos" ? true : p.status === filtro,
  );
  const totalDia = pedidos
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + p.total, 0);
  const emEntrega = pedidos.filter((p) => p.status === "saiu").length;
  const tam = TAMANHOS.find((t) => t.key === form.tamanho);

  if (loading)
    return (
      <Layout title="WhatsApp">
        <div className="loading-overlay">
          <div className="loading-icon">📱</div>
          <div className="loading-txt">Carregando...</div>
        </div>
      </Layout>
    );

  return (
    <Layout title="WhatsApp">
      <div className="ph">
        <div>
          <h2>WhatsApp 📱</h2>
          <div className="ph-sub">Delivery e retiradas — {hoje()}</div>
        </div>
        <button
          className="btn btn-ora"
          onClick={() => {
            resetForm();
            setModal("novo");
          }}
        >
          + Novo Pedido
        </button>
      </div>

      <div
        className="sg"
        style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: "1.2rem" }}
      >
        <div className="sc">
          <div className="sc-glow" />
          <div className="sc-label">Pedidos Hoje</div>
          <div className="sc-val ora">{pedidos.length}</div>
        </div>
        <div className="sc">
          <div className="sc-label">Em Entrega 🛵</div>
          <div className="sc-val am">{emEntrega}</div>
        </div>
        <div className="sc">
          <div className="sc-glow" />
          <div className="sc-label">Total do Dia</div>
          <div className="sc-val vd">{R(totalDia)}</div>
        </div>
      </div>

      <div className="period-tabs" style={{ marginBottom: "1rem" }}>
        {[
          ["todos", "Todos"],
          ["aberto", "Abertos"],
          ["pago", "Pagos"],
          ["cancelado", "Cancelados"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={`ptab${filtro === v ? " active" : ""}`}
            onClick={() => setFiltro(v)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="comanda-grid">
        {filtrados.length === 0 && (
          <div className="empty" style={{ gridColumn: "1/-1" }}>
            <div className="empty-ico">📱</div>
            <div className="empty-title">Nenhum pedido</div>
          </div>
        )}
        {filtrados.map((p) => (
          <div
            key={p.id}
            className={`comanda-card ${p.status}`}
            style={{
              borderTop: `3px solid ${p.tipo_entrega === "entrega" ? "#25D366" : "var(--azul)"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".4rem",
                    marginBottom: ".3rem",
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>
                    {p.tipo_entrega === "entrega" ? "🛵" : "🏃"}
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: ".85rem",
                      color:
                        p.tipo_entrega === "entrega"
                          ? "#25D366"
                          : "var(--azul)",
                    }}
                  >
                    {p.tipo_entrega === "entrega" ? "ENTREGA" : "RETIRADA"}
                  </span>
                </div>
                <div style={{ fontWeight: 700 }}>{p.cliente_nome}</div>
                <div
                  style={{
                    fontSize: ".78rem",
                    color: "var(--txt)",
                    marginTop: ".2rem",
                  }}
                >
                  {TIPOS_PRATO.find((t) => t.key === p.tipo_prato)?.ico}{" "}
                  {p.tipo_prato} {p.tamanho} · {p.misturas}
                </div>
                {p.acompanhamentos && (
                  <div style={{ fontSize: ".72rem", color: "var(--azul)" }}>
                    🍚 {p.acompanhamentos}
                  </div>
                )}
                {p.bairro && (
                  <div style={{ fontSize: ".72rem", color: "var(--txt)" }}>
                    📍 {p.bairro}
                  </div>
                )}
                {p.horario && (
                  <div style={{ fontSize: ".72rem", color: "var(--amar)" }}>
                    🕐 {p.horario}
                  </div>
                )}
              </div>
              <span className={`badge ${statusPedido(p.status).cls}`}>
                {statusPedido(p.status).label}
              </span>
            </div>
            {p.obs && (
              <div style={{ fontSize: ".73rem", color: "var(--amar)" }}>
                ⚠️ {p.obs}
              </div>
            )}
            <div className="comanda-footer">
              <div className="comanda-total">{R(p.total)}</div>
              <button
                className="btn btn-ora btn-sm"
                onClick={() => {
                  setPedidoAtivo(p);
                  setModal("ver");
                }}
              >
                Abrir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── CONFERÊNCIA DE ENTREGAS ── */}
      {pedidos.filter((p) => p.tipo_entrega === "entrega").length > 0 && (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <div className="panel-hd">
            <div className="panel-title">🛵 Conferência de Entregas</div>
            <div style={{ fontSize: ".78rem", color: "var(--txt)" }}>
              {
                pedidos.filter(
                  (p) => p.tipo_entrega === "entrega" && conferidos.has(p.id),
                ).length
              }
              /{pedidos.filter((p) => p.tipo_entrega === "entrega").length}{" "}
              conferidos
            </div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
          >
            {pedidos
              .filter((p) => p.tipo_entrega === "entrega")
              .map((p) => {
                const conf = conferidos.has(p.id);
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".8rem",
                      padding: ".65rem .8rem",
                      borderRadius: 8,
                      background: conf ? "rgba(39,174,96,.08)" : "var(--c2)",
                      border: `1px solid ${conf ? "rgba(39,174,96,.3)" : "var(--c3)"}`,
                      opacity: conf ? 0.65 : 1,
                      transition: "all .2s",
                    }}
                  >
                    <button
                      onClick={() => toggleConferido(p.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: `2px solid ${conf ? "#27ae60" : "var(--c3)"}`,
                        background: conf ? "#27ae60" : "transparent",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: "1rem",
                        cursor: "pointer",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {conf ? "✓" : ""}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: ".88rem" }}>
                        {p.cliente_nome}
                      </div>
                      <div style={{ fontSize: ".73rem", color: "var(--txt)" }}>
                        {p.bairro && `📍 ${p.bairro}`}
                        {p.endereco && ` — ${p.endereco}`}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 700,
                        fontSize: ".88rem",
                        color: conf ? "#27ae60" : "var(--ora)",
                        flexShrink: 0,
                      }}
                    >
                      {R(p.total)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── MODAL NOVO ── */}
      <Modal
        open={modal === "novo"}
        onClose={() => {
          setModal(null);
          resetForm();
        }}
        title="Novo Pedido WhatsApp 📱"
        actions={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setModal(null);
                resetForm();
              }}
            >
              Cancelar
            </button>
            <button className="btn btn-ora" onClick={criarPedido}>
              Registrar
            </button>
          </>
        }
      >
        <div className="fg">
          <label>Nome do Cliente *</label>
          <input
            type="text"
            placeholder="Ex: Maria"
            value={form.cliente_nome}
            onChange={(e) =>
              setForm((f) => ({ ...f, cliente_nome: e.target.value }))
            }
          />
        </div>

        <div className="fg">
          <label>Tipo de Entrega</label>
          <div style={{ display: "flex", gap: ".6rem" }}>
            <button
              className={`btn ${form.tipo_entrega === "retirada" ? "btn-az" : "btn-ghost"}`}
              style={{ flex: 1 }}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  tipo_entrega: "retirada",
                  bairro: "",
                  taxa_entrega: 0,
                  endereco: "",
                  // se mudar para retirada, libera todos os tipos
                  tipo_prato: f.tipo_prato,
                }))
              }
            >
              🏃 Retirada no Balcão
            </button>
            <button
              className={`btn ${form.tipo_entrega === "entrega" ? "btn-vd" : "btn-ghost"}`}
              style={{ flex: 1 }}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  tipo_entrega: "entrega",
                  // se mudar para entrega, força Marmitex
                  tipo_prato: "Marmitex",
                  misturas: [],
                }))
              }
            >
              🛵 Entrega
            </button>
          </div>
        </div>

        {form.tipo_entrega === "entrega" && (
          <div
            style={{
              background: "rgba(37,211,102,.06)",
              border: "1px solid rgba(37,211,102,.2)",
              borderRadius: 10,
              padding: "1rem",
              marginBottom: ".8rem",
            }}
          >
            <div
              style={{
                fontSize: ".75rem",
                fontWeight: 700,
                color: "#25D366",
                textTransform: "uppercase",
                marginBottom: ".8rem",
              }}
            >
              🛵 Informações de Entrega
            </div>
            <div className="fg">
              <label>Bairro *</label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: ".4rem",
                  marginBottom: ".5rem",
                }}
              >
                {bairros.map((b) => (
                  <button
                    key={b.id}
                    className={`btn btn-sm ${form.bairro === b.nome ? "btn-vd" : "btn-ghost"}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        bairro: b.nome,
                        taxa_entrega: b.taxa,
                      }))
                    }
                  >
                    {b.nome} — {R(b.taxa)}
                  </button>
                ))}
              </div>
              {form.bairro && (
                <div
                  style={{
                    fontSize: ".8rem",
                    color: "#25D366",
                    fontFamily: "var(--mono)",
                  }}
                >
                  Taxa: {R(form.taxa_entrega)}
                </div>
              )}
            </div>
            <div className="form-row">
              <div className="fg">
                <label>Endereço *</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro..."
                  value={form.endereco}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endereco: e.target.value }))
                  }
                />
              </div>
              <div className="fg">
                <label>Horário (opcional)</label>
                <input
                  type="time"
                  value={form.horario}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, horario: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Tipo de prato — filtrado por entrega/retirada */}
        <div className="fg">
          <label>
            Tipo de Prato{" "}
            {form.tipo_entrega === "entrega" && (
              <span
                style={{
                  fontSize: ".72rem",
                  color: "var(--txt)",
                  fontWeight: 400,
                }}
              >
                (só Marmitex para entrega)
              </span>
            )}
          </label>
          <div style={{ display: "flex", gap: ".5rem" }}>
            {tiposDisponiveis.map((t) => (
              <button
                key={t.key}
                className={`btn ${form.tipo_prato === t.key ? "btn-ora" : "btn-ghost"}`}
                style={{
                  flex: 1,
                  flexDirection: "column",
                  gap: ".2rem",
                  padding: ".8rem .4rem",
                }}
                onClick={() =>
                  setForm((f) => ({ ...f, tipo_prato: t.key, misturas: [] }))
                }
              >
                <span style={{ fontSize: "1.2rem" }}>{t.ico}</span>
                <span style={{ fontSize: ".7rem", fontWeight: 700 }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="fg">
          <label>Tamanho</label>
          <div style={{ display: "flex", gap: ".6rem" }}>
            {TAMANHOS.map((t) => (
              <button
                key={t.key}
                className={`btn ${form.tamanho === t.key ? "btn-ora" : "btn-ghost"}`}
                style={{
                  flex: 1,
                  flexDirection: "column",
                  gap: ".2rem",
                  padding: ".8rem .4rem",
                }}
                onClick={() =>
                  setForm((f) => ({ ...f, tamanho: t.key, misturas: [] }))
                }
              >
                <span style={{ fontWeight: 800 }}>{t.key}</span>
                <span style={{ fontSize: ".62rem", opacity: 0.7 }}>
                  {t.label}
                </span>
                <span style={{ fontSize: ".6rem", opacity: 0.6 }}>
                  {t.key === "G" ? "2 mist." : "1 ou 2 mist."}
                </span>
              </button>
            ))}
          </div>
        </div>

        {acompDia.length > 0 && (
          <div className="fg">
            <label>🍚 Acompanha (desmarque o que não quer)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {acompDia.map((a) => {
                const base =
                  form.acomp_sel.length === 0 ? acompDia : form.acomp_sel;
                const sel = base.find((x) => x.id === a.id);
                return (
                  <button
                    key={a.id}
                    className={`btn btn-sm ${sel ? "btn-az" : "btn-ghost"}`}
                    style={{ opacity: sel ? 1 : 0.5 }}
                    onClick={() => toggleAcomp(a)}
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
          <label>
            Mistura{tam.misturas > 1 ? "s" : ""} ({form.misturas.length}/
            {tam.misturas})
          </label>
          {misturasDia.length === 0 ? (
            <div style={{ color: "var(--amar)", fontSize: ".82rem" }}>
              ⚠️ Configure o cardápio do dia primeiro!
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {misturasDia.map((m) => {
                const sel = form.misturas.find((x) => x.id === m.id);
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

        {adicionaisDia.length > 0 && (
          <div className="fg">
            <label>➕ Adicionais</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {adicionaisDia.map((a) => {
                const sel = form.adicionais_sel.find((x) => x.id === a.id);
                return (
                  <button
                    key={a.id}
                    className={`btn btn-sm ${sel ? "btn-vd" : "btn-ghost"}`}
                    onClick={() => toggleItem(a, "adicionais_sel")}
                  >
                    {sel ? "✓ " : "+"} {a.nome}{" "}
                    {a.preco ? `+${R(a.preco)}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {bebidas.length > 0 && (
          <div className="fg">
            <label>🥤 Bebidas</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
              {bebidas.map((b) => {
                const sel = form.bebidas_sel.find((x) => x.id === b.id);
                return (
                  <button
                    key={b.id}
                    className={`btn btn-sm ${sel ? "btn-az" : "btn-ghost"}`}
                    onClick={() => toggleItem(b, "bebidas_sel")}
                  >
                    {sel ? "✓ " : "+"} {b.nome}{" "}
                    {b.preco_venda ? `+${R(b.preco_venda)}` : ""}
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
            placeholder="Observações especiais..."
            value={form.obs}
            onChange={(e) => setForm((f) => ({ ...f, obs: e.target.value }))}
          />
        </div>
      </Modal>

      {/* ── MODAL VER ── */}
      <Modal
        open={modal === "ver" && !!pedidoAtivo}
        onClose={() => {
          setModal(null);
          setPedidoAtivo(null);
        }}
        title={`Pedido — ${pedidoAtivo?.cliente_nome}`}
      >
        {pedidoAtivo && (
          <>
            <div
              style={{
                background:
                  pedidoAtivo.tipo_entrega === "entrega"
                    ? "rgba(37,211,102,.08)"
                    : "rgba(59,130,246,.08)",
                border: `1px solid ${pedidoAtivo.tipo_entrega === "entrega" ? "rgba(37,211,102,.3)" : "rgba(59,130,246,.3)"}`,
                borderRadius: 10,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".6rem",
                  marginBottom: ".4rem",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>
                  {pedidoAtivo.tipo_entrega === "entrega" ? "🛵" : "🏃"}
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    color:
                      pedidoAtivo.tipo_entrega === "entrega"
                        ? "#25D366"
                        : "var(--azul)",
                  }}
                >
                  {pedidoAtivo.tipo_entrega === "entrega"
                    ? "ENTREGA"
                    : "RETIRADA NO BALCÃO"}
                </span>
              </div>
              <div style={{ fontWeight: 700 }}>{pedidoAtivo.cliente_nome}</div>
              <div
                style={{
                  fontSize: ".83rem",
                  color: "var(--txt)",
                  marginTop: ".2rem",
                }}
              >
                {TIPOS_PRATO.find((t) => t.key === pedidoAtivo.tipo_prato)?.ico}{" "}
                {pedidoAtivo.tipo_prato} {pedidoAtivo.tamanho} ·{" "}
                {pedidoAtivo.misturas}
              </div>
              {pedidoAtivo.acompanhamentos && (
                <div
                  style={{
                    fontSize: ".78rem",
                    color: "var(--azul)",
                    marginTop: ".2rem",
                  }}
                >
                  🍚 {pedidoAtivo.acompanhamentos}
                </div>
              )}
              {pedidoAtivo.bairro && (
                <div style={{ fontSize: ".8rem", marginTop: ".3rem" }}>
                  📍 {pedidoAtivo.bairro}
                </div>
              )}
              {pedidoAtivo.endereco && (
                <div style={{ fontSize: ".78rem", color: "var(--txt)" }}>
                  {pedidoAtivo.endereco}
                </div>
              )}
              {pedidoAtivo.horario && (
                <div style={{ fontSize: ".78rem", color: "var(--amar)" }}>
                  🕐 {pedidoAtivo.horario}
                </div>
              )}
            </div>

            {pedidoAtivo.obs && (
              <div
                style={{
                  background: "rgba(241,196,15,.1)",
                  borderRadius: 8,
                  padding: ".6rem 1rem",
                  marginBottom: "1rem",
                  fontSize: ".83rem",
                  color: "var(--amar)",
                }}
              >
                ⚠️ {pedidoAtivo.obs}
              </div>
            )}

            {(pedidoAtivo.wpp_itens || []).length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                {pedidoAtivo.wpp_itens.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: ".83rem",
                      padding: ".35rem 0",
                      borderBottom: "1px solid var(--c3)",
                    }}
                  >
                    <span>
                      {item.tipo === "bebida" ? "🥤" : "➕"} {item.nome}
                    </span>
                    <span style={{ fontFamily: "var(--mono)" }}>
                      {R(item.preco)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {pedidoAtivo.taxa_entrega > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: ".85rem",
                  color: "#25D366",
                  fontFamily: "var(--mono)",
                  marginBottom: ".3rem",
                }}
              >
                <span>Taxa de entrega</span>
                <span>+ {R(pedidoAtivo.taxa_entrega)}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
                fontSize: "1.1rem",
                padding: ".8rem 0",
                borderTop: "2px solid var(--c3)",
                marginBottom: "1rem",
              }}
            >
              <span>Total</span>
              <span style={{ color: "var(--ora)", fontFamily: "var(--mono)" }}>
                {R(pedidoAtivo.total)}
              </span>
            </div>

            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {pedidoAtivo.status === "aberto" && (
                <button
                  className="btn btn-vd btn-sm"
                  onClick={() => mudarStatus("pronto")}
                >
                  ✅ Pronto
                </button>
              )}
              {pedidoAtivo.status === "pronto" &&
                pedidoAtivo.tipo_entrega === "entrega" && (
                  <button
                    className="btn btn-az btn-sm"
                    onClick={() => mudarStatus("saiu")}
                  >
                    🛵 Saiu para entrega
                  </button>
                )}
              {["aberto", "pronto", "saiu"].includes(pedidoAtivo.status) && (
                <BotoesPagamento onPagar={pagar} />
              )}
              {pedidoAtivo.status !== "pago" && (
                <button className="btn btn-vm btn-sm" onClick={cancelar}>
                  Cancelar
                </button>
              )}
            </div>
          </>
        )}
      </Modal>
    </Layout>
  );
}
