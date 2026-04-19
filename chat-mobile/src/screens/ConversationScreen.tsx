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
import { avatarColor, peerInitials, useTheme } from '../context/ThemeContext'
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

  const peerParts = title.split(' ')
  const peerName = peerParts[0] ?? ''
  const peerLast = peerParts.slice(1).join(' ')

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
            mine
              ? [styles.bubbleMineStyle, { shadowColor: '#6366f1' }]
              : [styles.bubbleTheirsStyle, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
        >
          <Text style={[styles.bubbleText, { color: mine ? '#fff' : colors.text }]}>
            {m.content}
          </Text>
          <Text style={[styles.meta, { color: mine ? 'rgba(255,255,255,0.55)' : colors.textMuted }]}>
            {new Date(m.createdAt).toLocaleString()}
            {mine && m.readByPeer ? ' · прочитано' : ''}
          </Text>

          {/* reactions */}
          <View style={styles.reactionsRow}>
            {(m.reactions ?? []).map((r) => (
              <Pressable
                key={`${m.id}-${r.value}`}
                style={[
                  styles.reactionChip,
                  {
                    borderColor: r.reactedByMe
                      ? 'rgba(16,185,129,0.5)'
                      : mine ? 'rgba(255,255,255,0.2)' : colors.border,
                    backgroundColor: r.reactedByMe ? 'rgba(16,185,129,0.15)' : 'transparent',
                  },
                ]}
                onPress={() => void onToggleReaction(m.id, r.reactedByMe, r.value)}
              >
                <Text style={{ color: mine ? '#fff' : colors.text, fontSize: 12 }}>
                  {r.value}{r.count > 1 ? ` ${r.count}` : ''}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[
                styles.reactionChip,
                { borderColor: mine ? 'rgba(255,255,255,0.2)' : colors.border },
              ]}
              onPress={() => setReactionPickerMessageId((prev) => (prev === m.id ? null : m.id))}
            >
              <Text style={{ color: mine ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontSize: 12 }}>+</Text>
            </Pressable>
          </View>

          {reactionPickerMessageId === m.id ? (
            <View
              style={[
                styles.pickerWrap,
                {
                  borderColor: mine ? 'rgba(255,255,255,0.15)' : colors.border,
                  backgroundColor: mine ? 'rgba(255,255,255,0.1)' : colors.surfaceMuted,
                },
              ]}
            >
              {reactionCatalog.map((value) => (
                <Pressable
                  key={`${m.id}-catalog-${value}`}
                  style={styles.reactionChoice}
                  onPress={() => void onToggleReaction(m.id, false, value)}
                >
                  <Text style={{ fontSize: 18 }}>{value}</Text>
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
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* top bar */}
        <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.primary }]}>‹</Text>
          </Pressable>
          <View style={[styles.peerAvatar, { backgroundColor: avatarColor(chatId) }]}>
            <Text style={styles.peerAvatarText}>{peerInitials(peerName, peerLast)}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={confirmDeleteChat} hitSlop={12}>
            <Text style={[styles.deleteText, { color: colors.danger }]}>Удалить</Text>
          </Pressable>
        </View>

        {/* messages */}
        {isMessagesLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
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

        {/* input */}
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text }]}
            placeholder="Сообщение…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={() => void onSend()}
            disabled={!text.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  backBtn: { width: 32 },
  backArrow: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
  peerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  peerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  title: { flex: 1, fontWeight: '700', fontSize: 16 },
  deleteText: { fontSize: 13, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12, paddingBottom: 8 },
  bubbleWrap: { marginBottom: 10, flexDirection: 'row' },
  bubbleMine: { justifyContent: 'flex-end' },
  bubbleTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMineStyle: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleTheirsStyle: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  meta: { fontSize: 10, marginTop: 4 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reactionChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    marginTop: 8,
  },
  reactionChoice: { padding: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 18 },
})
