// lib/helpers.js — funções utilitárias

// Formata valor em reais
export const R = (v) =>
  "R$ " +
  Number(v || 0)
    .toFixed(2)
    .replace(".", ",");

// Data de hoje no formato YYYY-MM-DD
export const hoje = () => new Date().toISOString().slice(0, 10);

// Data formatada em pt-BR
export const dataFormatada = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

// Hora atual formatada
export const agora = () =>
  new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Gera número de comanda aleatório
export const gerarNumComanda = () =>
  Math.floor(Math.random() * 900000 + 100000).toString();

// Status da comanda
export const statusComanda = (s) =>
  ({
    aberta:    { label: "Aberta",    cls: "badge-warn" },
    pronta:    { label: "Pronta",    cls: "badge-ok"   },
    entregue:  { label: "Entregue",  cls: "badge-info" },
    paga:      { label: "Paga",      cls: "badge-ok"   },
    cancelada: { label: "Cancelada", cls: "badge-err"  },
  })[s] || { label: s, cls: "" };

// Status do pedido (balcão/wpp)
export const statusPedido = (s) =>
  ({
    aberto:    { label: "Aberto",    cls: "badge-warn" },
    pronto:    { label: "Pronto",    cls: "badge-ok"   },
    saiu:      { label: "Saiu",      cls: "badge-info" },
    pago:      { label: "Pago",      cls: "badge-ok"   },
    cancelado: { label: "Cancelado", cls: "badge-err"  },
  })[s] || { label: s, cls: "" };

// Tamanhos disponíveis — máximo 2 misturas em qualquer tamanho
export const TAMANHOS = [
  { key: "P", label: "Pequeno", misturas: 2 },
  { key: "M", label: "Médio",   misturas: 2 },
  { key: "G", label: "Grande",  misturas: 2 },
];

// Tipos de prato
export const TIPOS_PRATO = [
  {
    key:   "Marmitex",
    label: "Marmitex",
    ico:   "🥡",
    local: ["balcao", "whatsapp"],
  },
  {
    key:   "Prato Feito",
    label: "Prato Feito",
    ico:   "🍽️",
    local: ["salao", "balcao", "whatsapp"],
  },
];

// Formas de pagamento
export const PAGAMENTOS = [
  { key: "PIX",           ico: "⚡",  bg: "#0EA15A" },
  { key: "Dinheiro",      ico: "💵",  bg: "#D4A017" },
  { key: "Débito",        ico: "💳",  bg: "#2563EB" },
  { key: "Crédito",       ico: "💳",  bg: "#7C3AED" },
  { key: "Vale Refeição", ico: "🍽️", bg: "#EA580C" },
  { key: "Sodexo",        ico: "🎫",  bg: "#1D6FA4" },
];

// Verifica se alguma mistura é feijoada
export const temFeijoada = (misturas) => {
  if (!misturas) return false;
  // misturas pode ser string "Feijoada + vinagrete" ou array de objetos
  if (typeof misturas === "string")
    return misturas.toLowerCase().includes("feijoada");
  if (Array.isArray(misturas))
    return misturas.some((m) =>
      (m.nome || m).toLowerCase().includes("feijoada")
    );
  return false;
};

// Busca preço no banco — considera feijoada e num_misturas para Marmitex
// misturas pode ser: string (nome das misturas) ou array de objetos ou número
export const getPreco = async (sb, tipo, tamanho, misturas = 1) => {
  if (tipo === "Marmitex") {
    // verifica se tem feijoada nas misturas
    if (temFeijoada(misturas)) {
      const { data } = await sb
        .from("precos")
        .select("preco")
        .eq("tipo", "Feijoada")
        .eq("tamanho", tamanho)
        .single();
      if (data?.preco) return Number(data.preco);
    }

    // marmitex normal — preço por número de misturas
    const numMist =
      typeof misturas === "number"
        ? misturas
        : Array.isArray(misturas)
          ? misturas.length
          : 1;

    const { data } = await sb
      .from("precos")
      .select("preco")
      .eq("tipo", "Marmitex")
      .eq("tamanho", tamanho)
      .eq("num_misturas", numMist)
      .single();

    if (data?.preco) return Number(data.preco);

    // fallback: pega qualquer marmitex do tamanho
    const { data: fallback } = await sb
      .from("precos")
      .select("preco")
      .eq("tipo", "Marmitex")
      .eq("tamanho", tamanho)
      .limit(1)
      .single();
    return fallback?.preco ? Number(fallback.preco) : 0;
  }

  // Prato Feito e outros — preço fixo por tamanho
  const { data } = await sb
    .from("precos")
    .select("preco")
    .eq("tipo", tipo)
    .eq("tamanho", tamanho)
    .single();
  return data?.preco ? Number(data.preco) : 0;
};