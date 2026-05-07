// pages/relatorios.js — 📋 Relatório de fechamento do dia

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { sb } from "@/lib/supabase";
import { R, hoje } from "@/lib/helpers";

export default function Relatorios() {
  const [data, setData] = useState(hoje());
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    buscar();
  }, [data]);

  async function buscar() {
    setLoading(true);
    const [
      { data: fin },
      { data: vendas },
      { data: salao },
      { data: balcao },
      { data: wpp },
    ] = await Promise.all([
      sb.from("financeiro").select("*").eq("data", data).order("created_at"),
      sb.from("vendas_dia").select("*").eq("data", data),
      sb
        .from("comandas")
        .select("status, total, forma_pagamento")
        .eq("data", data),
      sb
        .from("balcao_pedidos")
        .select("status, total, forma_pagamento")
        .eq("data", data),
      sb
        .from("wpp_pedidos")
        .select("status, total, forma_pagamento, tipo_entrega")
        .eq("data", data),
    ]);

    const receitas = (fin || []).filter((f) => f.tipo === "receita");
    const despesas = (fin || []).filter((f) => f.tipo === "despesa");
    const totalRec = receitas.reduce((s, f) => s + f.valor, 0);
    const totalDes = despesas.reduce((s, f) => s + f.valor, 0);

    // Por forma de pagamento
    const porPagamento = {};
    [...(salao || []), ...(balcao || []), ...(wpp || [])]
      .filter((p) => ["paga", "pago"].includes(p.status))
      .forEach((p) => {
        const pag = p.forma_pagamento || "Outros";
        porPagamento[pag] = (porPagamento[pag] || 0) + p.total;
      });

    // Vendas por tipo
    const porTipo = {};
    (vendas || []).forEach((v) => {
      const key = `${v.tipo_prato} ${v.tamanho}`;
      porTipo[key] = (porTipo[key] || 0) + v.quantidade;
    });

    // Por origem
    const porOrigem = {
      salao: (salao || [])
        .filter((p) => p.status === "paga")
        .reduce((s, p) => s + p.total, 0),
      balcao: (balcao || [])
        .filter((p) => p.status === "pago")
        .reduce((s, p) => s + p.total, 0),
      wpp: (wpp || [])
        .filter((p) => p.status === "pago")
        .reduce((s, p) => s + p.total, 0),
      entrega: (wpp || [])
        .filter((p) => p.status === "pago" && p.tipo_entrega === "entrega")
        .reduce((s, p) => s + p.total, 0),
    };

    setDados({
      receitas,
      despesas,
      totalRec,
      totalDes,
      lucro: totalRec - totalDes,
      porPagamento,
      porTipo,
      porOrigem,
      totalPratos: (vendas || []).reduce((s, v) => s + v.quantidade, 0),
      cancelados: [...(salao || []), ...(balcao || []), ...(wpp || [])].filter(
        (p) => ["cancelada", "cancelado"].includes(p.status),
      ).length,
    });
    setLoading(false);
  }

  function imprimir() {
    window.print();
  }

  return (
    <Layout title="Relatórios">
      <div className="ph">
        <div>
          <h2>Relatórios 📋</h2>
        </div>
        <div className="ph-actions">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            style={{
              padding: ".6rem .9rem",
              background: "var(--c2)",
              border: "1px solid var(--c3)",
              borderRadius: 8,
              color: "var(--branco)",
              fontFamily: "var(--mono)",
              fontSize: ".85rem",
              outline: "none",
            }}
          />
          <button className="btn btn-ghost btn-sm" onClick={imprimir}>
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {loading && (
        <div
          style={{ textAlign: "center", padding: "3rem", color: "var(--txt)" }}
        >
          Carregando...
        </div>
      )}

      {dados && !loading && (
        <>
          {/* Resumo financeiro */}
          <div className="sg" style={{ marginBottom: "1.5rem" }}>
            <div className="sc">
              <div className="sc-glow" />
              <div className="sc-label">Total Receitas</div>
              <div className="sc-val vd">{R(dados.totalRec)}</div>
            </div>
            <div className="sc">
              <div className="sc-label">Total Despesas</div>
              <div className="sc-val vm">{R(dados.totalDes)}</div>
            </div>
            <div className="sc">
              <div className="sc-glow" />
              <div className="sc-label">Lucro do Dia</div>
              <div className={`sc-val ${dados.lucro >= 0 ? "vd" : "vm"}`}>
                {R(dados.lucro)}
              </div>
            </div>
            <div className="sc">
              <div className="sc-label">Pratos Vendidos</div>
              <div className="sc-val ora">{dados.totalPratos}</div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {/* Por origem */}
            <div className="panel">
              <div className="panel-hd">
                <div className="panel-title">Vendas por Origem</div>
              </div>
              {[
                { label: "🍽️ Salão", val: dados.porOrigem.salao },
                { label: "🥡 Balcão", val: dados.porOrigem.balcao },
                { label: "📱 WhatsApp", val: dados.porOrigem.wpp },
                { label: "🛵 Entregas", val: dados.porOrigem.entrega },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: ".5rem 0",
                    borderBottom: "1px solid var(--c2)",
                    fontSize: ".85rem",
                  }}
                >
                  <span>{item.label}</span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontWeight: 700,
                      color: "var(--ora)",
                    }}
                  >
                    {R(item.val)}
                  </span>
                </div>
              ))}
            </div>

            {/* Por forma de pagamento */}
            <div className="panel">
              <div className="panel-hd">
                <div className="panel-title">Por Forma de Pagamento</div>
              </div>
              {Object.entries(dados.porPagamento).length === 0 ? (
                <div style={{ color: "var(--txt)", fontSize: ".85rem" }}>
                  Nenhum pagamento registrado
                </div>
              ) : (
                Object.entries(dados.porPagamento).map(([pag, val]) => (
                  <div
                    key={pag}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: ".5rem 0",
                      borderBottom: "1px solid var(--c2)",
                      fontSize: ".85rem",
                    }}
                  >
                    <span>{pag}</span>
                    <span
                      style={{ fontFamily: "var(--mono)", fontWeight: 700 }}
                    >
                      {R(val)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {/* Pratos mais vendidos */}
            <div className="panel">
              <div className="panel-hd">
                <div className="panel-title">Pratos Vendidos</div>
              </div>
              {Object.entries(dados.porTipo).length === 0 ? (
                <div style={{ color: "var(--txt)", fontSize: ".85rem" }}>
                  Nenhum prato vendido
                </div>
              ) : (
                Object.entries(dados.porTipo)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tipo, qtd]) => (
                    <div
                      key={tipo}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: ".5rem 0",
                        borderBottom: "1px solid var(--c2)",
                        fontSize: ".85rem",
                      }}
                    >
                      <span>{tipo}</span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontWeight: 700,
                          color: "var(--ora)",
                        }}
                      >
                        {qtd}x
                      </span>
                    </div>
                  ))
              )}
            </div>

            {/* Despesas */}
            <div className="panel">
              <div className="panel-hd">
                <div className="panel-title">Despesas do Dia</div>
              </div>
              {dados.despesas.length === 0 ? (
                <div style={{ color: "var(--txt)", fontSize: ".85rem" }}>
                  Nenhuma despesa lançada
                </div>
              ) : (
                dados.despesas.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: ".5rem 0",
                      borderBottom: "1px solid var(--c2)",
                      fontSize: ".85rem",
                    }}
                  >
                    <span style={{ color: "var(--txt)" }}>{d.descricao}</span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        color: "var(--verm)",
                        fontWeight: 600,
                      }}
                    >
                      -{R(d.valor)}
                    </span>
                  </div>
                ))
              )}
              {dados.despesas.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: ".6rem 0",
                    fontWeight: 800,
                    fontSize: ".9rem",
                  }}
                >
                  <span>Total despesas</span>
                  <span
                    style={{ fontFamily: "var(--mono)", color: "var(--verm)" }}
                  >
                    {R(dados.totalDes)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Resumo final */}
          <div
            className="panel"
            style={{
              background: "rgba(255,106,0,.05)",
              border: "1px solid rgba(255,106,0,.2)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: ".8rem",
                  color: "var(--txt)",
                  marginBottom: ".4rem",
                  fontFamily: "var(--mono)",
                }}
              >
                FECHAMENTO DO DIA —{" "}
                {new Date(data + "T12:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  color: dados.lucro >= 0 ? "var(--verde)" : "var(--verm)",
                  fontFamily: "var(--mono)",
                }}
              >
                {R(dados.lucro)}
              </div>
              <div
                style={{
                  fontSize: ".85rem",
                  color: "var(--txt)",
                  marginTop: ".3rem",
                }}
              >
                {dados.totalPratos} pratos vendidos · {dados.cancelados}{" "}
                cancelados
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
