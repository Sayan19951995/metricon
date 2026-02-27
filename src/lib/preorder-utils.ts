import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Add preorder overrides for SKUs that hit zero stock.
 * Updates pricelist_feeds.preorder_overrides JSON.
 */
export async function updatePreorderOverrides(
  supabase: SupabaseClient,
  storeId: string,
  skus: string[],
  days: number
): Promise<void> {
  if (skus.length === 0) return;

  const { data: feed } = await supabase
    .from('pricelist_feeds')
    .select('id, preorder_overrides')
    .eq('store_id', storeId)
    .single();

  if (!feed) return;

  const overrides = (feed.preorder_overrides || {}) as Record<string, number>;

  for (const sku of skus) {
    overrides[sku] = Math.min(Math.max(days, 1), 30);
  }

  await supabase
    .from('pricelist_feeds')
    .update({ preorder_overrides: overrides })
    .eq('id', feed.id);
}

/**
 * Remove preorder overrides for SKUs that have stock restored.
 */
export async function removePreorderOverrides(
  supabase: SupabaseClient,
  storeId: string,
  skus: string[]
): Promise<void> {
  if (skus.length === 0) return;

  const { data: feed } = await supabase
    .from('pricelist_feeds')
    .select('id, preorder_overrides')
    .eq('store_id', storeId)
    .single();

  if (!feed) return;

  const overrides = (feed.preorder_overrides || {}) as Record<string, number>;
  let changed = false;

  for (const sku of skus) {
    if (sku in overrides) {
      delete overrides[sku];
      changed = true;
    }
  }

  if (changed) {
    await supabase
      .from('pricelist_feeds')
      .update({ preorder_overrides: overrides })
      .eq('id', feed.id);
  }
}
