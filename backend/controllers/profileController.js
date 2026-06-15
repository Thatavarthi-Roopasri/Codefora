import { createFirestore, admin } from "../config/firebase.js";
import fs from "fs/promises";
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

export function createProfileController() {
  const db = createFirestore();

  return {
    get: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      if (!userId) return response.status(400).json({ error: "Missing userId" });
      try {
        if (!db || db.isMock) {
          const users = await readLocalUsers();
          const user = users[userId] || {};
          return response.json(user.profile || {});
        }

        const doc = await db.collection("users").doc(userId).get();
        if (!doc.exists) return response.status(404).json({ error: "Profile not found" });
        const data = doc.data() || {};
        return response.json(data.profile || {});
      } catch (error) {
        console.warn(`Profile get failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    save: async (request, response) => {
      const userId = String(request.params.userId || "").trim();
      const profile = request.body || {};
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
          users[userId].profile.activities = users[userId].profile.activities.slice(0, 10);
          users[userId].updatedAt = Date.now();
          await writeLocalUsers(users);
          return;
        }

        const docRef = db.collection("users").doc(userId);
        const doc = await docRef.get();
        const data = doc.exists ? doc.data() : { profile: { activities: [] } };
        const activities = data.profile?.activities || [];
        activities.unshift({ ...activity, timestamp: Date.now() });
        const cappedActivities = activities.slice(0, 10);
        
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
            profile.activities = profile.activities.slice(0, 10);
            
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
          const cappedActivities = activities.slice(0, 10);
          await docRef.set({ profile: { activities: cappedActivities } }, { merge: true });
        }
        
        return response.json({ ok: true, solvedProblems: solved });
      } catch (error) {
        console.error(`Failed to record solved problem: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    }
  };
}
