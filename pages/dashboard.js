// pages/dashboard.js — 📊 Visão geral do dia

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { sb } from "@/lib/supabase";
import { R, hoje, TIPOS_PRATO } from "@/lib/helpers";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const [dados, setDados] = useState({
    mesasOcupadas: 0,
    totalMesas: 8,
    balcaoPendentes: 0,
    wppPendentes: 0,
    receitaHoje: 0,
    despesaHoje: 0,
    vendasHoje: [],
    estoqueAlertas: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const dataHoje = hoje();

    const [
      { data: mesas },
      { data: balcao },
      { data: wpp },
      { data: fin },
      { data: vendas },
      { data: estoque },
    ] = await Promise.all([
      sb.from("mesas").select("status"),
      sb
        .from("balcao_pedidos")
        .select("status")
        .eq("data", dataHoje)
        .in("status", ["aberto", "pronto"]),
      sb
        .from("wpp_pedidos")
        .select("status")
        .eq("data", dataHoje)
        .in("status", ["aberto", "pronto"]),
      sb.from("financeiro").select("tipo, valor").eq("data", dataHoje),
      sb
        .from("vendas_dia")
        .select("tipo_prato, tamanho, origem, quantidade")
        .eq("data", dataHoje),
      sb
        .from("estoque")
        .select("nome, qty, min")
        .lte("qty", "min")
        .order("qty"),
    ]);

    const receitaHoje = (fin || [])
      .filter((f) => f.tipo === "receita")
      .reduce((s, f) => s + f.valor, 0);
    const despesaHoje = (fin || [])
      .filter((f) => f.tipo === "despesa")
      .reduce((s, f) => s + f.valor, 0);

    // Agrupa vendas por tipo
    const vendasAgrupadas = {};
    (vendas || []).forEach((v) => {
      const key = `${v.tipo_prato} ${v.tamanho}`;
      vendasAgrupadas[key] = (vendasAgrupadas[key] || 0) + v.quantidade;
    });

    setDados({
      mesasOcupadas: (mesas || []).filter((m) => m.status === "ocupada").length,
      totalMesas: (mesas || []).length,
      balcaoPendentes: (balcao || []).length,
      wppPendentes: (wpp || []).length,
      receitaHoje,
      despesaHoje,
      vendasHoje: Object.entries(vendasAgrupadas).map(([k, v]) => ({
        nome: k,
        qtd: v,
      })),
      estoqueAlertas: estoque || [],
    });
    setLoading(false);
  }

  if (loading)
    return (
      <Layout title="Dashboard">
        <div className="loading-overlay">
          <div className="loading-icon">🌽</div>
          <div className="loading-txt">Carregando...</div>
        </div>
      </Layout>
    );

  const {
    mesasOcupadas,
    totalMesas,
    balcaoPendentes,
    wppPendentes,
    receitaHoje,
    despesaHoje,
    vendasHoje,
    estoqueAlertas,
  } = dados;

  return (
    <Layout title="Dashboard">
      <div className="ph">
        <div>
          <h2>Dashboard 📊</h2>
          <div className="ph-sub">
            Visão geral de hoje —{" "}
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={carregar}>
          🔄 Atualizar
        </button>
      </div>

      {/* Cards principais */}
      <div className="sg" style={{ marginBottom: "1.5rem" }}>
        <div
          className="sc"
          style={{ cursor: "pointer" }}
          onClick={() => router.push("/salao")}
        >
          <div className="sc-glow" />
          <div className="sc-label">Mesas Ocupadas</div>
          <div className="sc-val ora">
            {mesasOcupadas}/{totalMesas}
          </div>
          <div className="sc-detail">Clique para ver o salão →</div>
        </div>
        <div
          className="sc"
          style={{ cursor: "pointer" }}
          onClick={() => router.push("/balcao")}
        >
          <div className="sc-label">Balcão Pendentes</div>
          <div className={`sc-val ${balcaoPendentes > 0 ? "am" : "vd"}`}>
            {balcaoPendentes}
          </div>
          <div className="sc-detail">Clique para ver →</div>
        </div>
        <div
          className="sc"
          style={{ cursor: "pointer" }}
          onClick={() => router.push("/whatsapp")}
        >
          <div className="sc-label">WhatsApp Pendentes</div>
          <div className={`sc-val ${wppPendentes > 0 ? "am" : "vd"}`}>
            {wppPendentes}
          </div>
          <div className="sc-detail">Clique para ver →</div>
        </div>
        <div
          className="sc"
          style={{ cursor: "pointer" }}
          onClick={() => router.push("/financeiro")}
        >
          <div className="sc-glow" />
          <div className="sc-label">Receita Hoje</div>
          <div className="sc-val vd">{R(receitaHoje)}</div>
          <div className="sc-detail">Lucro: {R(receitaHoje - despesaHoje)}</div>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
      >
        {/* Vendas do dia */}
        <div className="panel">
          <div className="panel-hd">
            <div className="panel-title">Vendas de Hoje</div>
            <div className="panel-tag">
              {vendasHoje.reduce((s, v) => s + v.qtd, 0)} pratos
            </div>
          </div>
          {vendasHoje.length === 0 ? (
            <div style={{ color: "var(--txt)", fontSize: ".85rem" }}>
              Nenhuma venda registrada ainda.
            </div>
          ) : (
            vendasHoje.map((v, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: ".5rem 0",
                  borderBottom: "1px solid var(--c2)",
                  fontSize: ".85rem",
                }}
              >
                <span>{v.nome}</span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontWeight: 700,
                    color: "var(--ora)",
                  }}
                >
                  {v.qtd}x
                </span>
              </div>
            ))
          )}
        </div>

        {/* Alertas de estoque */}
        <div className="panel">
          <div className="panel-hd">
            <div className="panel-title">⚠️ Estoque Baixo</div>
            <div className="panel-tag">{estoqueAlertas.length} itens</div>
          </div>
          {estoqueAlertas.length === 0 ? (
            <div style={{ color: "var(--verde)", fontSize: ".85rem" }}>
              ✅ Estoque em dia!
            </div>
          ) : (
            estoqueAlertas.map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: ".5rem 0",
                  borderBottom: "1px solid var(--c2)",
                  fontSize: ".85rem",
                }}
              >
                <span>{e.nome}</span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    color: e.qty === 0 ? "var(--verm)" : "var(--amar)",
                    fontWeight: 700,
                  }}
                >
                  {e.qty === 0 ? "Esgotado" : `${e.qty} (mín: ${e.min})`}
                </span>
              </div>
            ))
          )}
          {estoqueAlertas.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: ".8rem", width: "100%" }}
              onClick={() => router.push("/estoque")}
            >
              Ver estoque completo →
            </button>
          )}
        </div>
      </div>

      {/* Acesso rápido */}
      <div style={{ marginTop: "1.5rem" }}>
        <div
          style={{
            fontSize: ".75rem",
            fontWeight: 700,
            color: "var(--txt)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
            marginBottom: ".8rem",
          }}
        >
          Acesso Rápido
        </div>
        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          {[
            { label: "🍽️ Salão", href: "/salao" },
            { label: "🥡 Balcão", href: "/balcao" },
            { label: "📱 WhatsApp", href: "/whatsapp" },
            { label: "👨‍🍳 Cozinha", href: "/cozinha" },
            { label: "💰 Financeiro", href: "/financeiro" },
            { label: "📦 Estoque", href: "/estoque" },
            { label: "📋 Relatórios", href: "/relatorios" },
            { label: "⚙️ Configurações", href: "/configuracoes" },
          ].map((item) => (
            <button
              key={item.href}
              className="btn btn-ghost btn-sm"
              onClick={() => router.push(item.href)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
