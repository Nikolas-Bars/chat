import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../navigation/types'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth()
  const { resolvedTheme, toggle, colors } = useTheme()
  const [loginOrEmail, setLoginOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit() {
    setError('')
    setLoading(true)
    try {
      await login(loginOrEmail.trim(), password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topActions}>
          <Pressable
            style={[styles.themeBtn, { backgroundColor: colors.surfaceMuted }]}
            onPress={() => void toggle()}
          >
            <Text style={[styles.themeBtnText, { color: colors.textMuted }]}>
              {resolvedTheme === 'dark' ? '🌙' : '☀️'} {resolvedTheme === 'dark' ? 'Тёмная' : 'Светлая'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Q</Text>
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>Добро пожаловать</Text>
          <Text style={[styles.subheading, { color: colors.textMuted }]}>Войдите, чтобы продолжить</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Логин или email</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
            value={loginOrEmail}
            onChangeText={setLoginOrEmail}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Пароль</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Войти</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>или</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Создать аккаунт</Text>
          </Pressable>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  topActions: { position: 'absolute', top: 16, right: 24, zIndex: 1 },
  themeBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  themeBtnText: { fontSize: 13, fontWeight: '500' },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heading: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subheading: { fontSize: 14, marginTop: 4 },
  card: { borderRadius: 20, padding: 20, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 12 },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { fontWeight: '600', fontSize: 15 },
  errorBox: { marginTop: 16, borderWidth: 1, borderRadius: 14, padding: 12 },
  errorText: { fontSize: 14 },
})
