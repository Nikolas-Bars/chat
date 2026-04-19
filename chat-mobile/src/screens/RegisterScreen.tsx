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
  const { colors } = useTheme()
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
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>Q</Text>
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>Создать аккаунт</Text>
            <Text style={[styles.subheading, { color: colors.textMuted }]}>Заполните форму для регистрации</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Field label="Имя" value={name} onChangeText={setName} colors={colors} />
              </View>
              <View style={styles.halfField}>
                <Field label="Фамилия" value={lastName} onChangeText={setLastName} colors={colors} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Field label="Возраст" value={age} onChangeText={setAge} keyboardType="number-pad" colors={colors} />
              </View>
              <View style={styles.halfField}>
                <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" colors={colors} />
              </View>
            </View>
            <Field label="Телефон" value={phone} onChangeText={setPhone} keyboardType="phone-pad" colors={colors} />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Field label="Пароль (6–20)" value={password} onChangeText={setPassword} secure colors={colors} />
              </View>
              <View style={styles.halfField}>
                <Field label="Повторите" value={passwordConfirm} onChangeText={setPasswordConfirm} secure colors={colors} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Field label="Должность" value={jobTitle} onChangeText={setJobTitle} placeholder="необязательно" colors={colors} />
              </View>
              <View style={styles.halfField}>
                <Field label="Компания" value={company} onChangeText={setCompany} placeholder="необязательно" colors={colors} />
              </View>
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Зарегистрироваться</Text>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>или</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Уже есть аккаунт — войти</Text>
            </Pressable>

            {success ? (
              <View style={[styles.msgBox, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
                <Text style={{ color: colors.success, fontSize: 14 }}>{success}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={[styles.msgBox, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
                <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

type FieldColors = { border: string; surfaceMuted: string; text: string; textMuted: string }

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
  autoCapitalize,
  placeholder,
  colors,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  secure?: boolean
  keyboardType?: 'default' | 'number-pad' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences'
  placeholder?: string
  colors: FieldColors
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        placeholderTextColor={colors.textMuted}
        placeholder={placeholder}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
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
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 12 },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { fontWeight: '600', fontSize: 15 },
  msgBox: { marginTop: 16, borderWidth: 1, borderRadius: 14, padding: 12 },
})
