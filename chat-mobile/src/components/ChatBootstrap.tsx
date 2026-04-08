import { useEffect } from 'react'
import { useChat } from '../context/ChatContext'

export function ChatBootstrap() {
  const { fetchMe, fetchChats, fetchReactionCatalog } = useChat()
  useEffect(() => {
    void fetchMe()
    void fetchChats()
    void fetchReactionCatalog()
  }, [fetchMe, fetchChats, fetchReactionCatalog])
  return null
}
