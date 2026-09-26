import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  AppleAuth,
  AppleAuthError,
  AppleButton,
  isCancelledError,
  useAppleAuth,
  type AppleButtonStyle,
  type AppleCredential,
} from 'expo-apple-sign-in'

export default function App() {
  const [serviceId, setServiceId] = useState('')
  const [redirectUri, setRedirectUri] = useState('')
  const [buttonStyle, setButtonStyle] = useState<AppleButtonStyle>('black')
  const [log, setLog] = useState('Configure a Services ID for Android / web, then tap the button.')
  const { signIn, credential, isLoading, isAvailable, error, signOut } = useAppleAuth()

  const configured = useMemo(() => {
    AppleAuth.configure({
      clientId: serviceId || undefined,
      redirectUri: redirectUri || undefined,
    })
    return AppleAuth.isConfigured()
  }, [serviceId, redirectUri])

  const describe = (next: AppleCredential) => {
    const name = [next.user.givenName, next.user.familyName].filter(Boolean).join(' ')
    setLog(
      [
        `identityToken: ${next.identityToken.slice(0, 28)}…`,
        `nonce: ${next.nonce.slice(0, 16)}…`,
        `user: ${next.user.id ?? '-'}`,
        `email: ${next.user.email ?? '-'}`,
        `name: ${name || '-'}`,
      ].join('\n')
    )
  }

  const onHeadless = async () => {
    try {
      const next = await signIn()
      if (next) describe(next)
      else setLog('Canceled.')
    } catch (caught) {
      if (isCancelledError(caught)) {
        setLog('Canceled.')
        return
      }
      setLog(caught instanceof AppleAuthError ? caught.message : String(caught))
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>expo-apple-sign-in</Text>
        <Text style={styles.title}>One API. Every platform.</Text>
        <Text style={styles.subtitle}>
          iOS uses AuthenticationServices. Android and web use your Services ID. The nonce is hashed
          for Apple and returned raw for Supabase, Clerk, and Firebase.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Services ID (Android + web)</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="com.example.app.service"
            placeholderTextColor="#8a8a8a"
            style={styles.input}
            value={serviceId}
            onChangeText={setServiceId}
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://your-app.com/auth/callback"
            placeholderTextColor="#8a8a8a"
            style={styles.input}
            value={redirectUri}
            onChangeText={setRedirectUri}
          />
          <Text style={styles.meta}>
            Available: {isAvailable ? 'yes' : 'no'} · Configured: {configured ? 'yes' : 'iOS only'}
          </Text>
        </View>

        <View style={styles.row}>
          {(['black', 'white', 'whiteOutline'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setButtonStyle(value)}
              style={[styles.chip, buttonStyle === value && styles.chipActive]}>
              <Text style={[styles.chipLabel, buttonStyle === value && styles.chipLabelActive]}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        <AppleButton
          buttonStyle={buttonStyle}
          buttonType="signIn"
          cornerRadius={12}
          onSuccess={describe}
          onError={(next) => setLog(next.message)}
          onCancel={() => setLog('Canceled.')}
        />

        <Pressable style={styles.ghost} onPress={onHeadless}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ghostLabel}>useAppleAuth()</Text>
          )}
        </Pressable>

        {credential ? (
          <Pressable style={styles.ghost} onPress={() => signOut()}>
            <Text style={styles.ghostLabel}>Sign out locally</Text>
          </Pressable>
        ) : null}

        <View style={styles.log}>
          <Text style={styles.logText}>{error ? error.message : log}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0b0c' },
  content: { padding: 24, gap: 16, paddingBottom: 48 },
  kicker: { color: '#a1a1aa', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: '#c4c4cc', fontSize: 16, lineHeight: 22 },
  card: { backgroundColor: '#17171a', borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#0b0b0c',
    borderColor: '#2a2a2e',
    borderWidth: 1,
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meta: { color: '#8a8a8a', fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderColor: '#2a2a2e',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  chipLabel: { color: '#fff', fontSize: 13 },
  chipLabelActive: { color: '#000' },
  ghost: {
    alignItems: 'center',
    borderColor: '#2a2a2e',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  ghostLabel: { color: '#fff', fontWeight: '600' },
  log: { backgroundColor: '#111114', borderRadius: 12, padding: 14 },
  logText: { color: '#d4d4d8', fontFamily: 'Menlo', fontSize: 12, lineHeight: 18 },
})
