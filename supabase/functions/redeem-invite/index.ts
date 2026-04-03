import { createClient } from 'npm:@supabase/supabase-js@2';

const INVITE_BONUS = 50;

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

  const { invite_code } = await req.json();
  if (!invite_code) return Response.json({ error: 'invite_code is required' }, { status: 400 });

  const { data: inviter } = await supabase
    .from('users')
    .select('id, balance')
    .eq('invite_code', invite_code)
    .single();

  if (!inviter) return Response.json({ error: 'Invalid invite code' }, { status: 404 });

  if (inviter.id === user.id) {
    return Response.json({ error: 'Cannot use own invite code' }, { status: 400 });
  }

  const { data: existingInvite } = await supabase
    .from('invites')
    .select('id')
    .eq('inviter_id', inviter.id)
    .eq('used_by', user.id)
    .maybeSingle();

  if (existingInvite) {
    return Response.json({ error: 'Already redeemed this invite' }, { status: 400 });
  }

  const { data: anyRedeemed } = await supabase
    .from('invites')
    .select('id')
    .eq('used_by', user.id)
    .maybeSingle();

  if (anyRedeemed) {
    return Response.json({ error: 'Already redeemed an invite' }, { status: 400 });
  }

  await supabase.from('invites').insert({
    inviter_id: inviter.id,
    used_by: user.id,
    used_at: new Date().toISOString(),
  });

  await supabase
    .from('users')
    .update({ balance: inviter.balance + INVITE_BONUS })
    .eq('id', inviter.id);

  const { data: redeemer } = await supabase
    .from('users')
    .select('balance')
    .eq('id', user.id)
    .single();

  await supabase
    .from('users')
    .update({ balance: (redeemer?.balance ?? 0) + INVITE_BONUS })
    .eq('id', user.id);

  return Response.json({
    success: true,
    bonus: INVITE_BONUS,
    new_balance: (redeemer?.balance ?? 0) + INVITE_BONUS,
  });
});
