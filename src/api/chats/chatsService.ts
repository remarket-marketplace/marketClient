import {
  ChatArrayUnionSchema,
  ChatMessageUnionSchema,
  ChatUpdateSchema,
  MessagesReadSchema,
  ProductMessageSchema,
  type ChatMessageUnion,
  type MessagesReadPayload,
  type PurchaseMessage,
} from "@/validation/chat/chatMessage";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { httpClient } from "..";
import { ChatListSchema } from "@/validation/chat/ChatList";
import {
  RefusalReasonsListSchema,
  type RefusalReasonsList,
} from "@/validation/deal/deal";
import {
  InboxNotificationSchema,
  type InboxNotification,
} from "@/validation/user/inboxNotifications";

let socket: Socket | null = null;

type MessageCallback = (message: ChatMessageUnion) => void;
type DealStatusUpdateMessage = Extract<ChatMessageUnion, { message_type: "update_deal_status_message" }>;
type DealStatusUpdateCallback = (message: DealStatusUpdateMessage) => void;
type ChatUpdatedCallback = (data: ChatUpdateSchema) => void;
type ChatNotificationCallback = (data: ChatUpdateSchema) => void;
type MessagesReadCallback = (data: MessagesReadPayload) => void;
type NotificationCreatedCallback = (data: InboxNotification) => void;

const WS_API_HOST = import.meta.env.VITE_WS_API_HOST;

const newMessageCallbacks: MessageCallback[] = [];
const dealStatusUpdateCallbacks: DealStatusUpdateCallback[] = [];
const chatUpdatedCallbacks: ChatUpdatedCallback[] = [];
const chatNotificationCallbacks: ChatNotificationCallback[] = [];
const messagesReadCallbacks: MessagesReadCallback[] = [];
const notificationCreatedCallbacks: NotificationCreatedCallback[] = [];

let lastSubscribedChatId: string | null = null;
let heartbeatIntervalHandle: number | null = null;
let onlineHandlerRegistered = false;
let visibilityHandlerRegistered = false;

function parseChatUpdatePayload(data: any): ChatUpdateSchema | null {
  const chatId = typeof data?.chat_id === "string" ? data.chat_id : null;
  const unreadCount = typeof data?.unread_count === "number" ? data.unread_count : 0;

  if (!chatId) {
    return null;
  }

  const rawLastMessage = data?.last_message
    ? data.last_message.message ?? data.last_message
    : undefined;

  let lastMessage: ChatMessageUnion | undefined;
  if (rawLastMessage) {
    try {
      lastMessage = ChatMessageUnionSchema.parse(rawLastMessage);
    } catch (error) {
      console.warn("Skipping invalid chat_updated last_message payload", error, rawLastMessage);
    }
  }

  return {
    chat_id: chatId,
    last_message: lastMessage,
    unread_count: unreadCount,
  };
}

export const chatsService = {
  async getChats() {
    try {
      const response = await httpClient.get("/chats/");
      return ChatListSchema.parse(response.data);
    } catch (e) {
      console.error("Error fetching chat list:", e);
      return [];
    }
  },

  isConnected() {
    return socket?.connected === true;
  },

  /** Connection with proper error handling */
  async connectChatsWebsocket(): Promise<boolean> {
    return new Promise((resolve) => {
      if (socket?.connected) return resolve(true);

      socket = io(`${WS_API_HOST}`, {
        transports: ["websocket"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      socket.on("connect", () => {
        console.log("%cWS connected ✓", "color: green");
        if (lastSubscribedChatId) {
          socket!.emit("join_room", { chat_id: lastSubscribedChatId });
        }
        socket!.emit("subscribe_chat_list");
        if (!heartbeatIntervalHandle) {
          heartbeatIntervalHandle = window.setInterval(() => {
            if (socket?.connected) {
              socket!.emit("ping_alive");
            }
          }, 15000);
        }
        if (!onlineHandlerRegistered) {
          window.addEventListener("online", () => {
            this.connectChatsWebsocket();
          });
          window.addEventListener("offline", () => {
            console.warn("Network offline");
          });
          onlineHandlerRegistered = true;
        }
        if (!visibilityHandlerRegistered) {
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              this.connectChatsWebsocket();
            }
          });
          visibilityHandlerRegistered = true;
        }
        resolve(true);
      });

      socket.on("connect_error", (err) => {
        console.error("WS connect error:", err);
        resolve(false);
      });

      socket.on("disconnect", (reason) => {
        console.warn("WS disconnected:", reason);
      });

      socket.on("reconnect", () => {
        console.log("%cWS reconnected ✓", "color: orange");
        if (lastSubscribedChatId) {
          socket!.emit("join_room", { chat_id: lastSubscribedChatId });
        }
        socket!.emit("subscribe_chat_list");
      });

      socket.on("new_message", (data: any) => {
        try {
          const payload = data.message ?? data;
          const validated = ChatMessageUnionSchema.parse(payload);
          if (validated.message_type === "update_deal_status_message") {
            dealStatusUpdateCallbacks.forEach((cb) => cb(validated));
            if (validated.new_status === "disputed") {
              newMessageCallbacks.forEach((cb) => cb(validated));
            }
            return;
          }
          newMessageCallbacks.forEach((cb) => cb(validated));
        } catch (e) {
          console.error("Error validating new message:", e);
        }
      });

      socket.on("chat_updated", (data: any) => {
        const validated = parseChatUpdatePayload(data);
        if (!validated) {
          console.error("Error validating chat update:", data);
          return;
        }
        chatUpdatedCallbacks.forEach((cb) => cb(validated));
      });

      socket.on("chat_notification", (data: any) => {
        const validated = parseChatUpdatePayload(data);
        if (!validated) {
          console.error("Error validating chat notification:", data);
          return;
        }
        chatNotificationCallbacks.forEach((cb) => cb(validated));
      });

      socket.on("messages_read", (data: any) => {
        try {
          const validated = MessagesReadSchema.parse(data);
          messagesReadCallbacks.forEach((cb) => cb(validated));
        } catch (e) {
          console.error("Error validating messages_read event:", e);
        }
      });

      socket.on("notification_created", (data: any) => {
        try {
          const validated = InboxNotificationSchema.parse(data);
          notificationCreatedCallbacks.forEach((cb) => cb(validated));
        } catch (e) {
          console.error("Error validating notification_created event:", e);
        }
      });
    });
  },

  async subscribeChatList() {
    if (!this.isConnected())
      return console.warn("WS offline: subscribeChatList skipped");
    socket!.emit("subscribe_chat_list");
  },

  async unsubscribeChatList() {
    if (!this.isConnected()) return;
    socket!.emit("unsubscribe_chat_list");
  },

  async joinChat(chatId: string) {
    lastSubscribedChatId = chatId;
    if (!this.isConnected()) {
      console.warn("WS offline: joinChat scheduled");
      return;
    }
    socket!.emit("join_room", { chat_id: chatId });
  },

  async getChatMessages(
    chatId: string,
    page: number,
    perPage: number
  ): Promise<{
    messages: ChatMessageUnion[];
    latestDealMessage: PurchaseMessage | null;
    totalPages: number;
    currentPage: number;
    total: number;
  }> {
    try {
      const response = await httpClient.get(`/chats/${chatId}/messages`, {
        params: {
          page,
          per_page: perPage,
        },
      });
      const messages = ChatArrayUnionSchema.parse(response.data.messages);
      const latestDealMessage = response.data.latest_deal_message
        ? ProductMessageSchema.parse(response.data.latest_deal_message)
        : null;

      return {
        messages: messages.reverse(),
        latestDealMessage,
        totalPages: response.data.total_pages,
        currentPage: response.data.page || page,
        total: response.data.total,
      };
    } catch (e) {
      return {
        messages: [],
        latestDealMessage: null,
        totalPages: 0,
        currentPage: page,
        total: 0,
      };
    }
  },

  async markChatRead(chatId: string): Promise<boolean> {
    try {
      await httpClient.post(`/chats/${chatId}/read`);
      return true;
    } catch (e) {
      console.error("markChatRead error", e);
      return false;
    }
  },

    async getChatMessagesByDealId(
    dealId: string,
    page: number,
    perPage: number
  ): Promise<{
    messages: ChatMessageUnion[];
    latestDealMessage: PurchaseMessage | null;
    totalPages: number;
    currentPage: number;
    total: number;
  }> {
    try {
      const response = await httpClient.get(`/chats/messages-by-deal-id/${dealId}`, {
        params: {
          page,
          per_page: perPage,
        },
      });
      const messages = ChatArrayUnionSchema.parse(response.data.messages);
      const latestDealMessage = response.data.latest_deal_message
        ? ProductMessageSchema.parse(response.data.latest_deal_message)
        : null;

      return {
        messages: messages.reverse(),
        latestDealMessage,
        totalPages: response.data.total_pages,
        currentPage: response.data.page || page,
        total: response.data.total,
      };
    } catch (e) {
      return {
        messages: [],
        latestDealMessage: null,
        totalPages: 0,
        currentPage: page,
        total: 0,
      };
    }
  },

  async sendMessage(
    message: string,
    chatId: string,
    options?: { isAdminPanelMessage?: boolean },
  ): Promise<{ success: boolean; errorCode?: string; message?: ChatMessageUnion }> {
    if (!this.isConnected()) {
      await new Promise((r) => setTimeout(r, 500));

      if (!this.isConnected()) {
        console.error("Socket not connected even after retry");
        return { success: false, errorCode: "NETWORK_ERROR" };
      }
    }

    try {
      const ack = await new Promise<{ success?: boolean; error_code?: string; message?: unknown }>(
        (resolve) => {
          socket!.emit(
            "send_message",
            {
              chat_id: chatId,
              message,
              is_admin_panel_message: options?.isAdminPanelMessage === true,
            },
            (response: any) => {
              resolve(response ?? { success: true });
            }
          );
        }
      );

      let parsedMessage: ChatMessageUnion | undefined
      if (ack.message) {
        try {
          parsedMessage = ChatMessageUnionSchema.parse(ack.message)
        } catch (error) {
          console.error("Error validating send_message ack payload:", error)
        }
      }

      return {
        success: ack.success === true,
        errorCode: ack.error_code,
        message: parsedMessage,
      };
    } catch (e) {
      console.error("Error sending message:", e);
      return { success: false, errorCode: "SERVER_ERROR" };
    }
  },

  async sendImages(
    chatId: string,
    files: File[],
  ): Promise<{ success: boolean; errorCode?: string }> {
    if (files.length === 0) {
      return { success: true };
    }

    const MAX_IMAGES_PER_MESSAGE = 5;
    if (files.length > MAX_IMAGES_PER_MESSAGE) {
      return { success: false, errorCode: "MAXIMUM_NUMBER_PHOTOS_EXCEEDED" };
    }

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("uploaded_images", file);
      });

      await httpClient.post(`/chats/${chatId}/images`, formData);
      return { success: true };
    } catch (e) {
      console.error("Error sending images:", e);
      const errorCode =
        (e as any)?.response?.data?.detail?.error_code
        || (e as any)?.response?.data?.error_code;
      return {
        success: false,
        errorCode: errorCode || "SERVER_ERROR",
      };
    }
  },

  async sendDirectMessage(
    username: string,
    text: string,
  ): Promise<{ chatId: string | null; errorCode?: string }> {
    try {
      const response = await httpClient.post("/chats/direct-message", {
        username,
        text,
      });
      return { chatId: response.data.chat_id ?? null };
    } catch (e) {
      console.error("sendDirectMessage error", e);
      const errorCode =
        (e as any)?.response?.data?.detail?.error_code
        || (e as any)?.response?.data?.error_code;
      return { chatId: null, errorCode };
    }
  },

  async getOrCreateDirectChat(
    username: string,
  ): Promise<{ chatId: string | null; errorCode?: string }> {
    try {
      const response = await httpClient.post("/chats/direct-chat", {
        username,
      });
      return { chatId: response.data.chat_id ?? null };
    } catch (e) {
      console.error("getOrCreateDirectChat error", e);
      const errorCode =
        (e as any)?.response?.data?.detail?.error_code
        || (e as any)?.response?.data?.error_code;
      return { chatId: null, errorCode };
    }
  },

  async getRefusalReasons(): Promise<RefusalReasonsList> {
    const response = await httpClient.get(`/deal/refusal-reasons`);
    return RefusalReasonsListSchema.parse(response.data);
  },

  onNewMessage(cb: MessageCallback | null) {
    if (cb === null) {
      newMessageCallbacks.length = 0;
      return () => {};
    }
    newMessageCallbacks.push(cb);
    return () => {
      const idx = newMessageCallbacks.indexOf(cb);
      if (idx !== -1) newMessageCallbacks.splice(idx, 1);
    };
  },

  onDealStatusUpdate(cb: DealStatusUpdateCallback | null) {
    if (cb === null) {
      dealStatusUpdateCallbacks.length = 0;
      return () => {};
    }
    dealStatusUpdateCallbacks.push(cb);
    return () => {
      const idx = dealStatusUpdateCallbacks.indexOf(cb);
      if (idx !== -1) dealStatusUpdateCallbacks.splice(idx, 1);
    };
  },

  onChatUpdated(cb: ChatUpdatedCallback | null) {
    if (cb === null) {
      chatUpdatedCallbacks.length = 0;
      return () => {};
    }
    chatUpdatedCallbacks.push(cb);
    return () => {
      const idx = chatUpdatedCallbacks.indexOf(cb);
      if (idx !== -1) chatUpdatedCallbacks.splice(idx, 1);
    };
  },

  onChatNotification(cb: ChatNotificationCallback | null) {
    if (cb === null) {
      chatNotificationCallbacks.length = 0;
      return () => {};
    }
    chatNotificationCallbacks.push(cb);
    return () => {
      const idx = chatNotificationCallbacks.indexOf(cb);
      if (idx !== -1) chatNotificationCallbacks.splice(idx, 1);
    };
  },

  onMessagesRead(cb: MessagesReadCallback | null) {
    if (cb === null) {
      messagesReadCallbacks.length = 0;
      return () => {};
    }
    messagesReadCallbacks.push(cb);
    return () => {
      const idx = messagesReadCallbacks.indexOf(cb);
      if (idx !== -1) messagesReadCallbacks.splice(idx, 1);
    };
  },

  onNotificationCreated(cb: NotificationCreatedCallback | null) {
    if (cb === null) {
      notificationCreatedCallbacks.length = 0;
      return () => {};
    }
    notificationCreatedCallbacks.push(cb);
    return () => {
      const idx = notificationCreatedCallbacks.indexOf(cb);
      if (idx !== -1) notificationCreatedCallbacks.splice(idx, 1);
    };
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
    newMessageCallbacks.length = 0;
    dealStatusUpdateCallbacks.length = 0;
    chatUpdatedCallbacks.length = 0;
    chatNotificationCallbacks.length = 0;
    messagesReadCallbacks.length = 0;
    notificationCreatedCallbacks.length = 0;
    if (heartbeatIntervalHandle) {
      clearInterval(heartbeatIntervalHandle);
      heartbeatIntervalHandle = null;
    }
    lastSubscribedChatId = null;
  },
};
