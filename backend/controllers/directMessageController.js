import { createFirestore } from "../config/firebase.js";
import { readLocalNotifications, writeLocalNotifications } from "../utils/mockNotifications.js";
import { readLocalDirectMessages, writeLocalDirectMessages } from "../utils/mockDirectMessages.js";
import { emitNotificationRefresh } from "../utils/realtimeEvents.js";

const MESSAGE_TTL_MS = 4 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 1000;

function makeId() {
  return `dm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMessage(message) {
  return String(message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
}

function assertParticipant(message, userId) {
  if (!message || (message.senderId !== userId && message.recipientId !== userId)) {
    const error = new Error("You cannot access this message.");
    error.statusCode = 403;
    throw error;
  }
}

export function createDirectMessageController() {
  const db = createFirestore();

  return {
    send: async (request, response) => {
      try {
        const senderId = request.firebaseUser?.uid;
        const recipientId = String(request.body?.recipientId || "").trim();
        const text = normalizeMessage(request.body?.text);
        if (!senderId || !recipientId || !text) return response.status(400).json({ error: "Recipient and message are required." });
        if (senderId === recipientId) return response.status(400).json({ error: "You cannot message yourself." });

        const now = Date.now();
        const message = {
          id: makeId(),
          senderId,
          recipientId,
          senderName: String(request.body?.senderName || request.firebaseUser?.name || "User").trim().slice(0, 80),
          text,
          createdAt: now,
          expiresAt: now + MESSAGE_TTL_MS,
          seenAt: null,
        };
        const notification = {
          id: `direct-${message.id}`,
          userId: recipientId,
          type: "direct_message",
          messageId: message.id,
          senderId,
          senderName: message.senderName,
          message: `${message.senderName}: ${text}`,
          read: false,
          createdAt: now,
          expiresAt: message.expiresAt,
        };

        if (!db || db.isMock) {
          const messages = readLocalDirectMessages();
          messages.push(message);
          writeLocalDirectMessages(messages);
          const notifications = await readLocalNotifications();
          notifications.push(notification);
          await writeLocalNotifications(notifications);
        } else {
          await db.collection("directMessages").doc(message.id).set(message);
          await db.collection("notifications").doc(notification.id).set(notification);
        }

        emitNotificationRefresh(recipientId, "direct-message");
        return response.json({ success: true, message });
      } catch (error) {
        return response.status(error.statusCode || 500).json({ error: error.message || "Could not send message." });
      }
    },

    get: async (request, response) => {
      try {
        const userId = request.firebaseUser?.uid;
        const messageId = String(request.params.messageId || "");
        let message;
        if (!db || db.isMock) {
          message = readLocalDirectMessages().find(item => item.id === messageId);
        } else {
          const snapshot = await db.collection("directMessages").doc(messageId).get();
          message = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
        }
        assertParticipant(message, userId);
        if (message.expiresAt <= Date.now() && !message.seenAt) return response.status(410).json({ error: "This message has expired." });
        return response.json(message);
      } catch (error) {
        return response.status(error.statusCode || 404).json({ error: error.message || "Message not found." });
      }
    },

    seen: async (request, response) => {
      try {
        const recipientId = request.firebaseUser?.uid;
        const messageId = String(request.params.messageId || "");
        let message;
        if (!db || db.isMock) {
          const messages = readLocalDirectMessages();
          const index = messages.findIndex(item => item.id === messageId);
          message = index >= 0 ? messages[index] : null;
          assertParticipant(message, recipientId);
          if (message.recipientId !== recipientId) return response.status(403).json({ error: "Only the recipient can mark a message seen." });
          message.seenAt = Date.now();
          messages[index] = message;
          writeLocalDirectMessages(messages);

          const notifications = await readLocalNotifications();
          const senderNotification = {
            id: `seen-${message.id}`,
            userId: message.senderId,
            type: "direct_message_seen",
            messageId: message.id,
            message: `${message.senderName} saw your message.`,
            read: false,
            createdAt: message.seenAt,
            expiresAt: message.seenAt + MESSAGE_TTL_MS,
          };
          await writeLocalNotifications([
            ...notifications.filter(item => !(item.id === `direct-${message.id}`)),
            senderNotification,
          ]);
          emitNotificationRefresh(recipientId, "direct-message-seen");
          emitNotificationRefresh(message.senderId, "direct-message-seen");
        } else {
          const messageRef = db.collection("directMessages").doc(messageId);
          const snapshot = await messageRef.get();
          message = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
          assertParticipant(message, recipientId);
          if (message.recipientId !== recipientId) return response.status(403).json({ error: "Only the recipient can mark a message seen." });
          const seenAt = Date.now();
          await messageRef.update({ seenAt });
          const notificationSnapshot = await db.collection("notifications").where("messageId", "==", messageId).get();
          const batch = db.batch();
          notificationSnapshot.forEach(doc => {
            if (doc.data().userId === recipientId) batch.delete(doc.ref);
          });
          const senderNotificationRef = db.collection("notifications").doc(`seen-${messageId}`);
          batch.set(senderNotificationRef, {
            userId: message.senderId,
            type: "direct_message_seen",
            messageId,
            message: `${message.senderName} saw your message.`,
            read: false,
            createdAt: seenAt,
            expiresAt: seenAt + MESSAGE_TTL_MS,
          });
          await batch.commit();
          message.seenAt = seenAt;
          emitNotificationRefresh(recipientId, "direct-message-seen");
          emitNotificationRefresh(message.senderId, "direct-message-seen");
        }
        return response.json({ success: true, message });
      } catch (error) {
        return response.status(error.statusCode || 500).json({ error: error.message || "Could not mark message seen." });
      }
    },
  };
}
