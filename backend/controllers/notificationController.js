import { createFirestore, admin } from "../config/firebase.js";
import { readLocalNotifications, writeLocalNotifications } from "../utils/mockNotifications.js";

export function createNotificationController() {
  const db = createFirestore();

  return {
    getNotifications: async (request, response) => {
      try {
        const userId = request.params.userId;
        if (!userId) return response.status(400).json({ error: "Missing userId" });
        const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
        
        if (!db || db.isMock) {
          const allNotifs = await readLocalNotifications();
          const userNotifs = allNotifs.filter(n => n.userId === userId && n.createdAt >= fortyEightHoursAgo);
          userNotifs.sort((a, b) => b.createdAt - a.createdAt);
          return response.json(userNotifs.slice(0, 100));
        }

        // Get notifications for this user. Sort in memory to avoid needing a composite index.
        const snapshot = await db.collection("notifications")
          .where("userId", "==", userId)
          .limit(100)
          .get();

        const notifications = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.createdAt >= fortyEightHoursAgo) {
            notifications.push({ id: doc.id, ...data });
          } else {
            // Delete old notifications to clean up the database
            doc.ref.delete().catch(() => {});
          }
        });

        // Sort by newest first
        notifications.sort((a, b) => b.createdAt - a.createdAt);

        return response.json(notifications);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        return response.status(500).json({ error: "Failed to fetch notifications" });
      }
    },

    markAsRead: async (request, response) => {
      try {
        const userId = request.params.userId;
        const { notificationId } = request.body; // if null, mark all as read
        if (!userId) return response.status(400).json({ error: "Missing userId" });
        if (!db || db.isMock) {
          const allNotifs = await readLocalNotifications();
          let updated = false;
          for (const n of allNotifs) {
            if (n.userId === userId && (!notificationId || n.id === notificationId)) {
              n.read = true;
              updated = true;
            }
          }
          if (updated) await writeLocalNotifications(allNotifs);
          return response.json({ success: true });
        }

        const batch = db.batch();

        if (notificationId) {
          const docRef = db.collection("notifications").doc(notificationId);
          const doc = await docRef.get();
          if (doc.exists && doc.data().userId === userId) {
            batch.update(docRef, { read: true });
          }
        } else {
          // Mark all unread as read
          const snapshot = await db.collection("notifications")
            .where("userId", "==", userId)
            .where("read", "==", false)
            .get();
          
          snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
          });
        }

        await batch.commit();
        return response.json({ success: true });
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
        return response.status(500).json({ error: "Failed to mark as read" });
      }
    },

    sendAnnouncement: async (request, response) => {
      try {
        const { message, userIds } = request.body;
        if (!message || !userIds || !Array.isArray(userIds)) {
          return response.status(400).json({ error: "Invalid payload" });
        }
        if (!db || db.isMock) {
          const allNotifs = await readLocalNotifications();
          for (const uid of userIds) {
            allNotifs.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              userId: uid,
              type: "announcement",
              message: message,
              read: false,
              createdAt: Date.now()
            });
          }
          await writeLocalNotifications(allNotifs);
          return response.json({ success: true, count: userIds.length });
        }

        // Firestore batch allows up to 500 operations. We will chunk them.
        const chunkArray = (arr, size) => 
          Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
          );

        const chunks = chunkArray(userIds, 500);

        for (const chunk of chunks) {
          const batch = db.batch();
          for (const uid of chunk) {
            const docRef = db.collection("notifications").doc();
            batch.set(docRef, {
              userId: uid,
              type: "announcement",
              message: message,
              read: false,
              createdAt: Date.now()
            });
          }
          await batch.commit();
        }

        return response.json({ success: true, count: userIds.length });
      } catch (err) {
        console.error("Failed to send announcement:", err);
        return response.status(500).json({ error: "Failed to send announcement" });
      }
    },

    sendRoomInvite: async (request, response) => {
      try {
        const { targetUserId, roomId, inviterName, inviterId } = request.body;
        if (!targetUserId || !roomId || !inviterName) {
          return response.status(400).json({ error: "Invalid payload" });
        }
        
        const notifData = {
          userId: targetUserId,
          type: "room_invite",
          message: `${inviterName} invited you to a room`,
          roomId: roomId,
          inviterId: inviterId,
          inviterName: inviterName,
          read: false,
          createdAt: Date.now()
        };

        if (!db || db.isMock) {
          const allNotifs = await readLocalNotifications();
          allNotifs.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            ...notifData
          });
          await writeLocalNotifications(allNotifs);
          return response.json({ success: true });
        }

        const docRef = db.collection("notifications").doc();
        await docRef.set(notifData);
        return response.json({ success: true });
      } catch (err) {
        console.error("Failed to send room invite:", err);
        return response.status(500).json({ error: "Failed to send invite" });
      }
    }
  };
}
