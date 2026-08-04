-- SQL adicional para o CAIXA DIÁRIO
-- Cole no SQL Editor do Supabase e execute

CREATE TABLE IF NOT EXISTS caixa_diaria (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data                    DATE NOT NULL DEFAULT CURRENT_DATE,
  status                  TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  valor_inicial_dinheiro  NUMERIC NOT NULL DEFAULT 0,
  detalhes_notas_iniciais JSONB DEFAULT '{}', -- { "n2":0, "n5":0, "n10":0, "n20":0, "n50":0, "n100":0 }
  total_vendas_dia        NUMERIC,
  valor_final_dinheiro    NUMERIC,
  detalhes_notas_finais   JSONB, -- mesmo formato de detalhes_notas_iniciais
  diferenca               NUMERIC,
  observacoes             TEXT DEFAULT '',
  criado_em               TIMESTAMPTZ DEFAULT NOW(),
  fechado_em              TIMESTAMPTZ
);

-- Garante no máximo um caixa aberto por dia
CREATE UNIQUE INDEX IF NOT EXISTS caixa_diaria_um_aberto_por_dia
  ON caixa_diaria (data)
  WHERE status = 'aberto';

-- Policy de acesso
ALTER TABLE caixa_diaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON caixa_diaria FOR ALL USING (true) WITH CHECK (true);
