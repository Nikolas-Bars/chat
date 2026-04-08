import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../navigation/types'
import { registerApi } from '../api/register'
import { useTheme } from '../context/ThemeContext'

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>

export function RegisterScreen({ navigation }: Props) {
  const { resolvedTheme, toggle, colors } = useTheme()
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function onSubmit() {
    setError('')
    setSuccess('')
    if (password.length < 6 || password.length > 20) {
      setError('Пароль: от 6 до 20 символов')
      return
    }
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают')
      return
    }
    const ageNum = parseInt(age, 10)
    if (!Number.isInteger(ageNum) || ageNum < 0) {
      setError('Укажите возраст целым числом (не меньше 0)')
      return
    }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        lastName: lastName.trim(),
        age: ageNum,
        password,
        email: email.trim(),
        phone: phone.trim(),
      }
      const jt = jobTitle.trim()
      const co = company.trim()
      if (jt) body.jobTitle = jt
      if (co) body.company = co
      await registerApi(body)
      setSuccess('Аккаунт создан. Теперь можно войти.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось зарегистрироваться')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={[styles.outer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.topActions}>
            <Pressable
              style={[styles.themeBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => void toggle()}
            >
              <Text style={{ color: colors.text }}>
                {resolvedTheme === 'dark' ? 'Светлая тема' : 'Темная тема'}
              </Text>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Регистрация</Text>
          <Field label="Имя" value={name} onChangeText={setName} />
          <Field label="Фамилия" value={lastName} onChangeText={setLastName} />
          <Field label="Возраст" value={age} onChangeText={setAge} keyboardType="number-pad" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <Field label="Телефон" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Пароль" value={password} onChangeText={setPassword} secure />
          <Field
            label="Пароль ещё раз"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secure
          />
          <Field label="Должность (необязательно)" value={jobTitle} onChangeText={setJobTitle} />
          <Field label="Компания (необязательно)" value={company} onChangeText={setCompany} />
          <Pressable
            style={[styles.button, { backgroundColor: colors.surfaceStrong }, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>Зарегистрироваться</Text>
            )}
          </Pressable>
          <Pressable style={styles.link} onPress={() => navigation.goBack()}>
            <Text style={[styles.linkText, { color: colors.textMuted }]}>Назад к входу</Text>
          </Pressable>
            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
            {success ? <Text style={[styles.success, { color: colors.success }]}>{success}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
  autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  secure?: boolean
  keyboardType?: 'default' | 'number-pad' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences'
}) {
  const { colors } = useTheme()
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  outer: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, paddingBottom: 40 },
  topActions: { alignItems: 'flex-end', marginBottom: 12 },
  themeBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 13, color: '#475569', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#334155' },
  error: { marginTop: 12, color: '#b91c1c' },
  success: { marginTop: 12, color: '#15803d' },
})
