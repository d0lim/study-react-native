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

  const { data: userData } = await supabase
    .from('users')
    .select('invite_code')
    .eq('id', user.id)
    .single();

  if (!userData) return Response.json({ error: 'User not found' }, { status: 404 });

  return Response.json({ invite_code: userData.invite_code });
});
