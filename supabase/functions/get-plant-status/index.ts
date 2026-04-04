import { createClient } from 'npm:@supabase/supabase-js@2';

const STAGE_THRESHOLDS = {
  seed: 0,
  sprout: 4 * 3600,
  growing: 10 * 3600,
  flowering: 18 * 3600,
  fruit: 24 * 3600,
};
const STAGE_ORDER = ['seed', 'sprout', 'growing', 'flowering', 'fruit'];

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
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plant) {
    return Response.json({ plant: null, stage: 'seed', progress_percent: 0, can_harvest: false });
  }

  const plantedAt = new Date(plant.planted_at).getTime();
  const realElapsed = (Date.now() - plantedAt) / 1000;
  const elapsed = realElapsed + plant.boost_seconds;

  let stage = 'seed';
  for (const s of STAGE_ORDER) {
    if (elapsed >= STAGE_THRESHOLDS[s as keyof typeof STAGE_THRESHOLDS]) {
      stage = s;
    }
  }

  const progress = Math.min(elapsed / STAGE_THRESHOLDS.fruit, 1);

  return Response.json({
    plant,
    stage,
    progress_percent: Math.round(progress * 100),
    can_harvest: stage === 'fruit',
    elapsed_seconds: elapsed,
    total_required_seconds: STAGE_THRESHOLDS.fruit,
  });
});
