export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

export type MainStackParamList = {
  ChatList: undefined
  Conversation: { chatId: number; title: string }
}
