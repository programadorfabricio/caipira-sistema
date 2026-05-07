-- SQL adicional para as COMANDAS
-- Cole no SQL Editor do Supabase e execute

CREATE TABLE IF NOT EXISTS comandas (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero          TEXT NOT NULL,
  cliente_nome    TEXT NOT NULL,
  origem          TEXT DEFAULT 'Mesa', -- Mesa, Balcão, WhatsApp, iFood
  mesa            TEXT,
  status          TEXT DEFAULT 'aberta', -- aberta, pronta, entregue, paga, cancelada
  total           NUMERIC DEFAULT 0,
  forma_pagamento TEXT,
  obs             TEXT DEFAULT '',
  data            DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comanda_itens (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comanda_id      BIGINT REFERENCES comandas(id) ON DELETE CASCADE,
  produto_id      BIGINT REFERENCES produtos(id),
  nome            TEXT,           -- cópia do nome do produto
  quantidade      INT DEFAULT 1,
  preco_unitario  NUMERIC NOT NULL,
  obs             TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Policy de acesso
ALTER TABLE comandas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comanda_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON comandas      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON comanda_itens FOR ALL USING (true) WITH CHECK (true);
