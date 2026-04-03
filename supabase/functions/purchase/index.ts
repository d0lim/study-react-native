import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { item_id } = await req.json();
  if (!item_id) return Response.json({ error: 'item_id is required' }, { status: 400 });

  const { data: shopItem } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', item_id)
    .single();

  if (!shopItem) return Response.json({ error: 'Item not found' }, { status: 404 });

  const { data: existing } = await supabase
    .from('items')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_key', item_id)
    .maybeSingle();

  if (existing) return Response.json({ error: 'Already owned' }, { status: 400 });

  const { data: userData } = await supabase
    .from('users')
    .select('balance')
    .eq('id', user.id)
    .single();

  if (!userData || userData.balance < shopItem.price) {
    return Response.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  await supabase
    .from('users')
    .update({ balance: userData.balance - shopItem.price })
    .eq('id', user.id);

  const { data: item } = await supabase
    .from('items')
    .insert({
      user_id: user.id,
      item_type: shopItem.item_type,
      item_key: item_id,
    })
    .select()
    .single();

  return Response.json({
    item,
    new_balance: userData.balance - shopItem.price,
  });
});
