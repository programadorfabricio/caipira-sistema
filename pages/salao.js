// pages/salao.js — 🍽️ Gerenciamento do Salão

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Modal from "@/components/Modal";
import BotoesPagamento from "@/components/BotoesPagamento";
import { sb } from "@/lib/supabase";
import { R, hoje, TIPOS_PRATO } from "@/lib/helpers";

export default function Salao() {
  const [mesas, setMesas] = useState([]);
  const [comandas, setComandas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesaAtiva, setMesaAtiva] = useState(null);
  const [modal, setModal] = useState(null);
  const [aba, setAba] = useState("mesas"); // 'mesas' | 'historico'

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const [{ data: ms }, { data: cmd }, { data: hist }] = await Promise.all([
      sb.from("mesas").select("*").order("numero"),
      sb
        .from("comandas")
        .select("*, comanda_itens(*)")
        .eq("data", hoje())
        .in("status", ["aberta", "pronta"])
        .order("created_at"),
      sb
        .from("comandas")
        .select("*, comanda_itens(*)")
        .eq("data", hoje())
        .order("created_at", { ascending: false }),
    ]);
    if (ms) setMesas(ms);
    if (cmd) setComandas(cmd);
    if (hist) setHistorico(hist);
    setLoading(false);
  }

  function abrirMesa(mesa) {
    setMesaAtiva(mesa);
    setModal("mesa");
  }

  const comandasDaMesa = mesaAtiva
    ? comandas.filter((c) => String(c.mesa) === String(mesaAtiva.numero))
    : [];

  const totalMesa = comandasDaMesa.reduce(
    (s, c) => s + Number(c.total || 0),
    0,
  );

  async function fecharConta(forma) {
    if (comandasDaMesa.length === 0)
      return alert("Nenhuma comanda aberta nessa mesa!");

    // atualiza todas as comandas da mesa para pagas
    for (const cmd of comandasDaMesa) {
      await sb
        .from("comandas")
        .update({
          status: "paga",
          forma_pagamento: forma,
        })
        .eq("id", cmd.id);
    }

    // lança no financeiro
    await sb.from("financeiro").insert({
      tipo: "receita",
      descricao: `Mesa ${mesaAtiva.numero} — fechamento`,
      valor: totalMesa,
      categoria: "Vendas",
      pagamento: forma,
      data: hoje(),
      origem: "salao",
    });

    // libera a mesa
    await sb
      .from("mesas")
      .update({ status: "livre" })
      .eq("numero", mesaAtiva.numero);

    await carregar();
    setModal(null);
    setMesaAtiva(null);
  }

  async function fecharSemPagar() {
    if (!confirm("Fechar mesa sem registrar pagamento?")) return;
    for (const cmd of comandasDaMesa) {
      await sb.from("comandas").update({ status: "paga" }).eq("id", cmd.id);
    }
    await sb
      .from("mesas")
      .update({ status: "livre" })
      .eq("numero", mesaAtiva.numero);
    await carregar();
    setModal(null);
    setMesaAtiva(null);
  }

  // historico agrupado por mesa
  const historicoMesas = {};
  historico.forEach((c) => {
    const m = c.mesa || "sem mesa";
    if (!historicoMesas[m]) historicoMesas[m] = [];
    historicoMesas[m].push(c);
  });

  if (loading)
    return (
      <Layout title="Salão">
        <div className="loading-overlay">
          <div className="loading-icon">🍽️</div>
          <div className="loading-txt">Carregando...</div>
        </div>
      </Layout>
    );

  return (
    <Layout title="Salão">
      <div className="ph">
        <div>
          <h2>Salão 🍽️</h2>
          <div className="ph-sub">
            {mesas.filter((m) => m.status === "ocupada").length} mesa(s)
            ocupada(s) de {mesas.length}
          </div>
        </div>
      </div>

      {/* abas */}
      <div className="ft-tabs" style={{ marginBottom: "1.5rem" }}>
        <button
          className={`ft-tab ${aba === "mesas" ? "ativo" : ""}`}
          onClick={() => setAba("mesas")}
        >
          🍽️ Mesas
        </button>
        <button
          className={`ft-tab ${aba === "historico" ? "ativo" : ""}`}
          onClick={() => setAba("historico")}
        >
          📋 Histórico do Dia
        </button>
      </div>

      {/* ── ABA MESAS ── */}
      {aba === "mesas" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "1rem",
          }}
        >
          {mesas.map((mesa) => {
            const cmdsMesa = comandas.filter(
              (c) => String(c.mesa) === String(mesa.numero),
            );
            const totalM = cmdsMesa.reduce(
              (s, c) => s + Number(c.total || 0),
              0,
            );
            const ocupada = mesa.status === "ocupada";
            return (
              <div
                key={mesa.id}
                onClick={() => ocupada && abrirMesa(mesa)}
                style={{
                  background: ocupada ? "rgba(255,106,0,.08)" : "var(--c2)",
                  border: `2px solid ${ocupada ? "var(--ora)" : "var(--c3)"}`,
                  borderRadius: 14,
                  padding: "1.2rem 1rem",
                  cursor: ocupada ? "pointer" : "default",
                  transition: "all .2s",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: ".3rem" }}>
                  {ocupada ? "🔴" : "🟢"}
                </div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: "1.3rem",
                    color: ocupada ? "var(--ora)" : "var(--txt)",
                  }}
                >
                  Mesa {mesa.numero}
                </div>
                <div
                  style={{
                    fontSize: ".75rem",
                    color: "var(--txt)",
                    marginTop: ".2rem",
                  }}
                >
                  {ocupada ? `${cmdsMesa.length} comanda(s)` : "Livre"}
                </div>
                {ocupada && totalM > 0 && (
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontWeight: 800,
                      color: "var(--ora)",
                      marginTop: ".4rem",
                      fontSize: ".9rem",
                    }}
                  >
                    {R(totalM)}
                  </div>
                )}
                {ocupada && (
                  <div
                    style={{
                      fontSize: ".7rem",
                      color: "var(--txt)",
                      marginTop: ".3rem",
                      opacity: 0.7,
                    }}
                  >
                    Clique para abrir
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba === "historico" && (
        <div>
          {Object.keys(historicoMesas).length === 0 && (
            <div className="empty">
              <div className="empty-ico">📋</div>
              <div className="empty-title">Nenhum registro hoje</div>
            </div>
          )}
          {Object.entries(historicoMesas)
            .sort()
            .map(([mesa, cmds]) => {
              const total = cmds.reduce((s, c) => s + Number(c.total || 0), 0);
              return (
                <div
                  key={mesa}
                  className="panel"
                  style={{ marginBottom: "1rem" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                      Mesa {mesa}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 800,
                        color: "var(--ora)",
                      }}
                    >
                      {R(total)}
                    </div>
                  </div>
                  {cmds.map((cmd) => (
                    <div
                      key={cmd.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: ".6rem .8rem",
                        borderRadius: 8,
                        background: "var(--c2)",
                        marginBottom: ".4rem",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: ".88rem" }}>
                          {
                            TIPOS_PRATO.find((t) => t.key === cmd.tipo_prato)
                              ?.ico
                          }{" "}
                          {cmd.tipo_prato} {cmd.tamanho}
                        </div>
                        {cmd.misturas && (
                          <div
                            style={{ fontSize: ".75rem", color: "var(--txt)" }}
                          >
                            🍖 {cmd.misturas}
                          </div>
                        )}
                        {cmd.obs && (
                          <div
                            style={{ fontSize: ".72rem", color: "var(--amar)" }}
                          >
                            ⚠️ {cmd.obs}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: ".2rem",
                        }}
                      >
                        <span
                          className={`badge ${
                            cmd.status === "paga"
                              ? "badge-ok"
                              : cmd.status === "pronta"
                                ? "badge-info"
                                : cmd.status === "aberta"
                                  ? "badge-warn"
                                  : ""
                          }`}
                        >
                          {cmd.status === "paga"
                            ? "Paga"
                            : cmd.status === "pronta"
                              ? "Pronta"
                              : "Aberta"}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: ".82rem",
                            color: "var(--ora)",
                          }}
                        >
                          {R(cmd.total)}
                        </span>
                        {cmd.forma_pagamento && (
                          <span
                            style={{ fontSize: ".7rem", color: "var(--txt)" }}
                          >
                            {cmd.forma_pagamento}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
        </div>
      )}

      {/* ── MODAL MESA ── */}
      <Modal
        open={modal === "mesa" && !!mesaAtiva}
        onClose={() => {
          setModal(null);
          setMesaAtiva(null);
        }}
        title={`Mesa ${mesaAtiva?.numero} 🍽️`}
      >
        {mesaAtiva && (
          <>
            {comandasDaMesa.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--txt)",
                  padding: "1rem 0",
                }}
              >
                Nenhuma comanda aberta nessa mesa.
              </div>
            ) : (
              <>
                {/* lista de comandas */}
                {comandasDaMesa.map((cmd, idx) => (
                  <div
                    key={cmd.id}
                    style={{
                      background: "var(--c2)",
                      borderRadius: 10,
                      padding: ".8rem 1rem",
                      marginBottom: ".6rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: ".4rem",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: ".9rem" }}>
                        {TIPOS_PRATO.find((t) => t.key === cmd.tipo_prato)?.ico}{" "}
                        {cmd.tipo_prato} {cmd.tamanho}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          color: "var(--ora)",
                          fontWeight: 700,
                        }}
                      >
                        {R(cmd.total)}
                      </span>
                    </div>
                    {cmd.misturas && (
                      <div style={{ fontSize: ".78rem", color: "var(--txt)" }}>
                        🍖 {cmd.misturas}
                      </div>
                    )}
                    {cmd.acompanhamentos && (
                      <div style={{ fontSize: ".75rem", color: "var(--azul)" }}>
                        🍚 {cmd.acompanhamentos}
                      </div>
                    )}
                    {cmd.base && (
                      <div style={{ fontSize: ".75rem", color: "var(--txt)" }}>
                        🍚 {cmd.base}
                      </div>
                    )}
                    {cmd.salada && (
                      <div
                        style={{ fontSize: ".75rem", color: "var(--verde)" }}
                      >
                        🥬 {cmd.salada}
                      </div>
                    )}
                    {cmd.obs && (
                      <div
                        style={{
                          fontSize: ".75rem",
                          color: "var(--amar)",
                          marginTop: ".3rem",
                        }}
                      >
                        ⚠️ {cmd.obs}
                      </div>
                    )}
                    {(cmd.comanda_itens || []).length > 0 && (
                      <div
                        style={{
                          marginTop: ".5rem",
                          borderTop: "1px solid var(--c3)",
                          paddingTop: ".5rem",
                        }}
                      >
                        {cmd.comanda_itens.map((item, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: ".78rem",
                              color: "var(--txt)",
                            }}
                          >
                            <span>
                              • {item.quantidade}x {item.nome}
                            </span>
                            <span style={{ fontFamily: "var(--mono)" }}>
                              {R(item.preco_unitario)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {cmd.forma_pagamento && (
                      <div
                        style={{
                          fontSize: ".7rem",
                          color: "var(--verde)",
                          marginTop: ".3rem",
                        }}
                      >
                        💰 {cmd.forma_pagamento}
                      </div>
                    )}
                  </div>
                ))}

                {/* total */}
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
                  <span>Total da Mesa</span>
                  <span
                    style={{ color: "var(--ora)", fontFamily: "var(--mono)" }}
                  >
                    {R(totalMesa)}
                  </span>
                </div>

                {/* pagamento */}
                <div
                  style={{
                    fontSize: ".75rem",
                    color: "var(--txt)",
                    marginBottom: ".8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Fechar Conta
                </div>
                <BotoesPagamento onPagar={fecharConta} />
                <button
                  className="btn btn-ghost btn-sm"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: ".5rem",
                  }}
                  onClick={fecharSemPagar}
                >
                  💾 Fechar sem registrar pagamento
                </button>
              </>
            )}
          </>
        )}
      </Modal>

      <style>{`
        .ft-tabs { display:flex; gap:.5rem; margin-bottom:1.2rem; }
        .ft-tab {
          padding:.45rem 1.1rem; border-radius:8px; border:1px solid var(--c2);
          background:transparent; color:var(--txt); cursor:pointer;
          font-size:.82rem; font-weight:700; transition:all .15s;
        }
        .ft-tab.ativo { background:var(--ora); color:#fff; border-color:var(--ora); }
      `}</style>
    </Layout>
  );
}
