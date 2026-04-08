import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { ChatProvider } from '../context/ChatContext'
import { ChatBootstrap } from '../components/ChatBootstrap'
import { ChatSocketListener } from '../components/ChatSocketListener'
import { LoginScreen } from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { ChatListScreen } from '../screens/ChatListScreen'
import { ConversationScreen } from '../screens/ConversationScreen'
import type { AuthStackParamList, MainStackParamList } from './types'

const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const MainStack = createNativeStackNavigator<MainStackParamList>()

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  )
}

function MainNavigator() {
  return (
    <ChatProvider>
      <ChatBootstrap />
      <ChatSocketListener />
      <MainStack.Navigator>
        <MainStack.Screen
          name="ChatList"
          component={ChatListScreen}
          options={{ title: 'Чаты', headerShown: false }}
        />
        <MainStack.Screen
          name="Conversation"
          component={ConversationScreen}
          options={{ headerShown: false }}
        />
      </MainStack.Navigator>
    </ChatProvider>
  )
}

export function RootNavigator() {
  const { token, loading } = useAuth()
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    )
  }
  return token ? <MainNavigator /> : <AuthNavigator />
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
})

export function AppNavigation() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  )
}
