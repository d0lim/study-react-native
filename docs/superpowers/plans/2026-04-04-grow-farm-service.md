# Grow Farm Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 올팜 스타일 식물 키우기 PoC — 실시간+행동 가속 성장, 수확/재화, 상점, 바이럴 초대를 Expo + Supabase로 구현

**Architecture:** 서버 중심 아키텍처. 성장 계산, 수확, 재화, 교환 등 핵심 로직은 Supabase Edge Functions에서 처리. 클라이언트는 상태 표시와 액션 트리거만 담당. Expo Router 파일 기반 라우팅으로 탭 네비게이션 구성.

**Tech Stack:** React Native, Expo SDK 54, Expo Router, Supabase (Auth, PostgreSQL, Edge Functions), TypeScript, react-native-google-mobile-ads

---

## File Structure

```
app/
├── _layout.tsx                    # Root layout (auth provider wrapping)
├── (auth)/
│   ├── _layout.tsx                # Auth layout
│   └── login.tsx                  # Login screen
├── (tabs)/
│   ├── _layout.tsx                # Tab navigator layout
│   ├── index.tsx                  # Main screen (plant view)
│   ├── shop.tsx                   # Shop screen
│   ├── inventory.tsx              # My items screen
│   └── invite.tsx                 # Invite screen
├── +not-found.tsx                 # 404 screen
lib/
├── supabase.ts                    # Supabase client init
├── auth.tsx                       # Auth context provider
├── types.ts                       # Shared TypeScript types
├── constants.ts                   # Growth stages, rewards, shop items config
├── plant.ts                       # Plant status calculation (display only)
components/
├── PlantView.tsx                  # Plant visualization (stage-based image)
├── ActionButton.tsx               # Water/Fertilize button with ad trigger
├── GrowthProgress.tsx             # Growth progress bar
├── ShopItem.tsx                   # Shop item card
├── InventoryItem.tsx              # Inventory item card
├── HarvestModal.tsx               # Harvest result modal
supabase/
├── config.toml                    # Supabase local config
├── migrations/
│   └── 00001_initial_schema.sql   # Database schema
├── functions/
│   ├── get-plant-status/index.ts  # Get current plant state
│   ├── plant-seed/index.ts        # Plant a new seed
│   ├── water/index.ts             # Water action (+1hr boost)
│   ├── fertilize/index.ts         # Fertilize action (+3hr boost)
│   ├── harvest/index.ts           # Harvest + random fruit + reward
│   ├── purchase/index.ts          # Shop purchase
│   ├── create-invite/index.ts     # Generate invite code
│   └── redeem-invite/index.ts     # Redeem invite code + bonus
assets/
├── plants/
│   ├── seed.png
│   ├── sprout.png
│   ├── growing.png
│   ├── flowering.png
│   └── fruit.png
├── fruits/
│   ├── common.png
│   ├── rare.png
│   └── legendary.png
```

---

## Task 1: Expo 프로젝트 초기화

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`

- [ ] **Step 1: Expo 프로젝트 생성**

```bash
npx create-expo-app@latest . --template tabs
```

- [ ] **Step 2: 불필요한 boilerplate 제거**

생성된 파일 중 예제 코드 정리. `app/(tabs)/index.tsx`를 빈 화면으로 교체:

```tsx
// app/(tabs)/index.tsx
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Grow Farm</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 3: 앱 실행 확인**

```bash
npx expo start
```

Expected: 개발 서버 시작, "Grow Farm" 텍스트가 화면에 표시됨

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: initialize Expo project with tabs template"
```

---

## Task 2: Supabase 프로젝트 초기화 + DB 스키마

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/00001_initial_schema.sql`

- [ ] **Step 1: Supabase CLI 초기화**

```bash
npx supabase init
```

- [ ] **Step 2: DB 마이그레이션 파일 생성**

```bash
npx supabase migration new initial_schema
```

- [ ] **Step 3: 스키마 작성**

`supabase/migrations/<timestamp>_initial_schema.sql`:

```sql
-- Users profile (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  invite_code text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can read own data" on public.users
  for select using (auth.uid() = id);

-- Plants
create table public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  planted_at timestamptz not null default now(),
  boost_seconds integer not null default 0,
  harvested boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.plants enable row level security;
create policy "Users can read own plants" on public.plants
  for select using (auth.uid() = user_id);

-- Harvests
create table public.harvests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  fruit_type text not null,
  grade text not null check (grade in ('common', 'rare', 'legendary')),
  reward_amount integer not null,
  created_at timestamptz not null default now()
);

alter table public.harvests enable row level security;
create policy "Users can read own harvests" on public.harvests
  for select using (auth.uid() = user_id);

-- Items (owned by user)
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null check (item_type in ('pot_skin', 'background_skin')),
  item_key text not null,
  equipped boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;
create policy "Users can read own items" on public.items
  for select using (auth.uid() = user_id);

-- Invites
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.users(id) on delete cascade,
  used_by uuid references public.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
create policy "Users can read own invites" on public.invites
  for select using (auth.uid() = inviter_id);

-- Shop catalog (read-only for clients)
create table public.shop_items (
  id text primary key,
  item_type text not null check (item_type in ('pot_skin', 'background_skin')),
  name text not null,
  price integer not null,
  image_url text
);

alter table public.shop_items enable row level security;
create policy "Anyone can read shop items" on public.shop_items
  for select using (true);

-- Seed shop data
insert into public.shop_items (id, item_type, name, price) values
  ('pot_classic', 'pot_skin', 'Classic Pot', 0),
  ('pot_gold', 'pot_skin', 'Gold Pot', 100),
  ('pot_crystal', 'pot_skin', 'Crystal Pot', 300),
  ('bg_garden', 'background_skin', 'Garden', 0),
  ('bg_night', 'background_skin', 'Night Sky', 150),
  ('bg_beach', 'background_skin', 'Beach', 250);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 4: 로컬 Supabase 시작 및 마이그레이션 적용 확인**

```bash
npx supabase start
npx supabase db reset
```

Expected: 모든 테이블 생성, shop_items에 시드 데이터 존재

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase initial schema with RLS policies"
```

---

## Task 3: Supabase 클라이언트 + Auth 연동

**Files:**
- Create: `lib/supabase.ts`, `lib/auth.tsx`, `lib/types.ts`, `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`

- [ ] **Step 1: 의존성 설치**

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage expo-auth-session expo-web-browser expo-crypto
```

- [ ] **Step 2: Supabase 클라이언트 생성**

`lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 3: 타입 정의**

`lib/types.ts`:

```typescript
export type PlantStage = 'seed' | 'sprout' | 'growing' | 'flowering' | 'fruit';

export type FruitGrade = 'common' | 'rare' | 'legendary';

export type ItemType = 'pot_skin' | 'background_skin';

export interface User {
  id: string;
  balance: number;
  invite_code: string;
  created_at: string;
}

export interface Plant {
  id: string;
  user_id: string;
  planted_at: string;
  boost_seconds: number;
  harvested: boolean;
  created_at: string;
}

export interface PlantStatus {
  plant: Plant | null;
  stage: PlantStage;
  progress_percent: number;
  can_harvest: boolean;
  elapsed_seconds: number;
  total_required_seconds: number;
}

export interface Harvest {
  id: string;
  fruit_type: string;
  grade: FruitGrade;
  reward_amount: number;
  created_at: string;
}

export interface ShopItem {
  id: string;
  item_type: ItemType;
  name: string;
  price: number;
  image_url: string | null;
}

export interface OwnedItem {
  id: string;
  item_type: ItemType;
  item_key: string;
  equipped: boolean;
  created_at: string;
}
```

- [ ] **Step 4: Auth Context 생성**

`lib/auth.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { User } from './types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    setUser(data);
  };

  const refreshUser = async () => {
    if (session?.user.id) {
      await fetchUser(session.user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user.id) fetchUser(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user.id) {
          await fetchUser(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 5: Root Layout에 Auth Provider 적용**

`app/_layout.tsx`:

```tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/auth';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
```

- [ ] **Step 6: Login 화면 생성**

`app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`app/(auth)/login.tsx`:

```tsx
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const handleGoogleLogin = async () => {
    const redirectTo = AuthSession.makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) Alert.alert('Error', error.message);
  };

  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
    });
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grow Farm</Text>
      <Text style={styles.subtitle}>식물을 키우고 열매를 수확하세요</Text>
      <Pressable style={styles.button} onPress={handleGoogleLogin}>
        <Text style={styles.buttonText}>Google로 로그인</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.appleButton]} onPress={handleAppleLogin}>
        <Text style={styles.buttonText}>Apple로 로그인</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  appleButton: { backgroundColor: '#000' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 7: .env 파일 생성**

`.env`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
```

`.gitignore`에 `.env` 추가 확인.

- [ ] **Step 8: 앱 실행 확인**

```bash
npx expo start
```

Expected: 로그인 화면 표시, 로그인 후 탭 화면으로 이동

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client, auth context, and login screen"
```

---

## Task 4: 상수 정의 + 성장 계산 유틸

**Files:**
- Create: `lib/constants.ts`, `lib/plant.ts`

- [ ] **Step 1: 상수 정의**

`lib/constants.ts`:

```typescript
import { PlantStage, FruitGrade } from './types';

// 각 단계 전환에 필요한 누적 시간 (초)
export const STAGE_THRESHOLDS: Record<PlantStage, number> = {
  seed: 0,
  sprout: 4 * 3600,       // 4시간
  growing: 10 * 3600,     // 10시간
  flowering: 18 * 3600,   // 18시간
  fruit: 24 * 3600,       // 24시간
};

export const STAGE_ORDER: PlantStage[] = ['seed', 'sprout', 'growing', 'flowering', 'fruit'];

export const BOOST_AMOUNTS = {
  water: 1 * 3600,      // 1시간 (초)
  fertilize: 3 * 3600,  // 3시간 (초)
} as const;

export const FRUIT_REWARDS: Record<FruitGrade, number> = {
  common: 10,
  rare: 50,
  legendary: 200,
};

// 수확 시 등급 확률 (가중치)
export const FRUIT_GRADE_WEIGHTS: { grade: FruitGrade; weight: number }[] = [
  { grade: 'common', weight: 70 },
  { grade: 'rare', weight: 25 },
  { grade: 'legendary', weight: 5 },
];

export const INVITE_BONUS_AMOUNT = 50; // 초대 보너스 재화
```

- [ ] **Step 2: 성장 계산 유틸 (클라이언트 표시용)**

`lib/plant.ts`:

```typescript
import { PlantStage, PlantStatus, Plant } from './types';
import { STAGE_THRESHOLDS, STAGE_ORDER } from './constants';

export function calculatePlantStage(elapsedSeconds: number): PlantStage {
  let currentStage: PlantStage = 'seed';
  for (const stage of STAGE_ORDER) {
    if (elapsedSeconds >= STAGE_THRESHOLDS[stage]) {
      currentStage = stage;
    }
  }
  return currentStage;
}

export function calculateProgress(elapsedSeconds: number): number {
  const totalRequired = STAGE_THRESHOLDS.fruit;
  return Math.min(elapsedSeconds / totalRequired, 1);
}

export function getElapsedSeconds(plant: Plant): number {
  const plantedAt = new Date(plant.planted_at).getTime();
  const now = Date.now();
  const realElapsed = (now - plantedAt) / 1000;
  return realElapsed + plant.boost_seconds;
}

export function getPlantStatusLocal(plant: Plant | null): PlantStatus {
  if (!plant || plant.harvested) {
    return {
      plant,
      stage: 'seed',
      progress_percent: 0,
      can_harvest: false,
      elapsed_seconds: 0,
      total_required_seconds: STAGE_THRESHOLDS.fruit,
    };
  }

  const elapsed = getElapsedSeconds(plant);
  const stage = calculatePlantStage(elapsed);
  const progress = calculateProgress(elapsed);

  return {
    plant,
    stage,
    progress_percent: Math.round(progress * 100),
    can_harvest: stage === 'fruit',
    elapsed_seconds: elapsed,
    total_required_seconds: STAGE_THRESHOLDS.fruit,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/constants.ts lib/plant.ts
git commit -m "feat: add growth constants and plant status calculation"
```

---

## Task 5: Edge Functions — 식물 상태 조회 + 씨앗 심기

**Files:**
- Create: `supabase/functions/get-plant-status/index.ts`, `supabase/functions/plant-seed/index.ts`

- [ ] **Step 1: get-plant-status Edge Function 생성**

```bash
npx supabase functions new get-plant-status
```

`supabase/functions/get-plant-status/index.ts`:

```typescript
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
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

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
```

- [ ] **Step 2: plant-seed Edge Function 생성**

```bash
npx supabase functions new plant-seed
```

`supabase/functions/plant-seed/index.ts`:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  // Check if user already has an active plant
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
```

- [ ] **Step 3: 로컬에서 함수 실행 확인**

```bash
npx supabase functions serve
```

Expected: Edge Functions 서빙 시작

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add get-plant-status and plant-seed edge functions"
```

---

## Task 6: Edge Functions — 물주기 + 비료 주기

**Files:**
- Create: `supabase/functions/water/index.ts`, `supabase/functions/fertilize/index.ts`

- [ ] **Step 1: water Edge Function**

```bash
npx supabase functions new water
```

`supabase/functions/water/index.ts`:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const WATER_BOOST = 1 * 3600; // 1시간 in seconds

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

  // Get active plant
  const { data: plant } = await supabase
    .from('plants')
    .select('*')
    .eq('user_id', user.id)
    .eq('harvested', false)
    .limit(1)
    .maybeSingle();

  if (!plant) return Response.json({ error: 'No active plant' }, { status: 400 });

  // Check if already at fruit stage (no boost needed)
  const elapsed = (Date.now() - new Date(plant.planted_at).getTime()) / 1000 + plant.boost_seconds;
  if (elapsed >= 24 * 3600) {
    return Response.json({ error: 'Plant is already fully grown' }, { status: 400 });
  }

  // Apply boost
  const { data: updated, error } = await supabase
    .from('plants')
    .update({ boost_seconds: plant.boost_seconds + WATER_BOOST })
    .eq('id', plant.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ plant: updated, boost_applied: WATER_BOOST });
});
```

- [ ] **Step 2: fertilize Edge Function**

```bash
npx supabase functions new fertilize
```

`supabase/functions/fertilize/index.ts`:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const FERTILIZE_BOOST = 3 * 3600; // 3시간 in seconds

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
    .update({ boost_seconds: plant.boost_seconds + FERTILIZE_BOOST })
    .eq('id', plant.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ plant: updated, boost_applied: FERTILIZE_BOOST });
});
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/water/ supabase/functions/fertilize/
git commit -m "feat: add water and fertilize edge functions"
```

---

## Task 7: Edge Function — 수확

**Files:**
- Create: `supabase/functions/harvest/index.ts`

- [ ] **Step 1: harvest Edge Function**

```bash
npx supabase functions new harvest
```

`supabase/functions/harvest/index.ts`:

```typescript
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

  // Get active plant
  const { data: plant } = await supabase
    .from('plants')
    .select('*')
    .eq('user_id', user.id)
    .eq('harvested', false)
    .limit(1)
    .maybeSingle();

  if (!plant) return Response.json({ error: 'No active plant' }, { status: 400 });

  // Verify plant is fully grown
  const elapsed = (Date.now() - new Date(plant.planted_at).getTime()) / 1000 + plant.boost_seconds;
  if (elapsed < STAGE_THRESHOLD_FRUIT) {
    return Response.json({ error: 'Plant is not ready for harvest' }, { status: 400 });
  }

  // Determine fruit
  const fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
  const grade = pickWeightedGrade();
  const rewardAmount = GRADE_REWARDS[grade];

  // Mark plant as harvested
  await supabase
    .from('plants')
    .update({ harvested: true })
    .eq('id', plant.id);

  // Create harvest record
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

  // Add reward to user balance
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/harvest/
git commit -m "feat: add harvest edge function with random fruit and rewards"
```

---

## Task 8: Edge Function — 상점 구매

**Files:**
- Create: `supabase/functions/purchase/index.ts`

- [ ] **Step 1: purchase Edge Function**

```bash
npx supabase functions new purchase
```

`supabase/functions/purchase/index.ts`:

```typescript
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

  // Get shop item
  const { data: shopItem } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', item_id)
    .single();

  if (!shopItem) return Response.json({ error: 'Item not found' }, { status: 404 });

  // Check if already owned
  const { data: existing } = await supabase
    .from('items')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_key', item_id)
    .maybeSingle();

  if (existing) return Response.json({ error: 'Already owned' }, { status: 400 });

  // Check balance
  const { data: userData } = await supabase
    .from('users')
    .select('balance')
    .eq('id', user.id)
    .single();

  if (!userData || userData.balance < shopItem.price) {
    return Response.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  // Deduct balance
  await supabase
    .from('users')
    .update({ balance: userData.balance - shopItem.price })
    .eq('id', user.id);

  // Grant item
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/purchase/
git commit -m "feat: add purchase edge function for shop items"
```

---

## Task 9: Edge Functions — 초대 생성 + 사용

**Files:**
- Create: `supabase/functions/create-invite/index.ts`, `supabase/functions/redeem-invite/index.ts`

- [ ] **Step 1: create-invite Edge Function**

```bash
npx supabase functions new create-invite
```

`supabase/functions/create-invite/index.ts`:

```typescript
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

  // Get user's invite code
  const { data: userData } = await supabase
    .from('users')
    .select('invite_code')
    .eq('id', user.id)
    .single();

  if (!userData) return Response.json({ error: 'User not found' }, { status: 404 });

  return Response.json({ invite_code: userData.invite_code });
});
```

- [ ] **Step 2: redeem-invite Edge Function**

```bash
npx supabase functions new redeem-invite
```

`supabase/functions/redeem-invite/index.ts`:

```typescript
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

  // Find inviter by invite_code
  const { data: inviter } = await supabase
    .from('users')
    .select('id, balance')
    .eq('invite_code', invite_code)
    .single();

  if (!inviter) return Response.json({ error: 'Invalid invite code' }, { status: 404 });

  // Cannot invite yourself
  if (inviter.id === user.id) {
    return Response.json({ error: 'Cannot use own invite code' }, { status: 400 });
  }

  // Check if already redeemed by this user
  const { data: existingInvite } = await supabase
    .from('invites')
    .select('id')
    .eq('inviter_id', inviter.id)
    .eq('used_by', user.id)
    .maybeSingle();

  if (existingInvite) {
    return Response.json({ error: 'Already redeemed this invite' }, { status: 400 });
  }

  // Check if user has already redeemed any invite
  const { data: anyRedeemed } = await supabase
    .from('invites')
    .select('id')
    .eq('used_by', user.id)
    .maybeSingle();

  if (anyRedeemed) {
    return Response.json({ error: 'Already redeemed an invite' }, { status: 400 });
  }

  // Create invite record
  await supabase.from('invites').insert({
    inviter_id: inviter.id,
    used_by: user.id,
    used_at: new Date().toISOString(),
  });

  // Bonus to inviter
  await supabase
    .from('users')
    .update({ balance: inviter.balance + INVITE_BONUS })
    .eq('id', inviter.id);

  // Bonus to redeemer
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
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/create-invite/ supabase/functions/redeem-invite/
git commit -m "feat: add invite create and redeem edge functions"
```

---

## Task 10: 메인 화면 — 식물 뷰 + 행동 버튼

**Files:**
- Create: `components/PlantView.tsx`, `components/GrowthProgress.tsx`, `components/ActionButton.tsx`, `components/HarvestModal.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: PlantView 컴포넌트**

`components/PlantView.tsx`:

```tsx
import { View, Image, StyleSheet } from 'react-native';
import { PlantStage } from '../lib/types';

const STAGE_IMAGES: Record<PlantStage, any> = {
  seed: require('../assets/plants/seed.png'),
  sprout: require('../assets/plants/sprout.png'),
  growing: require('../assets/plants/growing.png'),
  flowering: require('../assets/plants/flowering.png'),
  fruit: require('../assets/plants/fruit.png'),
};

interface Props {
  stage: PlantStage;
}

export default function PlantView({ stage }: Props) {
  return (
    <View style={styles.container}>
      <Image source={STAGE_IMAGES[stage]} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: 300 },
  image: { width: 200, height: 200 },
});
```

- [ ] **Step 2: GrowthProgress 컴포넌트**

`components/GrowthProgress.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { PlantStage } from '../lib/types';

interface Props {
  stage: PlantStage;
  progressPercent: number;
}

const STAGE_LABELS: Record<PlantStage, string> = {
  seed: '씨앗',
  sprout: '새싹',
  growing: '성장',
  flowering: '개화',
  fruit: '열매',
};

export default function GrowthProgress({ stage, progressPercent }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.stageLabel}>{STAGE_LABELS[stage]}</Text>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.percentText}>{progressPercent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingHorizontal: 40 },
  stageLabel: { fontSize: 18, fontWeight: '600' },
  barBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 6 },
  percentText: { fontSize: 14, color: '#666' },
});
```

- [ ] **Step 3: ActionButton 컴포넌트**

`components/ActionButton.tsx`:

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function ActionButton({ label, description, onPress, disabled }: Props) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  disabled: { backgroundColor: '#ccc' },
  label: { fontSize: 16, fontWeight: '700', color: '#fff' },
  description: { fontSize: 12, color: '#ffffffcc', marginTop: 2 },
});
```

- [ ] **Step 4: HarvestModal 컴포넌트**

`components/HarvestModal.tsx`:

```tsx
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Harvest, FruitGrade } from '../lib/types';

interface Props {
  visible: boolean;
  harvest: Harvest | null;
  onClose: () => void;
}

const GRADE_COLORS: Record<FruitGrade, string> = {
  common: '#8BC34A',
  rare: '#2196F3',
  legendary: '#FF9800',
};

const GRADE_LABELS: Record<FruitGrade, string> = {
  common: '일반',
  rare: '희귀',
  legendary: '전설',
};

export default function HarvestModal({ visible, harvest, onClose }: Props) {
  if (!harvest) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>수확 완료!</Text>
          <Text style={[styles.grade, { color: GRADE_COLORS[harvest.grade] }]}>
            {GRADE_LABELS[harvest.grade]}
          </Text>
          <Text style={styles.fruit}>{harvest.fruit_type}</Text>
          <Text style={styles.reward}>+{harvest.reward_amount} 코인</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  grade: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  fruit: { fontSize: 32, marginBottom: 12 },
  reward: { fontSize: 20, fontWeight: '700', color: '#FF9800', marginBottom: 20 },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 5: 메인 화면 조합**

`app/(tabs)/index.tsx`:

```tsx
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { PlantStatus, Harvest } from '../../lib/types';
import PlantView from '../../components/PlantView';
import GrowthProgress from '../../components/GrowthProgress';
import ActionButton from '../../components/ActionButton';
import HarvestModal from '../../components/HarvestModal';

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<PlantStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [harvestResult, setHarvestResult] = useState<Harvest | null>(null);

  const fetchStatus = async () => {
    const { data, error } = await supabase.functions.invoke('get-plant-status');
    if (!error && data) setStatus(data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, 30000); // refresh every 30s
      return () => clearInterval(interval);
    }, [])
  );

  const handlePlantSeed = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke('plant-seed');
    if (error) Alert.alert('Error', error.message);
    await fetchStatus();
    setLoading(false);
  };

  const handleWater = async () => {
    // TODO: Show rewarded ad first, then call water
    setLoading(true);
    const { error } = await supabase.functions.invoke('water');
    if (error) Alert.alert('Error', error.message);
    await fetchStatus();
    setLoading(false);
  };

  const handleFertilize = async () => {
    // TODO: Show rewarded ad first, then call fertilize
    setLoading(true);
    const { error } = await supabase.functions.invoke('fertilize');
    if (error) Alert.alert('Error', error.message);
    await fetchStatus();
    setLoading(false);
  };

  const handleHarvest = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('harvest');
    if (error) {
      Alert.alert('Error', error.message);
    } else if (data?.harvest) {
      setHarvestResult(data.harvest);
      await refreshUser();
    }
    await fetchStatus();
    setLoading(false);
  };

  const hasPlant = status?.plant && !status.plant.harvested;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.balance}>{user?.balance ?? 0} 코인</Text>
      </View>

      {hasPlant ? (
        <>
          <PlantView stage={status!.stage} />
          <GrowthProgress stage={status!.stage} progressPercent={status!.progress_percent} />

          {status!.can_harvest ? (
            <Pressable style={styles.harvestButton} onPress={handleHarvest} disabled={loading}>
              <Text style={styles.harvestText}>수확하기</Text>
            </Pressable>
          ) : (
            <View style={styles.actions}>
              <ActionButton
                label="물주기"
                description="광고 시청 (+1시간)"
                onPress={handleWater}
                disabled={loading}
              />
              <ActionButton
                label="비료"
                description="광고 시청 (+3시간)"
                onPress={handleFertilize}
                disabled={loading}
              />
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>씨앗을 심어보세요!</Text>
          <Pressable style={styles.plantButton} onPress={handlePlantSeed} disabled={loading}>
            <Text style={styles.plantButtonText}>씨앗 심기</Text>
          </Pressable>
        </View>
      )}

      <HarvestModal
        visible={!!harvestResult}
        harvest={harvestResult}
        onClose={() => {
          setHarvestResult(null);
          fetchStatus();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, alignItems: 'flex-end' },
  balance: { fontSize: 18, fontWeight: '700', color: '#FF9800' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 24 },
  harvestButton: {
    backgroundColor: '#FF9800',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  harvestText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, color: '#666', marginBottom: 20 },
  plantButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  plantButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 6: placeholder 이미지 생성**

`assets/plants/` 디렉토리에 5개의 placeholder PNG 파일 생성 (seed.png, sprout.png, growing.png, flowering.png, fruit.png). 간단한 색상 원 또는 이모지 기반 이미지면 충분.

- [ ] **Step 7: 앱 실행 확인**

```bash
npx expo start
```

Expected: 로그인 후 메인 화면에서 씨앗 심기, 성장 상태 표시, 물주기/비료/수확 버튼 동작

- [ ] **Step 8: Commit**

```bash
git add components/ app/(tabs)/index.tsx assets/plants/
git commit -m "feat: add main plant screen with growth view and action buttons"
```

---

## Task 11: 탭 네비게이션 구성 + 상점 화면

**Files:**
- Create: `components/ShopItem.tsx`
- Modify: `app/(tabs)/_layout.tsx`, `app/(tabs)/shop.tsx`

- [ ] **Step 1: 탭 레이아웃 설정**

`app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#4CAF50' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '내 농장',
          tabBarIcon: ({ color }) => <MaterialIcons name="eco" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: '상점',
          tabBarIcon: ({ color }) => <MaterialIcons name="storefront" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: '아이템',
          tabBarIcon: ({ color }) => <MaterialIcons name="inventory-2" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="invite"
        options={{
          title: '초대',
          tabBarIcon: ({ color }) => <MaterialIcons name="person-add" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: ShopItem 컴포넌트**

`components/ShopItem.tsx`:

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ShopItem as ShopItemType } from '../lib/types';

interface Props {
  item: ShopItemType;
  owned: boolean;
  canAfford: boolean;
  onPurchase: () => void;
}

export default function ShopItem({ item, owned, canAfford, onPurchase }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.type}>{item.item_type === 'pot_skin' ? '화분' : '배경'}</Text>
      {owned ? (
        <Text style={styles.owned}>보유 중</Text>
      ) : (
        <Pressable
          style={[styles.buyButton, !canAfford && styles.disabled]}
          onPress={onPurchase}
          disabled={!canAfford}
        >
          <Text style={styles.buyText}>{item.price} 코인</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  type: { fontSize: 12, color: '#999', marginRight: 12 },
  owned: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  buyButton: { backgroundColor: '#FF9800', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  disabled: { backgroundColor: '#ccc' },
  buyText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 3: 상점 화면**

`app/(tabs)/shop.tsx`:

```tsx
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { ShopItem as ShopItemType, OwnedItem } from '../../lib/types';
import ShopItem from '../../components/ShopItem';

export default function ShopScreen() {
  const { user, refreshUser } = useAuth();
  const [shopItems, setShopItems] = useState<ShopItemType[]>([]);
  const [ownedKeys, setOwnedKeys] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    const [shopRes, ownedRes] = await Promise.all([
      supabase.from('shop_items').select('*').order('price'),
      supabase.from('items').select('item_key'),
    ]);
    if (shopRes.data) setShopItems(shopRes.data);
    if (ownedRes.data) setOwnedKeys(new Set(ownedRes.data.map((i) => i.item_key)));
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handlePurchase = async (itemId: string) => {
    const { data, error } = await supabase.functions.invoke('purchase', {
      body: { item_id: itemId },
    });
    if (error) {
      Alert.alert('구매 실패', error.message);
    } else {
      Alert.alert('구매 완료!');
      await refreshUser();
      await fetchData();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.balance}>{user?.balance ?? 0} 코인</Text>
      <FlatList
        data={shopItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShopItem
            item={item}
            owned={ownedKeys.has(item.id)}
            canAfford={(user?.balance ?? 0) >= item.price}
            onPurchase={() => handlePurchase(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  balance: { fontSize: 18, fontWeight: '700', color: '#FF9800', textAlign: 'right', padding: 16 },
  list: { padding: 16 },
});
```

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/_layout.tsx app/(tabs)/shop.tsx components/ShopItem.tsx
git commit -m "feat: add tab navigation and shop screen"
```

---

## Task 12: 인벤토리 + 초대 화면

**Files:**
- Create: `components/InventoryItem.tsx`
- Modify: `app/(tabs)/inventory.tsx`, `app/(tabs)/invite.tsx`

- [ ] **Step 1: InventoryItem 컴포넌트**

`components/InventoryItem.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { OwnedItem } from '../lib/types';

interface Props {
  item: OwnedItem;
}

const TYPE_LABELS = {
  pot_skin: '화분',
  background_skin: '배경',
};

export default function InventoryItem({ item }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.item_key}</Text>
      <Text style={styles.type}>{TYPE_LABELS[item.item_type]}</Text>
      {item.equipped && <Text style={styles.equipped}>장착 중</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  type: { fontSize: 12, color: '#999', marginRight: 12 },
  equipped: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
});
```

- [ ] **Step 2: 인벤토리 화면**

`app/(tabs)/inventory.tsx`:

```tsx
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { OwnedItem } from '../../lib/types';
import InventoryItem from '../../components/InventoryItem';

export default function InventoryScreen() {
  const [items, setItems] = useState<OwnedItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetch = async () => {
        const { data } = await supabase.from('items').select('*').order('created_at', { ascending: false });
        if (data) setItems(data);
      };
      fetch();
    }, [])
  );

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>보유한 아이템이 없습니다</Text>
          <Text style={styles.emptyHint}>상점에서 아이템을 구매해보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InventoryItem item={item} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  emptyHint: { fontSize: 14, color: '#999', marginTop: 8 },
});
```

- [ ] **Step 3: 초대 화면**

`app/(tabs)/invite.tsx`:

```tsx
import { View, Text, Pressable, StyleSheet, Alert, Share } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function InviteScreen() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.functions.invoke('create-invite');
      if (data?.invite_code) setInviteCode(data.invite_code);

      const { count } = await supabase
        .from('invites')
        .select('*', { count: 'exact', head: true })
        .eq('inviter_id', user?.id);
      setInviteCount(count ?? 0);
    };
    fetch();
  }, [user]);

  const handleShare = async () => {
    if (!inviteCode) return;
    const url = `https://app.example.com/invite/${inviteCode}`;
    await Share.share({
      message: `Grow Farm에서 식물을 함께 키워요! 🌱\n초대 링크: ${url}`,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>친구 초대</Text>
      <Text style={styles.description}>
        친구를 초대하면 양쪽 모두 50 코인을 받아요!
      </Text>

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>내 초대 코드</Text>
        <Text style={styles.code}>{inviteCode ?? '...'}</Text>
      </View>

      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareText}>초대 링크 공유하기</Text>
      </Pressable>

      <Text style={styles.stats}>지금까지 {inviteCount}명을 초대했어요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  description: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  codeBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  codeLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  code: { fontSize: 28, fontWeight: '700', letterSpacing: 4 },
  shareButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stats: { fontSize: 14, color: '#999' },
});
```

- [ ] **Step 4: Commit**

```bash
git add components/InventoryItem.tsx app/(tabs)/inventory.tsx app/(tabs)/invite.tsx
git commit -m "feat: add inventory and invite screens"
```

---

## Task 13: 딥링크 초대 코드 처리

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: 딥링크 핸들링 추가**

`app/_layout.tsx` 수정 — `RootLayoutNav` 안에 딥링크 처리 추가:

```tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading]);

  // Handle deep links for invite codes
  useEffect(() => {
    if (!session) return;

    const handleUrl = async (url: string) => {
      const parsed = Linking.parse(url);
      if (parsed.path?.startsWith('invite/')) {
        const inviteCode = parsed.path.replace('invite/', '');
        const { data, error } = await supabase.functions.invoke('redeem-invite', {
          body: { invite_code: inviteCode },
        });
        if (error) {
          Alert.alert('초대 코드 오류', error.message);
        } else {
          Alert.alert('환영합니다!', `${data.bonus} 코인을 받았어요!`);
        }
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, [session]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: app.json에 scheme 설정**

`app.json`의 `expo` 아래에 추가:

```json
{
  "expo": {
    "scheme": "growfarm"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx app.json
git commit -m "feat: add deep link handling for invite codes"
```

---

## Task 14: 보상형 광고 연동

**Files:**
- Install: `react-native-google-mobile-ads`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: 의존성 설치**

```bash
npx expo install react-native-google-mobile-ads
```

- [ ] **Step 2: app.json에 AdMob 설정 추가**

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-xxxxxxxx~xxxxxxxx",
          "iosAppId": "ca-app-pub-xxxxxxxx~xxxxxxxx"
        }
      ]
    ]
  }
}
```

PoC에서는 테스트 광고 ID를 사용합니다.

- [ ] **Step 3: 메인 화면에 보상형 광고 로직 추가**

`app/(tabs)/index.tsx`에서 `handleWater`와 `handleFertilize`를 수정:

```tsx
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

// 컴포넌트 외부 또는 상단에:
const rewardedAd = RewardedAd.createForAdRequest(TestIds.REWARDED);

// handleWater 수정:
const handleWater = async () => {
  setLoading(true);
  rewardedAd.load();

  const unsubLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedAd.show();
  });

  const unsubEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
    const { error } = await supabase.functions.invoke('water');
    if (error) Alert.alert('Error', error.message);
    await fetchStatus();
    setLoading(false);
    unsubLoaded();
    unsubEarned();
  });
};

// handleFertilize 수정 (동일 패턴):
const handleFertilize = async () => {
  setLoading(true);
  rewardedAd.load();

  const unsubLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedAd.show();
  });

  const unsubEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
    const { error } = await supabase.functions.invoke('fertilize');
    if (error) Alert.alert('Error', error.message);
    await fetchStatus();
    setLoading(false);
    unsubLoaded();
    unsubEarned();
  });
};
```

- [ ] **Step 4: 빌드 확인 (dev build 필요)**

```bash
npx expo prebuild
npx expo run:ios
```

Expected: 테스트 광고 표시 후 물주기/비료 동작

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: integrate rewarded ads for water and fertilize actions"
```

---

## Task 15: .gitignore + 환경 설정 정리

**Files:**
- Create: `.gitignore`, `.env.example`

- [ ] **Step 1: .gitignore 생성**

```
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
ios/
android/
```

- [ ] **Step 2: .env.example 생성**

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore .env.example
git commit -m "chore: add gitignore and env example"
```

---

## Task 16: 최종 통합 테스트

- [ ] **Step 1: Supabase 로컬 환경 시작**

```bash
npx supabase start
npx supabase db reset
npx supabase functions serve
```

- [ ] **Step 2: Expo 앱 시작**

```bash
npx expo start
```

- [ ] **Step 3: E2E 시나리오 수동 테스트**

1. 앱 실행 → 로그인 화면 표시
2. Google/Apple 로그인 → 메인 화면 이동
3. "씨앗 심기" → 씨앗 이미지 표시 + 프로그레스 바 0%
4. "물주기" → (광고 시청 후) 프로그레스 증가
5. "비료" → (광고 시청 후) 프로그레스 더 증가
6. 열매 단계 도달 → "수확하기" 버튼 표시
7. 수확 → 모달에 랜덤 열매 + 코인 표시
8. 상점 탭 → 아이템 목록 + 구매 가능
9. 아이템 구매 → 코인 차감 + 인벤토리에 표시
10. 초대 탭 → 초대 코드 표시 + 공유 동작

- [ ] **Step 4: 최종 Commit**

```bash
git add -A
git commit -m "chore: final integration adjustments"
```
