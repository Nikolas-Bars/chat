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
import { avatarColor, peerInitials, useTheme } from '../context/ThemeContext'
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
    searchDebounce.current = setTimeout(() => void runSearch(text), 350)
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
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={styles.myAvatar}>
              <Text style={styles.myAvatarText}>{(myLogin?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View>
              <View style={styles.headerNameRow}>
                <Text style={[styles.headerName, { color: colors.text }]}>{myLogin || '—'}</Text>
                <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>{myRole}</Text>
                </View>
                {totalUnreadCount > 0 ? (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.badge }]}>
                    <Text style={styles.unreadBadgeText}>
                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>Chat Q</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {myRole === 'root' ? (
              <Pressable
                style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => setIsRootPanelOpen((p) => !p)}
              >
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>⚙</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}
              onPress={() => void toggle()}
            >
              <Text style={{ fontSize: 16 }}>{resolvedTheme === 'dark' ? '🌙' : '☀️'}</Text>
            </Pressable>
            <Pressable
              style={[styles.outlineBtn, { borderColor: colors.border }]}
              onPress={() => void logout()}
            >
              <Text style={[styles.outlineBtnText, { color: colors.textMuted }]}>Выйти</Text>
            </Pressable>
          </View>
        </View>
          

        {/* search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted, fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Поиск пользователя…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={onSearchChange}
            autoCapitalize="none"
          />
        </View>

        {isSearching ? (
          <ActivityIndicator style={{ marginVertical: 12 }} color={colors.primary} />
        ) : search.trim() ? (
          searchResults.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Ничего не найдено</Text>
          ) : (
            <View style={styles.searchList}>
              {searchResults.map((item) => (
                <Pressable
                  key={`u-${item.id}`}
                  style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => void onPickUser(item.id)}
                >
                  <View style={[styles.avatar, { backgroundColor: avatarColor(item.id) }]}>
                    <Text style={styles.avatarText}>{peerInitials(item.name, item.lastName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.peerName, { color: colors.text }]}>{item.name} {item.lastName}</Text>
                    <Text style={[styles.mutedSmall, { color: colors.textMuted }]}>{item.email}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ) : null}

        {/* root panel */}
        {myRole === 'root' ? (
          <View style={[styles.rootCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable style={styles.rootHeader} onPress={() => setIsRootPanelOpen((prev) => !prev)}>
              <Text style={[styles.rootTitle, { color: colors.text }]}>Панель root</Text>
              <Text style={[styles.rootToggle, { color: colors.primary }]}>{isRootPanelOpen ? 'Скрыть' : 'Показать'}</Text>
            </Pressable>

            {isRootPanelOpen ? (
              <>
                <View style={[styles.rootSection, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderMuted }]}>
                  <Text style={[styles.rootLabel, { color: colors.textMuted }]}>Добавить реакцию</Text>
                  <View style={styles.inlineRow}>
                    <TextInput
                      style={[styles.inlineInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                      placeholder="🤖"
                      placeholderTextColor={colors.textMuted}
                      value={newReactionValue}
                      onChangeText={setNewReactionValue}
                    />
                    <Pressable style={styles.primaryBtn} onPress={() => void onAddReactionToCatalog()}>
                      <Text style={styles.primaryBtnText}>Добавить</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.rootSection, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderMuted }]}>
                  <Text style={[styles.rootLabel, { color: colors.textMuted }]}>Управление ролями</Text>
                  <TextInput
                    style={[styles.rootInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="Поиск пользователя…"
                    placeholderTextColor={colors.textMuted}
                    value={rootUsersRolesSearch}
                    onChangeText={onRootRolesSearchChange}
                  />
                  {isRootRolesLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
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
                        <Text style={{ color: colors.text, fontWeight: '500' }}>{u.name} {u.lastName}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{u.email} · {u.role}</Text>
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
                              backgroundColor: selectedRoleUser.role === role ? colors.primaryLight : 'transparent',
                            },
                          ]}
                          onPress={() => void onRoleChanged(selectedRoleUser.id, role)}
                        >
                          <Text style={{ color: selectedRoleUser.role === role ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 13 }}>{role}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={[styles.rootSection, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderMuted }]}>
                  <Text style={[styles.rootLabel, { color: colors.textMuted }]}>Восстановление чатов</Text>
                  <TextInput
                    style={[styles.rootInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="Поиск пользователя…"
                    placeholderTextColor={colors.textMuted}
                    value={rootUsersChatsSearch}
                    onChangeText={onRootChatsSearchChange}
                  />
                  {isRootChatsLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
                  ) : (
                    rootUsersForChats.map((u) => (
                      <Pressable
                        key={`chat-user-${u.id}`}
                        style={[styles.rootRow, { borderColor: colors.border }]}
                        onPress={() => void onPickRootUser(u)}
                      >
                        <Text style={{ color: colors.text, fontWeight: '500' }}>{u.name} {u.lastName}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{u.email}</Text>
                      </Pressable>
                    ))
                  )}
                  {selectedRootUser ? (
                    <View style={{ gap: 8, marginTop: 8 }}>
                      {rootUserChats.map((chat) => (
                        <View key={`root-chat-${chat.id}`} style={[styles.rootChatCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                          <Text style={{ color: colors.text, fontWeight: '600' }}>{chat.peer.name} {chat.peer.lastName}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{chat.peer.email}</Text>
                          <Text style={{ color: chat.deletedAt ? colors.danger : colors.success, fontWeight: '600', fontSize: 12 }}>
                            {chat.deletedAt ? 'Удалён' : 'Активен'}
                          </Text>
                          {chat.deletedAt ? (
                            <Pressable style={[styles.smallActionBtn, { backgroundColor: colors.successLight }]} onPress={() => void onRestoreChatAsRoot(chat.id)}>
                              <Text style={{ color: colors.success, fontWeight: '600', fontSize: 13 }}>Восстановить</Text>
                            </Pressable>
                          ) : (
                            <Pressable style={[styles.smallActionBtn, { backgroundColor: colors.dangerLight }]} onPress={() => void onDeleteChatAsRoot(chat.id)}>
                              <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>Удалить</Text>
                            </Pressable>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* chat list */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ваши чаты</Text>
        {chats.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Пока нет чатов</Text>
          </View>
        ) : (
          chats.map((item) => (
            <Pressable
              key={`c-${item.id}`}
              style={[styles.chatRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openChat(item)}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor(item.peer.id) }]}>
                <Text style={styles.avatarText}>{peerInitials(item.peer.name, item.peer.lastName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.chatRowTop}>
                  <Text style={[styles.peerName, { color: colors.text }]} numberOfLines={1}>
                    {item.peer.name} {item.peer.lastName}
                  </Text>
                  {(item.unreadCount ?? 0) > 0 ? (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.badge }]}>
                      <Text style={styles.unreadBadgeText}>
                        {(item.unreadCount ?? 0) > 99 ? '99+' : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={[styles.lastMsg, { color: colors.textMuted }]}>
                  {item.lastMessage?.content ?? 'Нет сообщений'}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  myAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  myAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { fontSize: 15, fontWeight: '700' },
  roleBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerSub: { fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  outlineBtnText: { fontSize: 13, fontWeight: '500' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  emptyWrap: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  searchList: { marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, marginBottom: 6, borderWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  peerName: { fontSize: 15, fontWeight: '600' },
  mutedSmall: { fontSize: 12 },
  sectionTitle: { fontWeight: '700', fontSize: 16, marginTop: 8, marginBottom: 10 },
  rootCard: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 14 },
  rootHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rootTitle: { fontSize: 16, fontWeight: '700' },
  rootToggle: { fontWeight: '600', fontSize: 13 },
  rootSection: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 12 },
  rootLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  rootInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 6 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  primaryBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  smallActionBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginTop: 4 },
  rootRow: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 6 },
  roleChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rootChatCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 1 },
  chatRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lastMsg: { fontSize: 13, marginTop: 2 },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
