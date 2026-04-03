import { createClient } from 'npm:@supabase/supabase-js@2';

const STAGE_THRESHOLD_FRUIT = 24 * 3600;

const FRUIT_TYPES = ['apple', 'grape', 'strawberry', 'melon', 'cherry'];

const GRADE_WEIGHTS = [
  { grade: 'common', weight: 70 },
  { grade: 'rare', weight: 25 },
  { grade: 'legendary', weight: 5 },
];

const GRADE_REWARDS: Record<string, number> = {
  common: 10,
  rare: 50,
  legendary: 200,
};

function pickWeightedGrade(): string {
  const totalWeight = GRADE_WEIGHTS.reduce((sum, g) => sum + g.weight, 0);
  let random = Math.random() * totalWeight;
  for (const { grade, weight } of GRADE_WEIGHTS) {
    random -= weight;
    if (random <= 0) return grade;
  }
  return 'common';
}

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
  if (elapsed < STAGE_THRESHOLD_FRUIT) {
    return Response.json({ error: 'Plant is not ready for harvest' }, { status: 400 });
  }

  const fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
  const grade = pickWeightedGrade();
  const rewardAmount = GRADE_REWARDS[grade];

  await supabase
    .from('plants')
    .update({ harvested: true })
    .eq('id', plant.id);

  const { data: harvest } = await supabase
    .from('harvests')
    .insert({
      user_id: user.id,
      plant_id: plant.id,
      fruit_type: fruitType,
      grade,
      reward_amount: rewardAmount,
    })
    .select()
    .single();

  const { data: userData } = await supabase
    .from('users')
    .select('balance')
    .eq('id', user.id)
    .single();

  await supabase
    .from('users')
    .update({ balance: (userData?.balance ?? 0) + rewardAmount })
    .eq('id', user.id);

  return Response.json({
    harvest,
    new_balance: (userData?.balance ?? 0) + rewardAmount,
  });
});
