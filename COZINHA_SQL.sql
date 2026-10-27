-- SQL da Tela da Cozinha (/cozinha)
-- Cole no SQL Editor do Supabase e execute UMA vez.
-- Não altera nada que já existe: só adiciona uma coluna nova e liga o tempo real.

-- 1) Coluna que marca quando a cozinha terminou o pedido
--    (separada do status de pagamento, pra não atrapalhar caixa nem fiado)
ALTER TABLE balcao_pedidos ADD COLUMN IF NOT EXISTS pronto_em TIMESTAMPTZ;
ALTER TABLE wpp_pedidos    ADD COLUMN IF NOT EXISTS pronto_em TIMESTAMPTZ;
ALTER TABLE comandas       ADD COLUMN IF NOT EXISTS pronto_em TIMESTAMPTZ;

-- 2) Tempo real: o tablet recebe o pedido na hora em que o caixa salva
--    (se der erro dizendo que a tabela já está na publicação, pode ignorar)
ALTER PUBLICATION supabase_realtime ADD TABLE balcao_pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE wpp_pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE comandas;
