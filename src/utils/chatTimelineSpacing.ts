type TimelineMessageWithOptionalSender = {
  message_type: string
  sender_id?: string
}

const SAME_SENDER_MESSAGE_SPACING_CLASS = 'mb-1'
const DIFFERENT_SENDER_MESSAGE_SPACING_CLASS = 'mb-3'

function getTimelineSenderKey(message: TimelineMessageWithOptionalSender | undefined): string | null {
  if (!message) return null

  if (
    (message.message_type === 'text_message' || message.message_type === 'image_message')
    && typeof message.sender_id === 'string'
    && message.sender_id.length > 0
  ) {
    return message.sender_id
  }

  return null
}

export function getChatTimelineSpacingClass(
  messages: TimelineMessageWithOptionalSender[],
  index: number,
): string {
  const currentSenderKey = getTimelineSenderKey(messages[index])
  const nextSenderKey = getTimelineSenderKey(messages[index + 1])

  if (currentSenderKey && nextSenderKey && currentSenderKey === nextSenderKey) {
    return SAME_SENDER_MESSAGE_SPACING_CLASS
  }

  return DIFFERENT_SENDER_MESSAGE_SPACING_CLASS
}
