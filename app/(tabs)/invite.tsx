import { View, Text, Pressable, StyleSheet, Share } from 'react-native';
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
