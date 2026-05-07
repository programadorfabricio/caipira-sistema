// pages/receitas.js — 📖 Receitas dos pratos + Ficha Técnica

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Modal from "@/components/Modal";
import { sb } from "@/lib/supabase";
import { R } from "@/lib/helpers";

const TIPOS_PRATO = ["Marmitex", "Prato Feito", "Feijoada"];
const TAMANHOS = ["P", "M", "G"];

export default function Receitas() {
  const [receitas, setReceitas]         = useState([]);
  const [estoque, setEstoque]           = useState([]);
  const [precos, setPrecos]             = useState([]);
  const [despesasMes, setDespesasMes]   = useState(0);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);
  const [receitaAtiva, setReceitaAtiva] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [aba, setAba]                   = useState("lista"); // "lista" | "ficha"
  const [markupGlobal, setMarkupGlobal] = useState(70);
  const [markupLocal, setMarkupLocal]   = useState({});    // { [receita_id]: number }

  const [form, setForm] = useState({
    nome: "",
    tipo_prato: "Marmitex",
    tamanho: "M",
  });
  const [ingForm, setIngForm] = useState({
    estoque_id: "",
    nome: "",
    quantidade: "",
    unit: "g",
    opcional: false,
  });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [{ data: rec }, { data: estq }, { data: prc }, { data: fin }] = await Promise.all([
      sb.from("receitas").select("*, receita_ingredientes(*)").order("tipo_prato").order("tamanho"),
      sb.from("estoque").select("*").order("nome"),
      sb.from("precos").select("*"),
      sb.from("financeiro").select("valor, tipo")
        .eq("tipo", "despesa")
        .gte("data", new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString().split("T")[0]),
    ]);
    if (rec)  setReceitas(rec);
    if (estq) setEstoque(estq);
    if (prc)  setPrecos(prc);
    if (fin)  setDespesasMes(fin.reduce((s, d) => s + Number(d.valor || 0), 0));
    setLoading(false);
  }

  // ── cálculos ──────────────────────────────────────────────────────────────
  function calcularCusto(ings) {
    return ings.reduce((total, ing) => {
      const item = estoque.find((e) => e.id === ing.estoque_id);
      if (!item || !item.preco_custo) return total;
      return total + ing.quantidade * item.preco_custo;
    }, 0);
  }

  function calcularFicha(receita) {
    const ings       = receita.receita_ingredientes || ingredientes;
    const custoIng   = calcularCusto(ings);
    const rateio     = despesasMes / Math.max(receitas.length, 1);
    const custoTotal = custoIng + rateio;
    const mkp        = markupLocal[receita.id] ?? markupGlobal;
    const sugerido   = mkp >= 100 ? 0 : custoTotal / (1 - mkp / 100);

    // preço cadastrado: busca por tipo_prato + tamanho na tabela precos
    const precoCad = precos.find(
      (p) =>
        p.tipo?.toLowerCase()    === receita.tipo_prato?.toLowerCase() &&
        p.tamanho?.toUpperCase() === receita.tamanho?.toUpperCase()
    );
    const precoCadValor = precoCad ? Number(precoCad.preco) : null;
    const margemReal    = precoCadValor
      ? ((precoCadValor - custoTotal) / precoCadValor) * 100
      : null;

    return { custoIng, rateio, custoTotal, mkp, sugerido, precoCadValor, margemReal };
  }

  // ── CRUD receita ──────────────────────────────────────────────────────────
  async function salvarReceita() {
    if (!form.nome.trim()) return alert("Nome obrigatório!");
    const { data, error } = await sb
      .from("receitas")
      .insert({ nome: form.nome.trim(), tipo_prato: form.tipo_prato, tamanho: form.tamanho })
      .select().single();
    if (error) return alert("Erro: " + error.message);
    setReceitaAtiva(data);
    setIngredientes([]);
    setModal("ingredientes");
    carregar();
  }

  async function deletarReceita(id) {
    if (!confirm("Remover receita?")) return;
    await sb.from("receitas").delete().eq("id", id);
    if (receitaAtiva?.id === id) setReceitaAtiva(null);
    carregar();
  }

  // ── CRUD ingredientes ─────────────────────────────────────────────────────
  async function adicionarIngrediente() {
    if (!ingForm.quantidade || Number(ingForm.quantidade) <= 0)
      return alert("Quantidade obrigatória!");
    let nome = ingForm.nome;
    if (ingForm.estoque_id) {
      const item = estoque.find((e) => e.id == ingForm.estoque_id);
      nome = item?.nome || ingForm.nome;
    }
    const { data, error } = await sb
      .from("receita_ingredientes")
      .insert({
        receita_id: receitaAtiva.id,
        estoque_id: ingForm.estoque_id || null,
        nome,
        quantidade: Number(ingForm.quantidade),
        unit: ingForm.unit,
        opcional: ingForm.opcional,
      })
      .select().single();
    if (error) return alert("Erro: " + error.message);
    setIngredientes((prev) => [...prev, data]);
    setIngForm({ estoque_id: "", nome: "", quantidade: "", unit: "g", opcional: false });
  }

  async function removerIngrediente(id) {
    await sb.from("receita_ingredientes").delete().eq("id", id);
    setIngredientes((prev) => prev.filter((i) => i.id !== id));
  }

  function abrirIngredientes(receita) {
    setReceitaAtiva(receita);
    setIngredientes(receita.receita_ingredientes || []);
    setModal("ingredientes");
  }

  function abrirFicha(receita) {
    setReceitaAtiva(receita);
    setIngredientes(receita.receita_ingredientes || []);
    setAba("ficha");
  }

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <Layout title="Receitas">
        <div className="loading-overlay">
          <div className="loading-icon">📖</div>
          <div className="loading-txt">Carregando...</div>
        </div>
      </Layout>
    );

  return (
    <Layout title="Receitas">
      <style>{`
        .ft-tabs { display:flex; gap:.5rem; margin-bottom:1.2rem; }
        .ft-tab {
          padding:.45rem 1.1rem; border-radius:8px; border:1px solid var(--c2);
          background:transparent; color:var(--txt); cursor:pointer;
          font-size:.82rem; font-weight:700; transition:all .15s;
        }
        .ft-tab.ativo { background:var(--ora); color:#fff; border-color:var(--ora); }

        .ft-metricas {
          display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
          gap:.8rem; margin-bottom:1rem;
        }
        .ft-metrica {
          background:var(--c2); border-radius:10px; padding:1rem 1.1rem;
          display:flex; flex-direction:column; gap:.3rem;
        }
        .ft-metrica .ft-label { font-size:.68rem; color:var(--txt); text-transform:uppercase; letter-spacing:.06em; opacity:.75; }
        .ft-metrica .ft-val   { font-size:1.2rem; font-weight:800; font-family:var(--mono); }
        .ft-metrica .ft-sub   { font-size:.7rem; color:var(--txt); opacity:.6; }

        .ft-barra-bg  { height:8px; background:var(--c2); border-radius:99px; overflow:hidden; margin-top:.5rem; }
        .ft-barra-fill{ height:100%; border-radius:99px; transition:width .4s ease; }

        .ft-mkp-row {
          display:flex; align-items:center; gap:.8rem; flex-wrap:wrap;
          background:var(--c2); border-radius:10px; padding:.8rem 1rem;
          margin-bottom:1rem;
        }
        .ft-mkp-row label { font-size:.8rem; color:var(--txt); white-space:nowrap; }
        .ft-mkp-row input[type=range] { flex:1; min-width:100px; accent-color:var(--ora); }
        .ft-mkp-val { font-weight:800; color:var(--ora); font-family:var(--mono); min-width:42px; }
        .ft-mkp-input {
          width:64px; padding:5px 8px;
          border:1px solid var(--c2); border-radius:7px;
          color:var(--txt); font-size:.85rem; text-align:center; outline:none;
          background:var(--c1,var(--bg,#fff));
        }

        .ft-ing-table { width:100%; border-collapse:collapse; font-size:.83rem; }
        .ft-ing-table th {
          text-align:left; padding:5px 8px; font-size:.7rem; font-weight:700;
          text-transform:uppercase; letter-spacing:.05em; color:var(--txt);
          border-bottom:1px solid var(--c2); opacity:.7;
        }
        .ft-ing-table td { padding:7px 8px; border-bottom:1px solid var(--c2); }
        .ft-ing-table tr:last-child td { border-bottom:none; }
        .ft-ing-table .td-custo { color:var(--verde,#27c47a); font-family:var(--mono); font-weight:700; }
        .ft-ing-table .tr-total td { font-weight:800; border-top:2px solid var(--c2); border-bottom:none; }

        .ft-comp {
          background:var(--c2); border-radius:10px; padding:1rem 1.1rem;
          margin-top:1rem;
        }
        .ft-comp h4 { margin:0 0 .8rem; font-size:.75rem; text-transform:uppercase; letter-spacing:.06em; opacity:.7; }
        .ft-comp-nums { display:flex; gap:1.5rem; flex-wrap:wrap; margin-bottom:.8rem; }
        .ft-comp-num .ft-label { font-size:.68rem; color:var(--txt); opacity:.7; text-transform:uppercase; letter-spacing:.04em; }
        .ft-comp-num .ft-val   { font-size:1.2rem; font-weight:800; font-family:var(--mono); }

        .ft-rateio-info {
          font-size:.75rem; color:var(--txt); opacity:.7;
          display:flex; gap:1.2rem; flex-wrap:wrap; margin-bottom:1rem;
        }

        .ft-receita-sel {
          background:var(--c2); border-radius:10px; padding:.7rem 1rem;
          margin-bottom:1rem; display:flex; align-items:center;
          justify-content:space-between; gap:.8rem; flex-wrap:wrap;
        }
        .ft-receita-sel select {
          flex:1; min-width:160px; padding:.45rem .7rem;
          border:1px solid var(--c2); border-radius:8px;
          color:var(--txt); font-size:.88rem; outline:none;
          background:var(--c1,var(--bg,#fff));
        }
      `}</style>

      {/* ── cabeçalho ── */}
      <div className="ph">
        <div>
          <h2>Receitas 📖</h2>
          <div className="ph-sub">{receitas.length} receitas cadastradas</div>
        </div>
        <button
          className="btn btn-ora"
          onClick={() => {
            setForm({ nome: "", tipo_prato: "Marmitex", tamanho: "M" });
            setModal("nova");
          }}
        >
          + Nova Receita
        </button>
      </div>

      {/* ── abas ── */}
      <div className="ft-tabs">
        <button className={`ft-tab ${aba === "lista" ? "ativo" : ""}`} onClick={() => setAba("lista")}>
          📋 Lista de Receitas
        </button>
        <button className={`ft-tab ${aba === "ficha" ? "ativo" : ""}`} onClick={() => setAba("ficha")}>
          📊 Ficha Técnica
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          ABA: LISTA (igual ao original, só adicionei btn 📊)
      ══════════════════════════════════════════════════ */}
      {aba === "lista" && (
        <>
          {receitas.length === 0 && (
            <div className="empty">
              <div className="empty-ico">📖</div>
              <div className="empty-title">Nenhuma receita cadastrada</div>
              <div className="empty-sub">Cadastre as receitas para baixar o estoque automaticamente</div>
            </div>
          )}

          {TIPOS_PRATO.map((tipo) => {
            const doTipo = receitas.filter((r) => r.tipo_prato === tipo);
            if (doTipo.length === 0) return null;
            return (
              <div key={tipo} style={{ marginBottom: "1.5rem" }}>
                <div style={{
                  fontSize: ".75rem", fontWeight: 700, color: "var(--ora)",
                  textTransform: "uppercase", letterSpacing: ".1em", marginBottom: ".8rem",
                }}>
                  {tipo === "Marmitex" ? "🥡" : tipo === "Prato Feito" ? "🍽️" : "🫕"} {tipo}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                  {doTipo.map((r) => {
                    const ings  = r.receita_ingredientes || [];
                    const custo = calcularCusto(ings);
                    return (
                      <div key={r.id} className="panel" style={{ marginBottom: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".8rem" }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "1rem" }}>{r.nome}</div>
                            <div style={{ fontSize: ".75rem", color: "var(--txt)", marginTop: ".2rem" }}>
                              Tamanho {r.tamanho} · {ings.length} ingrediente{ings.length !== 1 ? "s" : ""}
                            </div>
                            {custo > 0 && (
                              <div style={{ fontSize: ".75rem", color: "var(--verde)", fontFamily: "var(--mono)", marginTop: ".2rem" }}>
                                Custo estimado: {R(custo)}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: ".3rem" }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => abrirIngredientes(r)} title="Editar ingredientes">✏️</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => abrirFicha(r)} title="Ver ficha técnica">📊</button>
                            <button className="btn btn-vm btn-sm btn-icon" onClick={() => deletarReceita(r.id)}>✕</button>
                          </div>
                        </div>

                        {ings.length > 0 && (
                          <div style={{ borderTop: "1px solid var(--c2)", paddingTop: ".7rem" }}>
                            {ings.map((ing, i) => (
                              <div key={i} style={{
                                display: "flex", justifyContent: "space-between",
                                fontSize: ".8rem", padding: ".25rem 0",
                                color: ing.opcional ? "var(--azul)" : "var(--txt)",
                              }}>
                                <span>{ing.opcional ? "🔵" : "⚪"} {ing.nome}</span>
                                <span style={{ fontFamily: "var(--mono)" }}>{ing.quantidade}{ing.unit}</span>
                              </div>
                            ))}
                            <div style={{ fontSize: ".68rem", color: "var(--txt)", marginTop: ".4rem", opacity: 0.6 }}>
                              🔵 = acompanhamento (não desconta se cliente tirar)
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          ABA: FICHA TÉCNICA
      ══════════════════════════════════════════════════ */}
      {aba === "ficha" && (
        <div>
          {/* seletor de receita + markup global */}
          <div className="ft-receita-sel">
            <span style={{ fontSize: ".8rem", fontWeight: 700, whiteSpace: "nowrap" }}>Receita:</span>
            <select
              value={receitaAtiva?.id || ""}
              onChange={(e) => {
                const r = receitas.find((r) => String(r.id) === e.target.value);
                if (r) abrirFicha(r);
              }}
            >
              <option value="">— selecione uma receita —</option>
              {TIPOS_PRATO.map((tipo) => {
                const doTipo = receitas.filter((r) => r.tipo_prato === tipo);
                if (!doTipo.length) return null;
                return (
                  <optgroup key={tipo} label={tipo}>
                    {doTipo.map((r) => (
                      <option key={r.id} value={r.id}>{r.nome} ({r.tamanho})</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: ".78rem" }}>Markup padrão:</span>
              <input
                className="ft-mkp-input"
                type="number" min={0} max={99}
                value={markupGlobal}
                onChange={(e) => setMarkupGlobal(Number(e.target.value))}
              />
              <span style={{ fontSize: ".78rem" }}>%</span>
            </div>
          </div>

          {!receitaAtiva ? (
            <div className="empty">
              <div className="empty-ico">📊</div>
              <div className="empty-title">Selecione uma receita</div>
              <div className="empty-sub">Ou clique em 📊 em qualquer card na lista</div>
            </div>
          ) : (() => {
            const { custoIng, rateio, custoTotal, mkp, sugerido, precoCadValor, margemReal } = calcularFicha(receitaAtiva);

            return (
              <div>
                {/* título */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                    {receitaAtiva.tipo_prato === "Marmitex" ? "🥡"
                      : receitaAtiva.tipo_prato === "Prato Feito" ? "🍽️" : "🫕"}{" "}
                    {receitaAtiva.nome}
                    <span style={{ fontSize: ".78rem", fontWeight: 400, color: "var(--txt)", marginLeft: ".5rem" }}>
                      Tamanho {receitaAtiva.tamanho}
                    </span>
                  </div>
                </div>

                {/* markup deste prato */}
                <div className="ft-mkp-row">
                  <label>Markup deste prato:</label>
                  <input
                    type="range" min={0} max={99} step={1}
                    value={mkp}
                    onChange={(e) =>
                      setMarkupLocal((prev) => ({ ...prev, [receitaAtiva.id]: Number(e.target.value) }))
                    }
                  />
                  <span className="ft-mkp-val">{mkp}%</span>
                  <input
                    className="ft-mkp-input"
                    type="number" min={0} max={99}
                    value={mkp}
                    onChange={(e) =>
                      setMarkupLocal((prev) => ({ ...prev, [receitaAtiva.id]: Number(e.target.value) }))
                    }
                  />
                </div>

                {/* 4 cards de métricas */}
                <div className="ft-metricas">
                  <div className="ft-metrica">
                    <span className="ft-label">Custo Ingredientes</span>
                    <span className="ft-val">{R(custoIng)}</span>
                    <span className="ft-sub">soma dos insumos</span>
                  </div>
                  <div className="ft-metrica">
                    <span className="ft-label">Rateio Despesas Fixas</span>
                    <span className="ft-val" style={{ color: "var(--ora)" }}>{R(rateio)}</span>
                    <span className="ft-sub">{R(despesasMes)} ÷ {receitas.length} pratos</span>
                  </div>
                  <div className="ft-metrica">
                    <span className="ft-label">Custo Total / Porção</span>
                    <span className="ft-val">{R(custoTotal)}</span>
                    <span className="ft-sub">ingredientes + rateio</span>
                  </div>
                  <div className="ft-metrica">
                    <span className="ft-label">Preço Sugerido ({mkp}% markup)</span>
                    <span className="ft-val" style={{ color: "var(--verde)" }}>{R(sugerido)}</span>
                    <span className="ft-sub">mínimo com lucro</span>
                  </div>
                </div>

                {/* info rateio */}
                <div className="ft-rateio-info">
                  <span>💰 Despesas do mês: <strong style={{ opacity: 1 }}>{R(despesasMes)}</strong></span>
                  <span>🍽️ Receitas: <strong style={{ opacity: 1 }}>{receitas.length}</strong></span>
                  <span>📊 Rateio: <strong style={{ opacity: 1 }}>{R(rateio)}</strong> por prato</span>
                </div>

                {/* comparação com preço cadastrado */}
                <div className="ft-comp">
                  <h4>Comparação com Preço Cadastrado — {receitaAtiva.tipo_prato} {receitaAtiva.tamanho}</h4>
                  {precoCadValor !== null ? (
                    <>
                      <div className="ft-comp-nums">
                        <div className="ft-comp-num">
                          <div className="ft-label">Preço atual (tabela precos)</div>
                          <div className="ft-val">{R(precoCadValor)}</div>
                        </div>
                        <div className="ft-comp-num">
                          <div className="ft-label">Margem real</div>
                          <div className="ft-val" style={{
                            color: margemReal >= 50 ? "var(--verde)"
                                 : margemReal >= 30 ? "var(--ora)"
                                 : "var(--vm,#e05252)",
                          }}>
                            {margemReal.toFixed(1)}%
                          </div>
                        </div>
                        <div className="ft-comp-num">
                          <div className="ft-label">Diferença vs sugerido</div>
                          <div className="ft-val" style={{
                            color: precoCadValor >= sugerido ? "var(--verde)" : "var(--vm,#e05252)",
                          }}>
                            {precoCadValor >= sugerido ? "+" : ""}{R(precoCadValor - sugerido)}
                          </div>
                        </div>
                      </div>
                      {/* barra */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", opacity: .65, marginBottom: ".3rem" }}>
                          <span>Custo {R(custoTotal)}</span>
                          <span>Preço atual {R(precoCadValor)}</span>
                        </div>
                        <div className="ft-barra-bg">
                          <div
                            className="ft-barra-fill"
                            style={{
                              width: `${Math.min((custoTotal / precoCadValor) * 100, 100)}%`,
                              background: margemReal >= 50 ? "var(--verde)"
                                        : margemReal >= 30 ? "var(--ora)"
                                        : "var(--vm,#e05252)",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: ".7rem", opacity: .65, marginTop: ".3rem" }}>
                          {((custoTotal / precoCadValor) * 100).toFixed(1)}% do preço é custo
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: ".82rem", opacity: .7 }}>
                      Nenhum preço cadastrado para <strong>{receitaAtiva.tipo_prato} {receitaAtiva.tamanho}</strong> na tabela <em>precos</em>.
                      Cadastre em Configurações → Preços.
                    </div>
                  )}
                </div>

                {/* tabela ingredientes */}
                <div className="panel" style={{ marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".8rem" }}>
                    <div style={{ fontWeight: 700, fontSize: ".85rem" }}>
                      Ingredientes ({ingredientes.length})
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => abrirIngredientes(receitaAtiva)}>
                      ✏️ Editar Ingredientes
                    </button>
                  </div>

                  {ingredientes.length === 0 ? (
                    <div style={{ fontSize: ".82rem", opacity: .6, textAlign: "center", padding: "1rem 0" }}>
                      Nenhum ingrediente cadastrado ainda.
                    </div>
                  ) : (
                    <table className="ft-ing-table">
                      <thead>
                        <tr>
                          <th>Ingrediente</th>
                          <th>Qtd</th>
                          <th>Un.</th>
                          <th>Custo unit.</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredientes.map((ing) => {
                          const item = estoque.find((e) => e.id === ing.estoque_id);
                          const sub  = Number(ing.quantidade || 0) * Number(item?.preco_custo || 0);
                          return (
                            <tr key={ing.id}>
                              <td>{ing.opcional ? "🔵 " : "⚪ "}{ing.nome}</td>
                              <td>{Number(ing.quantidade).toLocaleString("pt-BR")}</td>
                              <td style={{ opacity: .7 }}>{ing.unit}</td>
                              <td className="td-custo">{R(item?.preco_custo || 0)}</td>
                              <td className="td-custo">{R(sub)}</td>
                            </tr>
                          );
                        })}
                        <tr className="tr-total">
                          <td colSpan={4}>Total ingredientes</td>
                          <td className="td-custo">{R(custoIng)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── MODAL NOVA RECEITA ── */}
      <Modal
        open={modal === "nova"}
        onClose={() => setModal(null)}
        title="Nova Receita 📖"
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-ora" onClick={salvarReceita}>Criar e Adicionar Ingredientes</button>
          </>
        }
      >
        <div className="fg">
          <label>Nome da Receita *</label>
          <input
            type="text" placeholder="Ex: Marmitex Frango G"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
        </div>
        <div className="form-row">
          <div className="fg">
            <label>Tipo de Prato</label>
            <select value={form.tipo_prato} onChange={(e) => setForm((f) => ({ ...f, tipo_prato: e.target.value }))}>
              {TIPOS_PRATO.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Tamanho</label>
            <select value={form.tamanho} onChange={(e) => setForm((f) => ({ ...f, tamanho: e.target.value }))}>
              {TAMANHOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── MODAL INGREDIENTES (100% igual ao original) ── */}
      <Modal
        open={modal === "ingredientes"}
        onClose={() => { setModal(null); carregar(); }}
        title={`Ingredientes — ${receitaAtiva?.nome}`}
      >
        {receitaAtiva && (
          <>
            {ingredientes.length > 0 && (
              <div style={{ marginBottom: "1.2rem" }}>
                <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--txt)", textTransform: "uppercase", marginBottom: ".5rem" }}>
                  Ingredientes cadastrados
                </div>
                {ingredientes.map((ing) => (
                  <div key={ing.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: ".5rem .7rem", background: "var(--c2)", borderRadius: 8, marginBottom: ".35rem",
                  }}>
                    <div>
                      <span style={{ fontSize: ".85rem", fontWeight: 600 }}>{ing.nome}</span>
                      <span style={{ fontSize: ".78rem", color: "var(--txt)", fontFamily: "var(--mono)", marginLeft: ".5rem" }}>
                        {ing.quantidade}{ing.unit}
                      </span>
                      {ing.opcional && (
                        <span style={{ fontSize: ".68rem", color: "var(--azul)", marginLeft: ".5rem" }}>🔵 acompanhamento</span>
                      )}
                    </div>
                    <button className="btn btn-vm btn-icon btn-sm" onClick={() => removerIngrediente(ing.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: "var(--c2)", borderRadius: 10, padding: "1rem" }}>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--txt)", textTransform: "uppercase", marginBottom: ".8rem" }}>
                + Adicionar Ingrediente
              </div>
              <div className="fg">
                <label>Selecionar do Estoque (opcional)</label>
                <select
                  value={ingForm.estoque_id}
                  onChange={(e) => {
                    const item = estoque.find((i) => i.id == e.target.value);
                    setIngForm((f) => ({ ...f, estoque_id: e.target.value, nome: item?.nome || "", unit: item?.unit || "g" }));
                  }}
                >
                  <option value="">Selecione ou digite abaixo...</option>
                  {estoque.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.unit})</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Nome do Ingrediente *</label>
                <input
                  type="text" placeholder="Ex: Frango, Arroz, Feijão..."
                  value={ingForm.nome}
                  onChange={(e) => setIngForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="fg">
                  <label>Quantidade *</label>
                  <input
                    type="number" step="0.01" min="0" placeholder="Ex: 300"
                    value={ingForm.quantidade}
                    onChange={(e) => setIngForm((f) => ({ ...f, quantidade: e.target.value }))}
                  />
                </div>
                <div className="fg">
                  <label>Unidade</label>
                  <select value={ingForm.unit} onChange={(e) => setIngForm((f) => ({ ...f, unit: e.target.value }))}>
                    {["g", "kg", "ml", "l", "un", "colher", "xícara"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg">
                <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox" checked={ingForm.opcional}
                    onChange={(e) => setIngForm((f) => ({ ...f, opcional: e.target.checked }))}
                  />
                  🔵 É acompanhamento (não desconta do estoque se cliente tirar)
                </label>
              </div>
              <button className="btn btn-ora" style={{ width: "100%" }} onClick={adicionarIngrediente}>
                + Adicionar Ingrediente
              </button>
            </div>

            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <button className="btn btn-vd" onClick={() => { setModal(null); carregar(); }}>
                ✅ Finalizar Receita
              </button>
            </div>
          </>
        )}
      </Modal>
    </Layout>
  );
}