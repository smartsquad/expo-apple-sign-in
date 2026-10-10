import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { AppleAuth, AppleButton, type AppleCredential } from 'expo-apple-sign-in'

const clientId = process.env.EXPO_PUBLIC_APPLE_SERVICE_ID ?? ''
const redirectUri = process.env.EXPO_PUBLIC_APPLE_REDIRECT_URI ?? ''

export default function App() {
  const [message, setMessage] = useState('Tap Sign in with Apple')
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    if (clientId && redirectUri) {
      AppleAuth.configure({ clientId, redirectUri })
    }
    void AppleAuth.isAvailable().then(setAvailable)
  }, [])

  useEffect(() => {
    const subscription = AppleAuth.addRevokeListener(() =>
      setMessage('Apple revoked the credential')
    )

    return () => subscription.remove()
  }, [])

  const onSuccess = (credential: AppleCredential) => {
    setMessage(
      [
        `user: ${credential.user.id ?? 'none'}`,
        `email: ${credential.user.email ?? 'none'}`,
        `token: ${credential.identityToken.length} characters`,
      ].join('\n')
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>expo-apple-sign-in</Text>
      <Text style={styles.meta} testID="platform-meta">
        {Platform.OS} · available: {available == null ? '…' : available ? 'yes' : 'no'}
      </Text>

      <AppleButton
        testID="sign-in-button"
        buttonStyle="black"
        buttonType="signIn"
        style={styles.button}
        onSuccess={onSuccess}
        onCancel={() => setMessage('Canceled')}
        onError={(error) => setMessage(error.message)}
      />

      <Text style={styles.message} testID="status-message">
        {message}
      </Text>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  meta: {
    color: '#666',
    fontSize: 13,
  },
  button: {
    maxWidth: 320,
  },
  message: {
    color: '#333',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
})
