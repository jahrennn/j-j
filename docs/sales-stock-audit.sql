-- Read-only diagnostics. Run in Supabase SQL Editor as the database owner.
-- 1. Compare each current product to its latest stock movement.
SELECT p.id, p.sku, p.name, p.stock AS current_stock,
       m.stock_after AS latest_movement_stock, m.movement_type,
       m.transaction_id, m.created_at AS movement_time,
       CASE WHEN m.id IS NULL THEN 'No movement history'
            WHEN p.stock = m.stock_after THEN 'Matches latest movement'
            ELSE 'Investigate mismatch' END AS check_result
FROM public.products p
LEFT JOIN LATERAL (
    SELECT h.* FROM public.stock_movements h
    WHERE h.product_id = p.id
    ORDER BY h.created_at DESC, h.id DESC LIMIT 1
) m ON TRUE
ORDER BY p.sku;

-- 2. Recent sales and their recorded deductions. Older sales before stock
-- history was enabled may legitimately have no associated Sale movement.
SELECT s.id, s.transaction_id, s.created_at, s.buyer_name, s.product_id,
       s.product_name, s.quantity, m.product_sku, m.stock_before, m.stock_after,
       m.quantity_change,
       CASE WHEN m.id IS NULL THEN 'No matching Sale movement: investigate'
            WHEN m.quantity_change = -s.quantity AND m.product_id = s.product_id
                THEN 'Deduction recorded'
            ELSE 'Investigate deduction' END AS check_result
FROM public.sales s
LEFT JOIN public.stock_movements m
  ON m.transaction_id = s.transaction_id AND m.movement_type = 'SALE'
WHERE s.created_at >= (SELECT min(created_at) FROM public.stock_movements)
ORDER BY s.created_at DESC, s.id DESC
LIMIT 100;
