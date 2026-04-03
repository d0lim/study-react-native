import { createClient } from 'npm:@supabase/supabase-js@2';

const WATER_BOOST = 1 * 3600;

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

  const { data: plant } = await supabase
    .from('plants')
    .select('*')
    .eq('user_id', user.id)
    .eq('harvested', false)
    .limit(1)
    .maybeSingle();

  if (!plant) return Response.json({ error: 'No active plant' }, { status: 400 });

  const elapsed = (Date.now() - new Date(plant.planted_at).getTime()) / 1000 + plant.boost_seconds;
  if (elapsed >= 24 * 3600) {
    return Response.json({ error: 'Plant is already fully grown' }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('plants')
    .update({ boost_seconds: plant.boost_seconds + WATER_BOOST })
    .eq('id', plant.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ plant: updated, boost_applied: WATER_BOOST });
});
