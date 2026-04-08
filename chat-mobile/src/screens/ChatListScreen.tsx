import React, { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  addReactionCatalogApi,
  deleteChatAsRootApi,
  fetchRootUserChatsApi,
  type RootManagedChatItem,
  restoreChatAsRootApi,
} from '../api/chats'
import { fetchUsersApi, updateUserRoleApi, type UserListItem } from '../api/users'
import type { MainStackParamList } from '../navigation/types'
import { useChat } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import type { ChatItem } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ChatList'>

export function ChatListScreen({ navigation }: Props) {
  const { logout } = useAuth()
  const {
    myLogin,
    myRole,
    chats,
    totalUnreadCount,
    search,
    setSearch,
    searchResults,
    isSearching,
    runSearch,
    createChatWith,
    fetchChats,
  } = useChat()
  const { mode, resolvedTheme, toggle, setMode, colors } = useTheme()
  const [isRootPanelOpen, setIsRootPanelOpen] = useState(false)
  const [newReactionValue, setNewReactionValue] = useState('')
  const [rootUsersRolesSearch, setRootUsersRolesSearch] = useState('')
  const [rootUsersChatsSearch, setRootUsersChatsSearch] = useState('')
  const [rootUsersForRoles, setRootUsersForRoles] = useState<UserListItem[]>([])
  const [rootUsersForChats, setRootUsersForChats] = useState<UserListItem[]>([])
  const [selectedRoleUser, setSelectedRoleUser] = useState<UserListItem | null>(null)
  const [selectedRootUser, setSelectedRootUser] = useState<UserListItem | null>(null)
  const [rootUserChats, setRootUserChats] = useState<RootManagedChatItem[]>([])
  const [isRootRolesLoading, setIsRootRolesLoading] = useState(false)
  const [isRootChatsLoading, setIsRootChatsLoading] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void fetchChats()
    }, [fetchChats]),
  )

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRolesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootChatsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  function onSearchChange(text: string) {
    setSearch(text)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      void runSearch(text)
    }, 350)
  }

  function onRootRolesSearchChange(text: string) {
    setRootUsersRolesSearch(text)
    if (rootRolesDebounce.current) clearTimeout(rootRolesDebounce.current)
    rootRolesDebounce.current = setTimeout(() => {
      void (async () => {
        setIsRootRolesLoading(true)
        try {
          setRootUsersForRoles(await fetchUsersApi(text, text.trim() ? 20 : 5))
        } finally {
          setIsRootRolesLoading(false)
        }
      })()
    }, 350)
  }

  function onRootChatsSearchChange(text: string) {
    setRootUsersChatsSearch(text)
    if (rootChatsDebounce.current) clearTimeout(rootChatsDebounce.current)
    rootChatsDebounce.current = setTimeout(() => {
      void (async () => {
        setIsRootChatsLoading(true)
        try {
          setRootUsersForChats(await fetchUsersApi(text, text.trim() ? 20 : 5))
        } finally {
          setIsRootChatsLoading(false)
        }
      })()
    }, 350)
  }

  async function onPickUser(userId: number) {
    try {
      const chat = await createChatWith(userId)
      navigation.navigate('Conversation', {
        chatId: chat.id,
        title: `${chat.peer.name} ${chat.peer.lastName}`.trim(),
      })
    } catch {
      /* handled in UI elsewhere */
    }
  }

  function openChat(chat: ChatItem) {
    navigation.navigate('Conversation', {
      chatId: chat.id,
      title: `${chat.peer.name} ${chat.peer.lastName}`.trim(),
    })
  }

  async function onAddReactionToCatalog() {
    const trimmed = newReactionValue.trim()
    if (!trimmed) return
    try {
      await addReactionCatalogApi(trimmed)
      setNewReactionValue('')
      Alert.alert('Готово', 'Реакция добавлена в общий каталог.')
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось добавить реакцию')
    }
  }

  async function onRoleChanged(userId: number, role: 'root' | 'admin' | 'user') {
    try {
      const updated = await updateUserRoleApi(userId, role)
      setSelectedRoleUser(updated)
      setRootUsersForRoles((prev) => prev.map((u) => (u.id === userId ? updated : u)))
      setRootUsersForChats((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось обновить роль')
    }
  }

  async function onPickRootUser(user: UserListItem) {
    setSelectedRootUser(user)
    setRootUsersChatsSearch(`${user.name} ${user.lastName} (${user.email})`)
    setIsRootChatsLoading(true)
    try {
      setRootUserChats(await fetchRootUserChatsApi(user.id))
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось загрузить чаты пользователя')
    } finally {
      setIsRootChatsLoading(false)
    }
  }

  async function onRestoreChatAsRoot(chatId: number) {
    if (!selectedRootUser) return
    await restoreChatAsRootApi(chatId)
    setRootUserChats(await fetchRootUserChatsApi(selectedRootUser.id))
  }

  async function onDeleteChatAsRoot(chatId: number) {
    if (!selectedRootUser) return
    await deleteChatAsRootApi(chatId)
    setRootUserChats(await fetchRootUserChatsApi(selectedRootUser.id))
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Чаты</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {myLogin || '—'} · {myRole}
              {totalUnreadCount > 0 ? (
                <Text style={[styles.badgeText, { color: colors.badge }]}>
                  {' '}
                  · непрочитано: {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              ) : null}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => void toggle()}
            >
              <Text style={[styles.outlineBtnText, { color: colors.text }]}>
                {resolvedTheme === 'dark' ? 'Светлая' : 'Темная'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => void logout()}
            >
              <Text style={[styles.outlineBtnText, { color: colors.text }]}>Выйти</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.modeRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {(['system', 'light', 'dark'] as const).map((themeMode) => (
            <Pressable
              key={themeMode}
              style={[
                styles.modeChip,
                {
                  borderColor: mode === themeMode ? colors.primary : colors.border,
                  backgroundColor: mode === themeMode ? `${colors.primary}22` : 'transparent',
                },
              ]}
              onPress={() => void setMode(themeMode)}
            >
              <Text style={{ color: colors.text }}>
                {themeMode === 'system' ? 'Система' : themeMode === 'light' ? 'Светлая' : 'Темная'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Выберите чат или найдите пользователя. Для телефона укажите в `.env` адрес API, если тестируете локальный backend.
        </Text>

        <TextInput
          style={[styles.search, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Поиск пользователя"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={onSearchChange}
          autoCapitalize="none"
        />
        {isSearching ? (
          <ActivityIndicator style={{ marginVertical: 8 }} color={colors.primary} />
        ) : search.trim() ? (
          searchResults.length === 0 ? (
            <Text style={[styles.muted, { color: colors.textMuted }]}>Ничего не найдено</Text>
          ) : (
            <View style={styles.searchList}>
              {searchResults.map((item) => (
                <Pressable
                  key={`u-${item.id}`}
                  style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => void onPickUser(item.id)}
                >
                  <Text style={[styles.peerName, { color: colors.text }]}>
                    {item.name} {item.lastName}
                  </Text>
                  <Text style={[styles.mutedSmall, { color: colors.textMuted }]}>{item.email}</Text>
                </Pressable>
              ))}
            </View>
          )
        ) : null}

        {myRole === 'root' ? (
          <View style={[styles.rootCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable style={styles.rootHeader} onPress={() => setIsRootPanelOpen((prev) => !prev)}>
              <Text style={[styles.rootTitle, { color: colors.text }]}>Панель root</Text>
              <Text style={{ color: colors.textMuted }}>{isRootPanelOpen ? 'Скрыть' : 'Показать'}</Text>
            </Pressable>

            {isRootPanelOpen ? (
              <>
                <Text style={[styles.rootLabel, { color: colors.textMuted }]}>Добавить реакцию в общий каталог</Text>
                <View style={styles.inlineRow}>
                  <TextInput
                    style={[
                      styles.inlineInput,
                      { borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text },
                    ]}
                    placeholder="Например: 🤖"
                    placeholderTextColor={colors.textMuted}
                    value={newReactionValue}
                    onChangeText={setNewReactionValue}
                  />
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: colors.surfaceStrong }]}
                    onPress={() => void onAddReactionToCatalog()}
                  >
                    <Text style={{ color: colors.textInverse }}>Добавить</Text>
                  </Pressable>
                </View>

                <Text style={[styles.rootLabel, { color: colors.textMuted }]}>Управление ролями</Text>
                <TextInput
                  style={[styles.search, { borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text }]}
                  placeholder="Выбери пользователя для роли"
                  placeholderTextColor={colors.textMuted}
                  value={rootUsersRolesSearch}
                  onChangeText={onRootRolesSearchChange}
                />
                {isRootRolesLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  rootUsersForRoles.map((u) => (
                    <Pressable
                      key={`role-${u.id}`}
                      style={[styles.rootRow, { borderColor: colors.border }]}
                      onPress={() => {
                        setSelectedRoleUser(u)
                        setRootUsersRolesSearch(`${u.name} ${u.lastName} (${u.email})`)
                      }}
                    >
                      <Text style={{ color: colors.text }}>
                        {u.name} {u.lastName}
                      </Text>
                      <Text style={{ color: colors.textMuted }}>{u.email} · {u.role}</Text>
                    </Pressable>
                  ))
                )}
                {selectedRoleUser ? (
                  <View style={styles.roleChoices}>
                    {(['user', 'admin', 'root'] as const).map((role) => (
                      <Pressable
                        key={`${selectedRoleUser.id}-${role}`}
                        style={[
                          styles.modeChip,
                          {
                            borderColor: selectedRoleUser.role === role ? colors.primary : colors.border,
                            backgroundColor: selectedRoleUser.role === role ? `${colors.primary}22` : 'transparent',
                          },
                        ]}
                        onPress={() => void onRoleChanged(selectedRoleUser.id, role)}
                      >
                        <Text style={{ color: colors.text }}>{role}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <Text style={[styles.rootLabel, { color: colors.textMuted }]}>Восстановление удаленных чатов</Text>
                <TextInput
                  style={[styles.search, { borderColor: colors.border, backgroundColor: colors.surfaceMuted, color: colors.text }]}
                  placeholder="Выбери пользователя (поиск)"
                  placeholderTextColor={colors.textMuted}
                  value={rootUsersChatsSearch}
                  onChangeText={onRootChatsSearchChange}
                />
                {isRootChatsLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  rootUsersForChats.map((u) => (
                    <Pressable
                      key={`chat-user-${u.id}`}
                      style={[styles.rootRow, { borderColor: colors.border }]}
                      onPress={() => void onPickRootUser(u)}
                    >
                      <Text style={{ color: colors.text }}>
                        {u.name} {u.lastName}
                      </Text>
                      <Text style={{ color: colors.textMuted }}>{u.email}</Text>
                    </Pressable>
                  ))
                )}
                {selectedRootUser ? (
                  <View style={styles.rootChatsWrap}>
                    {rootUserChats.map((chat) => (
                      <View
                        key={`root-chat-${chat.id}`}
                        style={[styles.rootChatCard, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
                      >
                        <Text style={{ color: colors.text, fontWeight: '600' }}>
                          {chat.peer.name} {chat.peer.lastName}
                        </Text>
                        <Text style={{ color: colors.textMuted }}>{chat.peer.email}</Text>
                        <Text style={{ color: chat.deletedAt ? colors.danger : colors.success }}>
                          {chat.deletedAt ? 'Удален' : 'Активен'}
                        </Text>
                        <View style={styles.inlineRow}>
                          {chat.deletedAt ? (
                            <Pressable
                              style={[styles.smallBtn, { backgroundColor: colors.success }]}
                              onPress={() => void onRestoreChatAsRoot(chat.id)}
                            >
                              <Text style={{ color: colors.textInverse }}>Восстановить</Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              style={[styles.smallBtn, { backgroundColor: colors.danger }]}
                              onPress={() => void onDeleteChatAsRoot(chat.id)}
                            >
                              <Text style={{ color: colors.textInverse }}>Удалить</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ваши чаты</Text>
        {chats.length === 0 ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>Пока нет чатов</Text>
        ) : (
          chats.map((item) => (
            <Pressable
              key={`c-${item.id}`}
              style={[styles.chatRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openChat(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.peerName, { color: colors.text }]}>
                  {item.peer.name} {item.peer.lastName}
                </Text>
                <Text numberOfLines={1} style={[styles.mutedSmall, { color: colors.textMuted }]}>
                  {item.lastMessage?.content ?? 'Нет сообщений'}
                </Text>
              </View>
              {(item.unreadCount ?? 0) > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: colors.badge }]}>
                  <Text style={styles.unreadBadgeText}>
                    {(item.unreadCount ?? 0) > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerActions: { gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  badgeText: { color: '#e11d48', fontWeight: '600' },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outlineBtnText: { fontSize: 14, color: '#334155' },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  modeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  search: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  muted: { color: '#64748b', marginVertical: 8 },
  mutedSmall: { color: '#64748b', fontSize: 13 },
  searchList: { marginBottom: 8 },
  searchRow: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontWeight: '600', marginTop: 8, marginBottom: 8 },
  rootCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  rootHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rootTitle: { fontSize: 18, fontWeight: '700' },
  rootLabel: { marginTop: 12, marginBottom: 8, fontSize: 12 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rootRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
  },
  roleChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  rootChatsWrap: { gap: 8, marginTop: 8 },
  rootChatCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  peerName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  unreadBadge: {
    backgroundColor: '#e11d48',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
