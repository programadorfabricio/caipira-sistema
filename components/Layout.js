// components/Layout.js
// Sidebar + topbar mobile com controle de perfil de usuário
// Perfis: admin | caixa | cozinha | estoque | garcom

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

const MENU_COMPLETO = [
  {
    id: "dashboard",
    label: "Dashboard",
    ico: "📊",
    section: "Principal",
    perfis: ["admin", "caixa"],
  },
  {
    id: "vendas",
    label: "Vendas",
    ico: "🛒",
    section: null,
    perfis: ["admin", "caixa", "garcom"],
  },
  {
    id: "salao",
    label: "Salão",
    ico: "🍽️",
    section: null,
    perfis: ["admin", "caixa", "garcom"],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    ico: "📱",
    section: null,
    perfis: ["admin", "caixa", "garcom"],
  },
  {
    id: "cozinha",
    label: "Cozinha",
    ico: "👨‍🍳",
    section: null,
    perfis: ["admin", "cozinha", "garcom"],
  },
  {
    id: "cardapio",
    label: "Cardápio do Dia",
    ico: "🗒️",
    section: null,
    perfis: ["admin", "caixa", "garcom"],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    ico: "💰",
    section: "Gestão",
    perfis: ["admin", "caixa"],
  },
  {
    id: "estoque",
    label: "Estoque",
    ico: "📦",
    section: null,
    perfis: ["admin", "estoque"],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    ico: "📋",
    section: null,
    perfis: ["admin", "caixa"],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    ico: "⚙️",
    section: null,
    perfis: ["admin"],
  },
  {
    id: "receitas",
    label: "Receitas",
    ico: "📖",
    section: null,
    perfis: ["admin"],
  },
];

const PERFIL_INFO = {
  admin: { label: "Admin", cor: "#FF6A00" },
  caixa: { label: "Caixa", cor: "#2563EB" },
  cozinha: { label: "Cozinha", cor: "#16A34A" },
  estoque: { label: "Estoque", cor: "#7C3AED" },
  garcom: { label: "Garçom", cor: "#D4A017" },
};

export default function Layout({ children, title = "O Caipira" }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [perfil, setPerfil] = useState("admin");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const atual = router.pathname.replace("/", "") || "dashboard";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const auth = sessionStorage.getItem("caipira_auth");
    if (!auth) {
      router.push("/");
      return;
    }
    try {
      const dados = JSON.parse(auth);
      setPerfil(dados.perfil || "admin");
      setNomeUsuario(dados.nome || "");
    } catch {
      router.push("/");
    }
  }, []);

  const menuFiltrado = MENU_COMPLETO.filter((item) =>
    item.perfis.includes(perfil),
  );

  function navTo(id) {
    router.push("/" + id);
    setSidebarOpen(false);
  }
  function logout() {
    sessionStorage.removeItem("caipira_auth");
    router.push("/");
  }

  const perfilInfo = PERFIL_INFO[perfil] || PERFIL_INFO.admin;
  const iniciais =
    nomeUsuario
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  return (
    <>
      <Head>
        <title>{title} · Caipira</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            zIndex: 199,
          }}
        />
      )}

      <div className="layout">
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="sb-logo">
            <div className="sb-logo-icon">🌽</div>
            <div>
              <div className="sb-logo-name">Caipira</div>
              <div className="sb-logo-sub">gestão completa</div>
            </div>
          </div>

          {menuFiltrado.map((item) => (
            <div key={item.id}>
              {item.section && <div className="sb-sec">{item.section}</div>}
              <button
                className={`sb-item${atual === item.id ? " active" : ""}`}
                onClick={() => navTo(item.id)}
              >
                <span className="ico">{item.ico}</span>
                {item.label}
              </button>
            </div>
          ))}

          <div className="sb-footer">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".7rem",
                padding: ".6rem .8rem",
                marginBottom: ".3rem",
                background: "var(--c2)",
                borderRadius: 9,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: perfilInfo.cor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: ".75rem",
                  fontWeight: 800,
                  color: "#000",
                  flexShrink: 0,
                }}
              >
                {iniciais}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: ".82rem",
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nomeUsuario || "Usuário"}
                </div>
                <div
                  style={{
                    fontSize: ".65rem",
                    color: perfilInfo.cor,
                    fontFamily: "var(--mono)",
                  }}
                >
                  {perfilInfo.label}
                </div>
              </div>
            </div>
            <button className="sb-item" onClick={logout}>
              <span className="ico">🚪</span> Sair
            </button>
          </div>
        </aside>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
          }}
        >
          <div className="topbar">
            <div className="topbar-logo">
              🌽 <span>Caipira</span>
            </div>
            <button className="hbtn" onClick={() => setSidebarOpen((v) => !v)}>
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
          <main className="main-content">{children}</main>
        </div>
      </div>
    </>
  );
}
