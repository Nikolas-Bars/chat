import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/context/AuthContext'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { AppNavigation } from './src/navigation/RootNavigator'

function AppShell() {
  const { resolvedTheme } = useTheme()

  return (
    <AuthProvider>
      <AppNavigation />
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </AuthProvider>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
