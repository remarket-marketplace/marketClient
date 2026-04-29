type TimelineMessageWithOptionalSender = {
  message_type: string
  created_at?: string
  sender_id?: string
}

const SAME_SENDER_MESSAGE_SPACING_CLASS = 'mb-1'
const DIFFERENT_SENDER_MESSAGE_SPACING_CLASS = 'mb-3'
const MESSAGE_GROUP_TIME_GAP_MS = 5 * 60 * 1000

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

function getTimelineMessageTimestamp(message: TimelineMessageWithOptionalSender | undefined): number | null {
  if (!message?.created_at) return null

  const timestamp = new Date(message.created_at).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function hasLargeTimeGap(
  currentMessage: TimelineMessageWithOptionalSender | undefined,
  nextMessage: TimelineMessageWithOptionalSender | undefined,
): boolean {
  const currentTimestamp = getTimelineMessageTimestamp(currentMessage)
  const nextTimestamp = getTimelineMessageTimestamp(nextMessage)

  if (currentTimestamp === null || nextTimestamp === null) return false
  return nextTimestamp - currentTimestamp >= MESSAGE_GROUP_TIME_GAP_MS
}

export function getChatTimelineSpacingClass(
  messages: TimelineMessageWithOptionalSender[],
  index: number,
): string {
  const currentMessage = messages[index]
  const nextMessage = messages[index + 1]
  const currentSenderKey = getTimelineSenderKey(currentMessage)
  const nextSenderKey = getTimelineSenderKey(nextMessage)

  if (
    currentSenderKey
    && nextSenderKey
    && currentSenderKey === nextSenderKey
    && !hasLargeTimeGap(currentMessage, nextMessage)
  ) {
    return SAME_SENDER_MESSAGE_SPACING_CLASS
  }

  return DIFFERENT_SENDER_MESSAGE_SPACING_CLASS
}
