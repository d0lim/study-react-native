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

  const { data: existing } = await supabase
    .from('plants')
    .select('id')
    .eq('user_id', user.id)
    .eq('harvested', false)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return Response.json({ error: 'Already have an active plant' }, { status: 400 });
  }

  const { data: plant, error } = await supabase
    .from('plants')
    .insert({ user_id: user.id })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ plant });
});
