import { createFirestore, admin } from "../config/firebase.js";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { readLocalNotifications, writeLocalNotifications } from "../utils/mockNotifications.js";
import { globalOnlineUsers, userIdToRoomId } from "../utils/presenceTracker.js";
import { emitFriendsRefresh, emitNotificationRefresh } from "../utils/realtimeEvents.js";
import { runtimeDataPath } from "../utils/runtimeDataPath.js";

const localProfilesPath = runtimeDataPath("manualUsers.json");
const localWorksPath = runtimeDataPath("localWorks.json");

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

function createDefaultProfile(identity = {}) {
  return {
    displayName: identity.displayName || identity.email?.split("@")[0] || "Developer",
    bio: "",
    theme: "dark",
    community: "sider",
    friends: [],
    activities: [],
    stats: {},
    photoURL: identity.photoURL || ""
  };
}

export function getWorkMetrics(work = {}) {
  const files = Array.isArray(work.files) ? work.files : [];
  const fileCount = files.length;
  const codeCharacters = files.reduce((total, file) => total + String(file?.code || "").trim().length, 0);
  const nonEmptyFiles = files.filter((file) => String(file?.code || "").trim().length > 0).length;
  const contributionCount = Math.max(1, Math.min(10, nonEmptyFiles + Math.floor(codeCharacters / 2000)));

  return { fileCount, codeCharacters, contributionCount };
}

export function getStableWorkId(userId, work = {}) {
  if (/^(work-[a-zA-Z0-9_-]{6,80}|room-project:[a-zA-Z0-9_-]{2,40})$/.test(String(work.id || ""))) return String(work.id);

  const workKey = work.originRoomId
    ? [userId, work.type || "work", work.originRoomId].join(":")
    : [userId, work.id || "", work.type || "work", work.name || "Untitled work"].join(":");
  return `work-${createHash("sha256").update(workKey).digest("hex").slice(0, 24)}`;
}

export function assertWorkOwnership(previousWork, userId) {
  if (previousWork?.ownerId && previousWork.ownerId !== userId) {
    const error = new Error("You cannot modify another user's saved work.");
    error.statusCode = 403;
    throw error;
  }
}

export function assertWorkCanBeUpdated(previousWork) {
  if (previousWork?.readOnly || previousWork?.projectStatus === "completed") {
    const error = new Error("This project has ended and is read-only.");
    error.statusCode = 409;
    throw error;
  }
}

export function collapseDuplicateWorks(works) {
  const latestByKey = new Map();

  for (const work of works) {
    // A room can have one resumable workspace. Keep the newest snapshot when
    // older saves used a different generated document id.
    const projectName = String(work.roomName || work.name || "").trim().toLowerCase();
    const key = work.sourceWorkId
      ? `${work.type || "workspace"}:${work.sourceWorkId}`
      : work.type === "room-project" && projectName
        ? `${work.type}:${projectName}`
        : work.originRoomId
          ? `${work.type || "workspace"}:${work.originRoomId}`
          : work.id;
    const previous = latestByKey.get(key);
    if (!previous || (work.updatedAt || work.createdAt || 0) > (previous.updatedAt || previous.createdAt || 0)) {
      latestByKey.set(key, work);
    }
  }

  return Array.from(latestByKey.values())
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}

function getSavedWorkGroupKey(work = {}) {
  const projectName = String(work.roomName || work.name || "").trim().toLowerCase();
  if (work.sourceWorkId) return `${work.type || "workspace"}:${work.sourceWorkId}`;
  if (work.type === "room-project" && projectName) return `${work.type}:${projectName}`;
  if (work.originRoomId) return `${work.type || "workspace"}:${work.originRoomId}`;
  return work.id || "";
}

function getDeletedWorkIds(works = [], targetWork = {}) {
  const targetKey = getSavedWorkGroupKey(targetWork);
  return works
    .filter((work) => work.id === targetWork.id || (targetKey && getSavedWorkGroupKey(work) === targetKey))
    .map((work) => work.id)
    .filter(Boolean);
}

export function applyWorkDeletionToProfile(profile = {}, deletedWorkIds = [], remainingWorks = []) {
  const deletedIds = new Set(deletedWorkIds);
  const stats = profile.stats || {};
  const activities = Array.isArray(profile.activities) ? profile.activities : [];
  const lastWorkSavedAt = remainingWorks.reduce((latest, work) => Math.max(latest, Number(work.updatedAt || work.createdAt || 0)), 0);

  return {
    ...profile,
    stats: {
      ...stats,
      savedWorks: remainingWorks.length,
      workContributions: remainingWorks.reduce((total, work) => total + (Number(work.contributionCount) || getWorkMetrics(work).contributionCount), 0),
      lastWorkSavedAt: lastWorkSavedAt || null
    },
    activities: activities.filter((activity) => !deletedIds.has(activity.workId))
  };
}

export function applyWorkSaveToProfile(profile = {}, work = {}, previousWork = null) {
  const now = work.updatedAt || Date.now();
  const stats = profile.stats || {};
  const activities = Array.isArray(profile.activities) ? profile.activities : [];
  const contributionCount = Number(work.contributionCount) || 1;
  const previousContributionCount = previousWork
    ? Number(previousWork.contributionCount) || getWorkMetrics(previousWork).contributionCount
    : 0;
  const isNewWork = !previousWork;
  const updatedActivities = activities.filter((activity) => !(activity.type === "work_save" && activity.workId === work.id));

  return {
    ...profile,
    stats: {
      ...stats,
      savedWorks: (Number(stats.savedWorks) || 0) + (isNewWork ? 1 : 0),
      workContributions: Math.max(0, (Number(stats.workContributions) || 0) + contributionCount - previousContributionCount),
      lastWorkSavedAt: now
    },
    activities: [
      {
        type: "work_save",
        workId: work.id,
        text: `Saved ${work.name || "work"}`,
        subtext: `${work.fileCount || 0} files saved`,
        timestamp: now,
        contributionCount
      },
      ...updatedActivities
    ].slice(0, 1000)
  };
}

export async function ensureProfileRecord(db, userId, identity = {}) {
  const now = Date.now();

  if (!db || db.isMock) {
    const users = await readLocalUsers();
    const existing = users[userId] || {};
    const existingProfile = existing.profile || {};
    const friendCode = existingProfile.friendCode || await getNextFriendCode(db, userId);
    const profile = {
      ...createDefaultProfile(identity),
      ...existingProfile,
      friendCode,
      displayName: existingProfile.displayName || identity.displayName || identity.email?.split("@")[0] || "Developer",
      photoURL: existingProfile.photoURL || identity.photoURL || ""
    };

    users[userId] = {
      ...existing,
      profile,
      email: existing.email || identity.email || "",
      authProvider: existing.authProvider || identity.providerId || "",
      createdAt: existing.createdAt || now,
      updatedAt: now,
      lastLoginAt: now
    };
    await writeLocalUsers(users);
    return profile;
  }

  const userRef = db.collection("users").doc(userId);
  const counterRef = db.collection("counters").doc("users");

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const existing = snapshot.exists ? snapshot.data() : {};
    const existingProfile = existing.profile || {};
    let friendCode = existingProfile.friendCode;

    if (!friendCode) {
      const counter = await transaction.get(counterRef);
      const nextCode = counter.exists && counter.data().nextFriendCode
        ? counter.data().nextFriendCode
        : 13219873;
      friendCode = String(nextCode);
      transaction.set(counterRef, { nextFriendCode: nextCode - 1 }, { merge: true });
    }

    const profile = {
      ...createDefaultProfile(identity),
      ...existingProfile,
      friendCode,
      displayName: existingProfile.displayName || identity.displayName || identity.email?.split("@")[0] || "Developer",
      photoURL: existingProfile.photoURL || identity.photoURL || ""
    };

    transaction.set(userRef, {
      profile,
      email: existing.email || identity.email || "",
      authProvider: existing.authProvider || identity.providerId || "",
      createdAt: existing.createdAt || now,
      updatedAt: now,
      lastLoginAt: now
    }, { merge: true });
    transaction.set(db.collection("friendCodes").doc(friendCode), { uid: userId }, { merge: true });

    return profile;
  });
}

export async function saveWorkForUser(db, userId, work = {}) {
  if (!userId) throw new Error("Missing userId");
  if (userId.startsWith("guest-")) {
    const error = new Error("Continue with Google to save your work.");
    error.statusCode = 403;
    throw error;
  }

  const roomName = String(work.roomName || "").trim();
  const effectiveWork = roomName && work.originRoomId
    ? { ...work, name: roomName }
    : work;
  const metrics = getWorkMetrics(effectiveWork);
  const now = Date.now();
  const workId = getStableWorkId(userId, effectiveWork);

  if (!db || db.isMock) {
    const works = await readLocalWorks();
    const previousWork = works[workId] || null;
    assertWorkOwnership(previousWork, userId);
    assertWorkCanBeUpdated(previousWork);
    const savedWork = {
      ...effectiveWork,
      ...metrics,
      ownerId: userId,
      id: workId,
      createdAt: previousWork?.createdAt || work.createdAt || now,
      updatedAt: now,
      storage: {
        mode: "mock",
        label: "Local/mock JSON",
        savedAt: now
      },
    };
    works[savedWork.id] = savedWork;
    await writeLocalWorks(works);

    const users = await readLocalUsers();
    const existing = users[userId] || {};
    const profile = applyWorkSaveToProfile(existing.profile || createDefaultProfile(), savedWork, previousWork);
    users[userId] = { ...existing, profile, updatedAt: now };
    await writeLocalUsers(users);
    return savedWork;
  }

  const workRef = db.collection("works").doc(workId);
  const userRef = db.collection("users").doc(userId);
  let savedWork;

  await db.runTransaction(async (transaction) => {
    const [workSnap, userSnap] = await Promise.all([
      transaction.get(workRef),
      transaction.get(userRef),
    ]);
    const previousWork = workSnap.exists ? workSnap.data() : null;
    assertWorkOwnership(previousWork, userId);
    assertWorkCanBeUpdated(previousWork);
    savedWork = {
      ...effectiveWork,
      ...metrics,
      ownerId: userId,
      id: workId,
      createdAt: previousWork?.createdAt || work.createdAt || now,
      updatedAt: now,
      storage: {
        mode: "firestore",
        label: "Real Firestore",
        savedAt: now
      },
    };
    const data = userSnap.exists ? userSnap.data() : {};
    const profile = applyWorkSaveToProfile(data.profile || createDefaultProfile(), savedWork, previousWork);

    transaction.set(workRef, savedWork, { merge: true });
    transaction.set(userRef, { profile, updatedAt: now }, { merge: true });
  });

  return savedWork;
}

export async function getSavedWorkForUser(db, userId, workId) {
  const cleanUserId = String(userId || "").trim();
  const cleanWorkId = String(workId || "").trim();
  if (!cleanUserId) throw new Error("Missing userId");
  if (!cleanWorkId) throw new Error("Missing workId");

  if (!db || db.isMock) {
    const works = await readLocalWorks();
    const work = works[cleanWorkId] || null;
    if (!work) return null;
    assertWorkOwnership(work, cleanUserId);
    return work.ownerId === cleanUserId ? work : null;
  }

  const workSnap = await db.collection("works").doc(cleanWorkId).get();
  if (!workSnap.exists) return null;
  const work = workSnap.data();
  assertWorkOwnership(work, cleanUserId);
  return work.ownerId === cleanUserId ? work : null;
}

export async function endSavedWorkForUser(db, userId, workId) {
  const cleanUserId = String(userId || "").trim();
  const cleanWorkId = String(workId || "").trim();
  if (!cleanUserId) throw new Error("Missing userId");
  if (!cleanWorkId) throw new Error("Missing workId");
  const now = Date.now();

  if (!db || db.isMock) {
    const works = await readLocalWorks();
    const previousWork = works[cleanWorkId] || null;
    if (!previousWork) {
      const error = new Error("Saved work not found.");
      error.statusCode = 404;
      throw error;
    }
    assertWorkOwnership(previousWork, cleanUserId);
    const savedWork = {
      ...previousWork,
      projectStatus: "completed",
      readOnly: true,
      completedAt: previousWork.completedAt || now,
      updatedAt: now,
    };
    works[cleanWorkId] = savedWork;
    await writeLocalWorks(works);

    const users = await readLocalUsers();
    const existing = users[cleanUserId] || {};
    const profile = existing.profile || createDefaultProfile();
    const activities = Array.isArray(profile.activities) ? profile.activities : [];
    users[cleanUserId] = {
      ...existing,
      profile: {
        ...profile,
        activities: [
          {
            type: "work_end",
            workId: cleanWorkId,
            text: `Ended ${savedWork.name || "project"}`,
            subtext: "Saved as read-only",
            timestamp: now,
          },
          ...activities.filter((activity) => !(activity.type === "work_end" && activity.workId === cleanWorkId)),
        ].slice(0, 1000),
      },
      updatedAt: now,
    };
    await writeLocalUsers(users);
    return savedWork;
  }

  const workRef = db.collection("works").doc(cleanWorkId);
  const userRef = db.collection("users").doc(cleanUserId);
  let savedWork;

  await db.runTransaction(async (transaction) => {
    const [workSnap, userSnap] = await Promise.all([
      transaction.get(workRef),
      transaction.get(userRef),
    ]);
    if (!workSnap.exists) {
      const error = new Error("Saved work not found.");
      error.statusCode = 404;
      throw error;
    }
    const previousWork = workSnap.data();
    assertWorkOwnership(previousWork, cleanUserId);
    savedWork = {
      ...previousWork,
      projectStatus: "completed",
      readOnly: true,
      completedAt: previousWork.completedAt || now,
      updatedAt: now,
    };
    const data = userSnap.exists ? userSnap.data() : {};
    const profile = data.profile || createDefaultProfile();
    const activities = Array.isArray(profile.activities) ? profile.activities : [];

    transaction.set(workRef, savedWork, { merge: true });
    transaction.set(userRef, {
      profile: {
        ...profile,
        activities: [
          {
            type: "work_end",
            workId: cleanWorkId,
            text: `Ended ${savedWork.name || "project"}`,
            subtext: "Saved as read-only",
            timestamp: now,
          },
          ...activities.filter((activity) => !(activity.type === "work_end" && activity.workId === cleanWorkId)),
        ].slice(0, 1000),
      },
      updatedAt: now,
    }, { merge: true });
  });

  return savedWork;
}

export async function deleteSavedWorkForUser(db, userId, workId) {
  const cleanUserId = String(userId || "").trim();
  const cleanWorkId = String(workId || "").trim();
  if (!cleanUserId) throw new Error("Missing userId");
  if (!cleanWorkId) throw new Error("Missing workId");
  const now = Date.now();

  if (!db || db.isMock) {
    const works = await readLocalWorks();
    const targetWork = works[cleanWorkId] || null;
    if (!targetWork) {
      const error = new Error("Saved work not found.");
      error.statusCode = 404;
      throw error;
    }
    assertWorkOwnership(targetWork, cleanUserId);

    const userWorks = Object.values(works).filter((work) => work.ownerId === cleanUserId);
    const deletedWorkIds = getDeletedWorkIds(userWorks, targetWork);
    for (const id of deletedWorkIds) delete works[id];
    await writeLocalWorks(works);

    const users = await readLocalUsers();
    const existing = users[cleanUserId] || {};
    const remainingWorks = Object.values(works).filter((work) => work.ownerId === cleanUserId);
    users[cleanUserId] = {
      ...existing,
      profile: applyWorkDeletionToProfile(existing.profile || createDefaultProfile(), deletedWorkIds, remainingWorks),
      updatedAt: now
    };
    await writeLocalUsers(users);

    return { deletedWorkIds, deletedCount: deletedWorkIds.length };
  }

  const targetSnap = await db.collection("works").doc(cleanWorkId).get();
  if (!targetSnap.exists) {
    const error = new Error("Saved work not found.");
    error.statusCode = 404;
    throw error;
  }
  const targetWork = targetSnap.data();
  assertWorkOwnership(targetWork, cleanUserId);

  const querySnapshot = await db.collection("works").where("ownerId", "==", cleanUserId).get();
  const userWorks = [];
  querySnapshot.forEach((doc) => userWorks.push({ ...doc.data(), id: doc.id }));
  const deletedWorkIds = getDeletedWorkIds(userWorks, { ...targetWork, id: cleanWorkId });
  const remainingWorks = userWorks.filter((work) => !deletedWorkIds.includes(work.id));
  const userRef = db.collection("users").doc(cleanUserId);
  const userSnap = await userRef.get();
  const existing = userSnap.exists ? userSnap.data() : {};
  const batch = db.batch();

  for (const id of deletedWorkIds) {
    batch.delete(db.collection("works").doc(id));
  }
  batch.set(userRef, {
    profile: applyWorkDeletionToProfile(existing.profile || createDefaultProfile(), deletedWorkIds, remainingWorks),
    updatedAt: now
  }, { merge: true });
  await batch.commit();

  return { deletedWorkIds, deletedCount: deletedWorkIds.length };
}

export function createProfileController() {
  const db = createFirestore();

  return {
    saveWorkForUser: (userId, work) => saveWorkForUser(db, userId, work),
    getSavedWorkForUser: (userId, workId) => getSavedWorkForUser(db, userId, workId),
    endSavedWorkForUser: (userId, workId) => endSavedWorkForUser(db, userId, workId),
    deleteSavedWorkForUser: (userId, workId) => deleteSavedWorkForUser(db, userId, workId),

    bootstrap: async (request, response) => {
      try {
        const firebaseUser = request.firebaseUser;
        const profile = await ensureProfileRecord(db, firebaseUser.uid, {
          displayName: firebaseUser.name,
          email: firebaseUser.email,
          photoURL: firebaseUser.picture,
          providerId: firebaseUser.firebase?.sign_in_provider || "firebase"
        });
        return response.json({ ...profile, id: firebaseUser.uid });
      } catch (error) {
        console.warn(`Profile bootstrap failed: ${error.message}`);
        return response.status(500).json({ error: "Could not prepare your profile." });
      }
    },

    get: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      if (!userId) return response.status(400).json({ error: "Missing userId" });
      if (userId.startsWith("guest-")) return response.json({});

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
            const signedInName = String(request.firebaseUser?.name || request.firebaseUser?.email?.split("@")[0] || "").trim();
            const isOwnSignedInProfile = request.firebaseUser?.uid && request.firebaseUser.uid === trueUserId;
            const targetProfile = targetUser.profile || {};
            if (isOwnSignedInProfile && signedInName && (!targetProfile.displayName || targetProfile.displayName === "Someone")) {
              targetUser.profile = {
                ...targetProfile,
                displayName: signedInName
              };
              users[trueUserId] = targetUser;
              await writeLocalUsers(users);
            }
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
          const signedInName = String(request.firebaseUser?.name || request.firebaseUser?.email?.split("@")[0] || "").trim();
          const isOwnSignedInProfile = request.firebaseUser?.uid && request.firebaseUser.uid === trueUserId;
          if (!data.profile?.friendCode) {
             const newFriendCode = await getNextFriendCode(db, trueUserId);
             const updatedProfile = { ...data.profile, friendCode: newFriendCode };
             await db.collection("users").doc(trueUserId).set({ profile: updatedProfile }, { merge: true });
             data.profile = updatedProfile;
          }
          if (isOwnSignedInProfile && signedInName && (!data.profile?.displayName || data.profile.displayName === "Someone")) {
            const updatedProfile = { ...(data.profile || {}), displayName: signedInName };
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
      if (userId.startsWith("guest-")) return response.status(403).json({ error: "Continue with Google to save a profile." });
      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          const existingProfile = (users[userId] || {}).profile || {};
          const incomingFriends = Array.isArray(profile.friends) ? profile.friends : null;
          const shouldPreserveFriends =
            Array.isArray(existingProfile.friends) &&
            existingProfile.friends.length > 0 &&
            (!incomingFriends || incomingFriends.length === 0);
          users[userId] = {
            ...(users[userId] || {}),
            profile: {
              ...existingProfile,
              ...profile,
              friends: shouldPreserveFriends ? existingProfile.friends : (incomingFriends || existingProfile.friends || [])
            },
            updatedAt: Date.now()
          };
          await writeLocalUsers(users);
          return response.json({ ok: true });
        }

        const userRef = db.collection("users").doc(userId);
        const snapshot = await userRef.get();
        const existingProfile = snapshot.exists ? snapshot.data().profile || {} : {};
        const incomingFriends = Array.isArray(profile.friends) ? profile.friends : null;
        const shouldPreserveFriends =
          Array.isArray(existingProfile.friends) &&
          existingProfile.friends.length > 0 &&
          (!incomingFriends || incomingFriends.length === 0);
        await userRef.set({
          profile: {
            ...existingProfile,
            ...profile,
            friends: shouldPreserveFriends ? existingProfile.friends : (incomingFriends || existingProfile.friends || [])
          },
          updatedAt: Date.now()
        }, { merge: true });
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

      try {
        const savedWork = await saveWorkForUser(db, userId, work);
        return response.json({ ok: true, work: savedWork });
      } catch (error) {
        console.warn(`Work save failed: ${error.message}`);
        return response.status(error.statusCode || 500).json({ error: error.message });
      }
    },

    endWork: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const workId = String(request.params.workId || "").trim();
      if (!userId || !workId) return response.status(400).json({ error: "Missing work details." });

      try {
        const work = await endSavedWorkForUser(db, userId, workId);
        return response.json({ ok: true, work });
      } catch (error) {
        console.warn(`Work end failed: ${error.message}`);
        return response.status(error.statusCode || 500).json({ error: error.message });
      }
    },

    deleteWork: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const workId = String(request.params.workId || "").trim();
      if (!userId || !workId) return response.status(400).json({ error: "Missing work details." });

      try {
        const result = await deleteSavedWorkForUser(db, userId, workId);
        return response.json({ ok: true, ...result });
      } catch (error) {
        console.warn(`Work delete failed: ${error.message}`);
        return response.status(error.statusCode || 500).json({ error: error.message });
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
          return response.json(collapseDuplicateWorks(userWorks));
        }

        const querySnapshot = await db.collection("works")
          .where("ownerId", "==", userId)
          .get();
          
        const works = [];
        querySnapshot.forEach(doc => works.push(doc.data()));
        
        return response.json(collapseDuplicateWorks(works));
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
            const foundEntry = Object.entries(users).find(([, u]) => u.profile?.friendCode === query);
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
        } catch {
          // Fall through to 404
        }
        
        return response.status(404).json({ error: "User not found" });
      } catch {
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
          emitNotificationRefresh(targetUserId, "friend-request");
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
          } catch {
            // Ignore missing Firebase Auth user lookups.
          }
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

        emitNotificationRefresh(targetUserId, "friend-request");
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
          emitNotificationRefresh(userId, "friend-request-handled");
          if (action === "accept") {
            emitFriendsRefresh(userId, "friend-request-accepted");
            emitFriendsRefresh(notif.senderId, "friend-request-accepted");
          }
          
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
        emitNotificationRefresh(userId, "friend-request-handled");
        if (action === "accept") {
          emitFriendsRefresh(userId, "friend-request-accepted");
          emitFriendsRefresh(senderId, "friend-request-accepted");
        }

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
          emitFriendsRefresh(userId, "friend-removed");
          emitFriendsRefresh(friendId, "friend-removed");
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

        emitFriendsRefresh(userId, "friend-removed");
        emitFriendsRefresh(friendId, "friend-removed");
        return response.json({ ok: true });
      } catch (error) {
        console.error(`Failed to remove friend: ${error.message}`);
        return response.status(500).json({ error: "Internal server error" });
      }
    }
  };
}
