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
