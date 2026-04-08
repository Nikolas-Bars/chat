import React, { useCallback, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '../navigation/types'
import { useChat } from '../context/ChatContext'
import { useTheme } from '../context/ThemeContext'
import type { ChatMessage } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'Conversation'>

export function ConversationScreen({ route, navigation }: Props) {
  const { chatId, title } = route.params
  const {
    currentUserId,
    messages,
    reactionCatalog,
    isMessagesLoading,
    isSending,
    selectChat,
    leaveConversation,
    sendMessage,
    setReaction,
    removeMyReaction,
    deleteChat,
  } = useChat()
  const { colors } = useTheme()
  const [text, setText] = React.useState('')
  const [reactionPickerMessageId, setReactionPickerMessageId] = React.useState<number | null>(null)
  const listRef = useRef<FlatList<ChatMessage>>(null)

  useFocusEffect(
    useCallback(() => {
      void selectChat(chatId)
      return () => leaveConversation()
    }, [chatId, selectChat, leaveConversation]),
  )

  function confirmDeleteChat() {
    Alert.alert('Удалить чат?', 'Диалог будет скрыт.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          void deleteChat().then(() => navigation.goBack())
        },
      },
    ])
  }

  async function onSend() {
    const t = text.trim()
    if (!t) return
    setText('')
    await sendMessage(t)
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }

  async function onToggleReaction(messageId: number, reactedByMe: boolean, value: string) {
    if (reactedByMe) {
      await removeMyReaction(messageId)
    } else {
      await setReaction(messageId, value)
    }
    setReactionPickerMessageId(null)
  }

  function renderMessage({ item: m }: { item: ChatMessage }) {
    const mine = m.senderId === currentUserId
    return (
      <View style={[styles.bubbleWrap, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: mine ? colors.surfaceStrong : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.bubbleText, { color: mine ? colors.textInverse : colors.text }]}>
            {m.content}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {new Date(m.createdAt).toLocaleString()}
            {mine && m.readByPeer ? ' · прочитано' : ''}
          </Text>
          <View style={styles.reactionsRow}>
            {(m.reactions ?? []).map((r) => (
              <Pressable
                key={`${m.id}-${r.value}`}
                style={[
                  styles.reactionChip,
                  {
                    borderColor: r.reactedByMe ? colors.success : colors.border,
                    backgroundColor: r.reactedByMe ? `${colors.success}22` : 'transparent',
                  },
                ]}
                onPress={() => void onToggleReaction(m.id, r.reactedByMe, r.value)}
              >
                <Text style={[styles.reactionChipText, { color: mine ? colors.textInverse : colors.text }]}>
                  {r.value}
                  {r.count > 1 ? ` ${r.count}` : ''}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.reactionChip, { borderColor: colors.border }]}
              onPress={() =>
                setReactionPickerMessageId((prev) => (prev === m.id ? null : m.id))
              }
            >
              <Text style={[styles.reactionChipText, { color: mine ? colors.textInverse : colors.text }]}>
                +
              </Text>
            </Pressable>
          </View>
          {reactionPickerMessageId === m.id ? (
            <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
              {reactionCatalog.map((value) => (
                <Pressable
                  key={`${m.id}-catalog-${value}`}
                  style={[styles.reactionChoice, { borderColor: colors.border }]}
                  onPress={() => void onToggleReaction(m.id, false, value)}
                >
                  <Text style={{ color: mine ? colors.textInverse : colors.text }}>{value}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={[styles.back, { color: colors.primary }]}>‹ Назад</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={confirmDeleteChat} hitSlop={12}>
            <Text style={[styles.delete, { color: colors.danger }]}>Удалить</Text>
          </Pressable>
        </View>

        {isMessagesLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => `m-${m.id}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceMuted,
                color: colors.text,
              },
            ]}
            placeholder="Сообщение…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: colors.surfaceStrong },
              (!text.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={() => void onSend()}
            disabled={!text.trim() || isSending}
          >
            <Text style={[styles.sendBtnText, { color: colors.textInverse }]}>
              {isSending ? '…' : 'Отпр.'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  back: { fontSize: 17, color: '#2563eb', width: 72 },
  title: { flex: 1, fontWeight: '700', fontSize: 17, textAlign: 'center' },
  delete: { color: '#b91c1c', fontSize: 14, width: 72, textAlign: 'right' },
  listContent: { padding: 12, paddingBottom: 8 },
  bubbleWrap: { marginBottom: 8, flexDirection: 'row' },
  bubbleMine: { justifyContent: 'flex-end' },
  bubbleTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  bubbleText: { fontSize: 16 },
  meta: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reactionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionChipText: { fontSize: 12, fontWeight: '600' },
  pickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
  },
  reactionChoice: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '600' },
})
