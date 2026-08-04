# 🌽 O Caipira — Sistema de Gestão

Sistema completo para restaurante com comandas, estoque, financeiro, cardápio e relatórios.

---

## 📁 Estrutura de Arquivos

```
o-caipira/
├── .env.local                  ← suas credenciais (NUNCA sobe pro GitHub)
├── package.json
├── next.config.js
│
├── lib/
│   ├── supabase.js             ← conexão com banco (1 instância)
│   ├── db.js                   ← TODAS as queries do banco ficam aqui
│   └── helpers.js              ← funções utilitárias (R$, datas, etc.)
│
├── pages/
│   ├── _app.js                 ← entrada Next.js, importa o CSS global
│   ├── index.js                ← tela de login
│   ├── dashboard.js            ← visão geral
│   ├── comandas.js             ← pedidos + impressão ← PRINCIPAL
│   ├── caixa/abrir.js          ← abertura do caixa diário
│   ├── caixa/fechar.js         ← fechamento do caixa diário
│   ├── estoque.js              ← ingredientes e movimentações
│   ├── cardapio.js             ← visualização do cardápio
│   ├── produtos.js             ← CRUD de produtos
│   ├── ingredientes.js         ← CRUD de ingredientes
│   └── relatorios.js           ← relatórios e comparativos
│
├── components/
│   ├── Layout.js               ← sidebar + topbar (usado em todas as páginas)
│   ├── Modal.js                ← modal reutilizável
│   ├── StatCard.js             ← card de estatística
│   └── PrintComanda.js         ← layout de impressão térmica
│
├── styles/
│   └── globals.css             ← design system completo
│
├── COMANDAS_SQL.sql            ← SQL das tabelas de comandas
└── README.md                   ← este arquivo
```

---

## 🚀 Como rodar localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar .env.local
O arquivo já está criado. Verifique se as credenciais estão corretas:
```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_RESTAURANTE_NOME=O Caipira
NEXT_PUBLIC_PIX_CHAVE=pix@ocaipira.com.br
```

### 3. Criar tabelas no Supabase
- Abra: supabase.com → seu projeto → SQL Editor
- Execute o SQL do arquivo `COMANDAS_SQL.sql`
- Execute também o SQL do arquivo `CAIXA_SQL.sql` (tabela `caixa_diaria`)
- As outras tabelas já foram criadas antes (estoque, financeiro, produtos, etc.)

### 4. Rodar em desenvolvimento
```bash
npm run dev
```
Acesse: http://localhost:3000
Login: admin / 1234

---

## ☁️ Deploy na Vercel (grátis)

### Opção A — Via GitHub (recomendado)
1. Crie um repositório no GitHub e faça push do projeto
2. Acesse vercel.com → "New Project"
3. Conecte o repositório
4. Em "Environment Variables", adicione as mesmas variáveis do `.env.local`
5. Clique em "Deploy" — pronto!

### Opção B — Via CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 🗃️ Como adicionar uma nova página

1. Crie `pages/minha-pagina.js`
2. Adicione a query no `lib/db.js` se precisar de banco
3. Adicione o item no menu em `components/Layout.js` (array MENU)
4. Use `<Layout title="Minha Página">` para ter a sidebar automaticamente

---

## 🖨️ Impressão de Comandas

A impressão usa `window.print()` com CSS específico para impressora térmica (80mm).
O componente `components/PrintComanda.js` controla o layout impresso.

Para usar:
```js
import PrintComanda from '@/components/PrintComanda'

// Renderize invisível na página
<div style={{ display: 'none' }}>
  <PrintComanda comanda={comandaObj} />
</div>

// Chame a impressão
window.print()
```

---

## 📦 Tabelas no Supabase

| Tabela         | O que guarda                          |
|----------------|---------------------------------------|
| estoque        | ingredientes com quantidade e mínimo  |
| movimentacoes  | entradas e saídas do estoque          |
| financeiro     | vendas (automáticas) e despesas        |
| caixa_diaria   | abertura/fechamento de caixa por dia  |
| produtos       | cardápio com preço e custo            |
| ingredientes   | cadastro de insumos                   |
| comandas       | pedidos (mesa, delivery, balcão)      |
| comanda_itens  | itens de cada comanda                 |

---

## 🔑 Login

Login atual é simples (admin/1234 no frontend).
Para login real com Supabase Auth:
- Veja: supabase.com/docs/guides/auth
- Substitua a função `entrar()` em `pages/index.js` pelo `sb.auth.signInWithPassword()`

---

## 📞 Próximos passos sugeridos

- [ ] Trocar login por Supabase Auth
- [ ] Notificação em tempo real (Supabase Realtime) quando nova comanda chegar
- [ ] Integração WhatsApp via Evolution API ou Z-API
- [ ] Relatório em PDF (biblioteca `@react-pdf/renderer`)
- [ ] QR Code PIX real (biblioteca `qrcode`)
- [ ] Controle de usuários (garçom, cozinheiro, admin)
