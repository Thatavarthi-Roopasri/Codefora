import { createFirestore, admin } from "../config/firebase.js";
import fs from "fs/promises";
import { readLocalNotifications, writeLocalNotifications } from "../utils/mockNotifications.js";
import { globalOnlineUsers, userIdToRoomId } from "../utils/presenceTracker.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localProfilesPath = path.join(__dirname, "../data/manualUsers.json");
const localWorksPath = path.join(__dirname, "../data/localWorks.json");

async function readLocalUsers() {
  try {
    return JSON.parse(await fs.readFile(localProfilesPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeLocalUsers(users) {
  await fs.mkdir(path.dirname(localProfilesPath), { recursive: true });
  await fs.writeFile(localProfilesPath, JSON.stringify(users, null, 2));
}

async function readLocalWorks() {
  try {
    return JSON.parse(await fs.readFile(localWorksPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeLocalWorks(works) {
  await fs.mkdir(path.dirname(localWorksPath), { recursive: true });
  await fs.writeFile(localWorksPath, JSON.stringify(works, null, 2));
}

export async function getNextFriendCode(db, userId) {
  if (!db || db.isMock) {
    const users = await readLocalUsers();
    let min = 13219873;
    for (const u of Object.values(users)) {
      if (u.profile?.friendCode) min = Math.min(min, parseInt(u.profile.friendCode));
    }
    return (min - 1).toString();
  }

  const counterRef = db.collection('counters').doc('users');
  return await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    let nextCode = 13219873;
    if (doc.exists && doc.data().nextFriendCode) {
      nextCode = doc.data().nextFriendCode;
    }
    t.set(counterRef, { nextFriendCode: nextCode - 1 }, { merge: true });
    t.set(db.collection('friendCodes').doc(nextCode.toString()), { uid: userId });
    return nextCode.toString();
  });
}

export function createProfileController() {
  const db = createFirestore();

  return {
    get: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      if (!userId) return response.status(400).json({ error: "Missing userId" });

      try {
        const isNumericCode = /^\d{8}$/.test(userId);

        if (!db || db.isMock) {
          const users = await readLocalUsers();
          let targetUser = users[userId];
          let trueUserId = userId;

          if (isNumericCode) {
            const entry = Object.entries(users).find(([_, u]) => u.profile?.friendCode === userId);
            if (entry) {
              trueUserId = entry[0];
              targetUser = entry[1];
            } else {
              targetUser = null;
            }
          }

          if (targetUser) {
            let presence = "offline";
            if (globalOnlineUsers.has(trueUserId) && globalOnlineUsers.get(trueUserId).size > 0) {
              presence = userIdToRoomId.has(trueUserId) ? "in-room" : "online";
            }
            return response.json({ ...(targetUser.profile || {}), presence, id: trueUserId });
          } else {
            if (isNumericCode) return response.json({}); // Not found by code
            
            const newFriendCode = await getNextFriendCode(db, userId);
            const newProfile = {
              profile: { displayName: "Someone", bio: "", theme: "dark", friends: [], friendCode: newFriendCode },
              recentWorks: []
            };
            users[userId] = newProfile;
            await writeLocalUsers(users);
            
            let presence = "offline";
            if (globalOnlineUsers.has(userId) && globalOnlineUsers.get(userId).size > 0) {
              presence = userIdToRoomId.has(userId) ? "in-room" : "online";
            }
            
            return response.json({ ...newProfile.profile, presence, id: userId });
          }
        }

        let docSnap;
        let trueUserId = userId;

        if (isNumericCode) {
          const mappingSnap = await db.collection("friendCodes").doc(userId).get();
          if (mappingSnap.exists) {
            trueUserId = mappingSnap.data().uid;
            docSnap = await db.collection("users").doc(trueUserId).get();
          } else {
            // Fallback for older codes not in the mapping
            const snapshot = await db.collection("users").where("profile.friendCode", "==", userId).limit(1).get();
            if (!snapshot.empty) {
              docSnap = snapshot.docs[0];
              trueUserId = docSnap.id;
            }
          }
        } else {
          docSnap = await db.collection("users").doc(userId).get();
        }
        if (docSnap && docSnap.exists) {
          const data = docSnap.data();
          if (!data.profile?.friendCode) {
             const newFriendCode = await getNextFriendCode(db, trueUserId);
             const updatedProfile = { ...data.profile, friendCode: newFriendCode };
             await db.collection("users").doc(trueUserId).set({ profile: updatedProfile }, { merge: true });
             data.profile = updatedProfile;
          }
          
          let presence = "offline";
          if (globalOnlineUsers.has(trueUserId) && globalOnlineUsers.get(trueUserId).size > 0) {
            presence = userIdToRoomId.has(trueUserId) ? "in-room" : "online";
          }
          
          return response.json({ ...(data.profile || {}), presence, id: trueUserId });
        } else {
          if (isNumericCode) return response.json({}); // Not found by code

          // Initialize new user profile
          const newFriendCode = await getNextFriendCode(db, userId);
          const newProfile = {
            profile: { displayName: "", bio: "", theme: "dark", friends: [], friendCode: newFriendCode },
            recentWorks: []
          };
          await db.collection("users").doc(userId).set(newProfile);
          return response.json({ ...newProfile.profile, id: userId });
        }
      } catch (error) {
        console.warn(`Profile get failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    save: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const profile = request.body || {};
      
      // SECURITY FIX: Prevent malicious users from promoting themselves to admin via the API
      if (profile.role !== undefined) {
        delete profile.role;
      }
      
      if (!userId) return response.status(400).json({ error: "Missing userId" });
      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          users[userId] = {
            ...(users[userId] || {}),
            profile: { ...((users[userId] || {}).profile || {}), ...profile },
            updatedAt: Date.now()
          };
          await writeLocalUsers(users);
          return response.json({ ok: true });
        }

        await db.collection("users").doc(userId).set({ profile, updatedAt: Date.now() }, { merge: true });
        return response.json({ ok: true });
      } catch (error) {
        console.warn(`Profile save failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    saveWork: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const work = request.body || {};
      if (!userId) return response.status(400).json({ error: "Missing userId" });
      
      const newWork = {
        ...work,
        ownerId: userId,
        id: work.id || `work-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: work.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      try {
        if (!db || db.isMock) {
          const works = await readLocalWorks();
          works[newWork.id] = newWork;
          await writeLocalWorks(works);
          return response.json({ ok: true, work: newWork });
        }

        await db.collection("works").doc(newWork.id).set(newWork, { merge: true });
        
        return response.json({ ok: true, work: newWork });
      } catch (error) {
        console.warn(`Work save failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    saveTourStatus: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const { pageName, status } = request.body || {};
      
      if (!userId || !pageName) return response.status(400).json({ error: "Missing parameters" });
      
      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          if (!users[userId]) users[userId] = {};
          users[userId][`hasSeenTour_${pageName}`] = status;
          await writeLocalUsers(users);
          return response.json({ ok: true });
        }

        await db.collection("users").doc(userId).set({ [`hasSeenTour_${pageName}`]: status }, { merge: true });
        return response.json({ ok: true });
      } catch (error) {
        console.warn(`Tour status save failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    getTourStatus: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const pageName = String(request.params.pageName || "").trim();
      
      if (!userId || !pageName) return response.status(400).json({ error: "Missing parameters" });
      
      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          const user = users[userId] || {};
          return response.json({ status: user[`hasSeenTour_${pageName}`] === true });
        }

        const doc = await db.collection("users").doc(userId).get();
        const dbStatus = doc.exists ? doc.data()[`hasSeenTour_${pageName}`] : false;
        return response.json({ status: dbStatus === true });
      } catch (error) {
        console.warn(`Tour status fetch failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    listWorks: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      if (!userId) return response.status(400).json({ error: "Missing userId" });
      try {
        if (!db || db.isMock) {
          const works = await readLocalWorks();
          const userWorks = Object.values(works)
            .filter(w => w.ownerId === userId)
            .sort((a, b) => b.createdAt - a.createdAt);
          return response.json(userWorks);
        }

        const querySnapshot = await db.collection("works")
          .where("ownerId", "==", userId)
          .get();
          
        const works = [];
        querySnapshot.forEach(doc => works.push(doc.data()));
        
        // Sort descending by createdAt
        works.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        return response.json(works);
      } catch (error) {
        console.warn(`Works list failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    incrementStat: async (userId, statName, amount = 1) => {
      if (!userId) return;
      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          if (!users[userId]) users[userId] = { profile: { stats: {} } };
          if (!users[userId].profile) users[userId].profile = { stats: {} };
          if (!users[userId].profile.stats) users[userId].profile.stats = {};
          
          users[userId].profile.stats[statName] = (Number(users[userId].profile.stats[statName]) || 0) + amount;
          users[userId].updatedAt = Date.now();
          await writeLocalUsers(users);
          return;
        }

        const docRef = db.collection("users").doc(userId);
        const doc = await docRef.get();
        const data = doc.exists ? doc.data() : { profile: { stats: {} } };
        const stats = data.profile?.stats || {};
        stats[statName] = (Number(stats[statName]) || 0) + amount;
        
        await docRef.set({ 
          profile: { ...data.profile, stats },
          updatedAt: Date.now() 
        }, { merge: true });
      } catch (error) {
        console.warn(`Stat increment failed for ${userId}: ${error.message}`);
      }
    },

    addActivity: async (userId, activity) => {
      if (!userId) return;
      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          if (!users[userId]) users[userId] = { profile: { activities: [] } };
          if (!users[userId].profile) users[userId].profile = { activities: [] };
          if (!users[userId].profile.activities) users[userId].profile.activities = [];
          
          users[userId].profile.activities.unshift({ ...activity, timestamp: Date.now() });
          users[userId].profile.activities = users[userId].profile.activities.slice(0, 1000);
          users[userId].updatedAt = Date.now();
          await writeLocalUsers(users);
          return;
        }

        const docRef = db.collection("users").doc(userId);
        const doc = await docRef.get();
        const data = doc.exists ? doc.data() : { profile: { activities: [] } };
        const activities = data.profile?.activities || [];
        activities.unshift({ ...activity, timestamp: Date.now() });
        const cappedActivities = activities.slice(0, 1000);
        
        await docRef.set({ 
          profile: { ...data.profile, activities: cappedActivities },
          updatedAt: Date.now() 
        }, { merge: true });
      } catch (error) {
        console.warn(`Activity add failed for ${userId}: ${error.message}`);
      }
    },

    solveProblem: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const { problemId } = request.body || {};
      if (!userId || !problemId) return response.status(400).json({ error: "Missing parameters" });
      
      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          if (!users[userId]) users[userId] = { profile: { stats: {}, solvedProblems: [], activities: [] } };
          if (!users[userId].profile) users[userId].profile = { stats: {}, solvedProblems: [], activities: [] };
          
          const profile = users[userId].profile;
          if (!profile.solvedProblems) profile.solvedProblems = [];
          if (!profile.stats) profile.stats = {};
          if (!profile.activities) profile.activities = [];
          
          let solved = profile.solvedProblems;
          if (!solved.includes(problemId)) {
            solved.push(problemId);
            profile.stats.problemsSolved = (Number(profile.stats.problemsSolved) || 0) + 1;
            
            profile.activities.unshift({
              type: "problem_solve",
              text: `Solved ${problemId.replace(/-/g, ' ')}`,
              subtext: "Accepted 100%",
              timestamp: Date.now()
            });
            profile.activities = profile.activities.slice(0, 1000);
            
            users[userId].updatedAt = Date.now();
            await writeLocalUsers(users);
          }
          return response.json({ ok: true, solvedProblems: solved });
        }
        
        const docRef = db.collection("users").doc(userId);
        const doc = await docRef.get();
        const data = doc.exists ? doc.data() : { profile: { stats: {}, solvedProblems: [] } };
        
        const solved = data.profile?.solvedProblems || [];
        if (!solved.includes(problemId)) {
          solved.push(problemId);
          const stats = data.profile?.stats || {};
          stats.problemsSolved = (Number(stats.problemsSolved) || 0) + 1;
          
          await docRef.set({ 
            profile: { ...data.profile, solvedProblems: solved, stats },
            updatedAt: Date.now() 
          }, { merge: true });
          
          // Add Activity
          const activities = data.profile?.activities || [];
          activities.unshift({
            type: "problem_solve",
            text: `Solved ${problemId.replace(/-/g, ' ')}`,
            subtext: "Accepted 100%",
            timestamp: Date.now()
          });
          const cappedActivities = activities.slice(0, 1000);
          await docRef.set({ profile: { activities: cappedActivities } }, { merge: true });
        }
        
        return response.json({ ok: true, solvedProblems: solved });
      } catch (error) {
        console.error(`Failed to record solved problem: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    searchUser: async (request, response) => {
      const query = String(request.params.query || "").trim();
      if (!query) return response.status(400).json({ error: "Missing query" });

      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          let targetId = query;
          let target = users[query];
          
          if (!target) {
            // Search by friendCode
            const foundEntry = Object.entries(users).find(([uid, u]) => u.profile?.friendCode === query);
            if (foundEntry) {
               targetId = foundEntry[0];
               target = foundEntry[1];
            }
          }

          if (target) {
            return response.json({
              id: targetId,
              name: target.profile?.displayName || "Someone",
              emotionId: target.profile?.emotionId || "",
              photoURL: target.profile?.photoURL || "",
              friendCode: target.profile?.friendCode || ""
            });
          }
          return response.status(404).json({ error: "User not found" });
        }

        let name = "Someone";
        let emotionId = "";
        let photoURL = "";
        let friendCode = "";
        let targetId = query;
        let targetFound = false;
        
        // First, check if the query is a friendCode
        const codeQuery = await db.collection("users").where("profile.friendCode", "==", query).limit(1).get();
        
        if (!codeQuery.empty) {
           const targetDoc = codeQuery.docs[0];
           targetFound = true;
           targetId = targetDoc.id;
           const profile = targetDoc.data().profile || {};
           name = profile.displayName || name;
           emotionId = profile.emotionId || emotionId;
           photoURL = profile.photoURL || photoURL;
           friendCode = profile.friendCode || "";
        } else {
           // Fallback to checking document ID
           const targetDoc = await db.collection("users").doc(query).get();
           if (targetDoc.exists) {
             targetFound = true;
             targetId = targetDoc.id;
             const profile = targetDoc.data().profile || {};
             name = profile.displayName || name;
             emotionId = profile.emotionId || emotionId;
             photoURL = profile.photoURL || photoURL;
             friendCode = profile.friendCode || "";
           }
        }
        
        if (targetFound) {
           return response.json({ id: targetId, name, emotionId, photoURL, friendCode });
        }
        
        // If they haven't saved a profile, check Firebase Auth
        try {
          if (admin && admin.apps && admin.apps.length > 0) {
            const userRecord = await admin.auth().getUser(query);
            return response.json({
              id: userRecord.uid,
              name: userRecord.displayName || userRecord.email?.split('@')[0] || "Someone",
              emotionId: "",
              photoURL: userRecord.photoURL || "",
              friendCode: ""
            });
          }
        } catch (authErr) {
          // Fall through to 404
        }
        
        return response.status(404).json({ error: "User not found" });
      } catch (error) {
        return response.status(500).json({ error: "Search failed" });
      }
    },

    sendFriendRequest: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const { targetUserId } = request.body || {};
      
      if (!userId || !targetUserId) return response.status(400).json({ error: "Missing parameters" });
      if (userId === targetUserId) return response.status(400).json({ error: "Cannot send request to yourself" });

      try {
        if (!db || db.isMock) {
          const allNotifs = await readLocalNotifications();
          const alreadySent = allNotifs.some(n => 
            n.userId === targetUserId && n.type === "friend_request" && n.senderId === userId && n.status === "pending"
          );
          if (alreadySent) return response.status(400).json({ error: "Friend request already sent" });

          const users = await readLocalUsers();
          if (!users[targetUserId]) {
            return response.status(404).json({ error: "User not found" });
          }
          
          const targetFriends = users[targetUserId]?.profile?.friends || [];
          if (targetFriends.some(f => f.id === userId)) {
            return response.status(400).json({ error: "Already friends" });
          }

          const senderName = users[userId]?.profile?.displayName || "Someone";
          const senderCode = users[userId]?.profile?.friendCode || userId;
          
          allNotifs.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            userId: targetUserId,
            type: "friend_request",
            message: `${senderName} (${senderCode}) sent you a friend request.`,
            senderId: userId,
            senderName: senderName,
            status: "pending",
            read: false,
            createdAt: Date.now()
          });
          await writeLocalNotifications(allNotifs);
          return response.json({ ok: true });
        }
        
        const senderDoc = await db.collection("users").doc(userId).get();
        const senderName = senderDoc.exists ? (senderDoc.data().profile?.displayName || "Someone") : "Someone";
        const senderCode = senderDoc.exists ? (senderDoc.data().profile?.friendCode || userId) : userId;

        let targetExists = false;
        let targetFriends = [];
        
        const targetDoc = await db.collection("users").doc(targetUserId).get();
        if (targetDoc.exists) {
          targetExists = true;
          targetFriends = targetDoc.data().profile?.friends || [];
        } else {
          try {
            if (admin && admin.apps && admin.apps.length > 0) {
              await admin.auth().getUser(targetUserId);
              targetExists = true;
            }
          } catch (e) {}
        }

        if (!targetExists) {
          return response.status(404).json({ error: "User not found" });
        }
        if (targetFriends.some(f => f.id === userId)) {
          return response.status(400).json({ error: "Already friends" });
        }

        // Check if request already pending
        const existingReqs = await db.collection("notifications")
          .where("userId", "==", targetUserId)
          .get();
          
        const alreadySent = existingReqs.docs.some(doc => {
          const data = doc.data();
          return data.type === "friend_request" && data.senderId === userId && data.status === "pending";
        });
        
        if (alreadySent) {
          return response.status(400).json({ error: "Friend request already sent" });
        }

        await db.collection("notifications").add({
          userId: targetUserId,
          type: "friend_request",
          message: `${senderName} (${senderCode}) sent you a friend request.`,
          senderId: userId,
          senderName: senderName,
          status: "pending",
          read: false,
          createdAt: Date.now()
        });

        return response.json({ ok: true });
      } catch (error) {
        console.error(`Failed to send friend request: ${error.message}`);
        return response.status(500).json({ error: "Internal server error" });
      }
    },

    handleFriendRequest: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const { notificationId, action } = request.body || {};
      
      if (!userId || !notificationId || !action) return response.status(400).json({ error: "Missing parameters" });

      try {
        if (!db || db.isMock) {
          const allNotifs = await readLocalNotifications();
          const notif = allNotifs.find(n => n.id === notificationId);
          if (!notif) return response.status(404).json({ error: "Notification not found" });
          if (notif.userId !== userId) return response.status(403).json({ error: "Unauthorized" });
          if (notif.type !== "friend_request" || notif.status !== "pending") {
            return response.status(400).json({ error: "Invalid or already handled request" });
          }

          if (action === "accept") {
            const users = await readLocalUsers();
            
            // Add to current user's friends
            if (!users[userId]) users[userId] = { profile: { friends: [] } };
            if (!users[userId].profile) users[userId].profile = { friends: [] };
            if (!users[userId].profile.friends) users[userId].profile.friends = [];
            
            if (!users[userId].profile.friends.some(f => f.id === notif.senderId)) {
              users[userId].profile.friends.push({ id: notif.senderId, name: notif.senderName });
            }

            // Add to sender's friends
            const userName = users[userId].profile.displayName || "Someone";
            if (!users[notif.senderId]) users[notif.senderId] = { profile: { friends: [] } };
            if (!users[notif.senderId].profile) users[notif.senderId].profile = { friends: [] };
            if (!users[notif.senderId].profile.friends) users[notif.senderId].profile.friends = [];
            
            if (!users[notif.senderId].profile.friends.some(f => f.id === userId)) {
              users[notif.senderId].profile.friends.push({ id: userId, name: userName });
            }
            
            await writeLocalUsers(users);
          }

          notif.status = action;
          notif.read = true;
          await writeLocalNotifications(allNotifs);
          
          return response.json({ ok: true });
        }
        
        const notifRef = db.collection("notifications").doc(notificationId);
        const notifDoc = await notifRef.get();
        
        if (!notifDoc.exists) return response.status(404).json({ error: "Notification not found" });
        const notifData = notifDoc.data();
        
        if (notifData.userId !== userId) return response.status(403).json({ error: "Unauthorized" });
        if (notifData.type !== "friend_request" || notifData.status !== "pending") {
          return response.status(400).json({ error: "Invalid or already handled request" });
        }

        const senderId = notifData.senderId;
        const senderName = notifData.senderName;

        const userDocRef = db.collection("users").doc(userId);
        const userDoc = await userDocRef.get();
        const userName = userDoc.exists ? (userDoc.data().profile?.displayName || "Someone") : "Someone";

        if (action === "accept") {
          await userDocRef.set({ 
            profile: { friends: admin.firestore.FieldValue.arrayUnion({ id: senderId, name: senderName }) }, 
            updatedAt: Date.now() 
          }, { merge: true });

          const senderDocRef = db.collection("users").doc(senderId);
          await senderDocRef.set({ 
            profile: { friends: admin.firestore.FieldValue.arrayUnion({ id: userId, name: userName }) }, 
            updatedAt: Date.now() 
          }, { merge: true });
        }

        await notifRef.update({ status: action, read: true });

        return response.json({ ok: true });
      } catch (error) {
        console.error(`Failed to handle friend request: ${error.message}`);
        return response.status(500).json({ error: "Internal server error" });
      }
    },

    removeFriend: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const friendId = String(request.params.friendId || "").trim();

      if (!userId || !friendId) return response.status(400).json({ error: "Missing parameters" });

      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          if (users[userId] && users[userId].profile && users[userId].profile.friends) {
            users[userId].profile.friends = users[userId].profile.friends.filter(f => f.id !== friendId);
          }
          if (users[friendId] && users[friendId].profile && users[friendId].profile.friends) {
            users[friendId].profile.friends = users[friendId].profile.friends.filter(f => f.id !== userId);
          }
          await writeLocalUsers(users);
          return response.json({ ok: true });
        }

        const userDocRef = db.collection("users").doc(userId);
        const userDoc = await userDocRef.get();
        if (userDoc.exists) {
          // Removing friends with arrayRemove requires the exact object match. 
          // Since we don't have the exact friend name in this scope without fetching, 
          // we filter the array manually. We will wrap this in a transaction in the future if high concurrency removal is needed.
          const userProfile = userDoc.data().profile || {};
          const userFriends = userProfile.friends || [];
          const newFriends = userFriends.filter(f => f.id !== friendId);
          await userDocRef.set({ profile: { ...userProfile, friends: newFriends }, updatedAt: Date.now() }, { merge: true });
        }

        const friendDocRef = db.collection("users").doc(friendId);
        const friendDoc = await friendDocRef.get();
        if (friendDoc.exists) {
          const friendProfile = friendDoc.data().profile || {};
          const friendFriends = friendProfile.friends || [];
          const newFriendFriends = friendFriends.filter(f => f.id !== userId);
          await friendDocRef.set({ profile: { ...friendProfile, friends: newFriendFriends }, updatedAt: Date.now() }, { merge: true });
        }

        return response.json({ ok: true });
      } catch (error) {
        console.error(`Failed to remove friend: ${error.message}`);
        return response.status(500).json({ error: "Internal server error" });
      }
    }
  };
}
