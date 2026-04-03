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
