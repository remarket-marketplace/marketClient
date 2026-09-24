export type LocalPendingSendState = 'sending' | 'failed'

type LocalPendingChatMessageBase = {
  id: string
  chat_room_id: string
  created_at: string
  client_created_at_ms: number
  sender_id: string
  status: LocalPendingSendState
  error_code?: string | null
  echo_timeout_id?: number | null
}

export type LocalPendingTextMessage = LocalPendingChatMessageBase & {
  message_type: 'text_message'
  text: string
}

export type LocalPendingImageMessage = LocalPendingChatMessageBase & {
  message_type: 'image_message'
  text: string
  files: File[]
  preview_urls: string[]
}

export type LocalPendingChatMessage =
  | LocalPendingTextMessage
  | LocalPendingImageMessage
