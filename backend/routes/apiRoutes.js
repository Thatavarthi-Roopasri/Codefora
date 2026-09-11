import { Router } from "express";
import { createCompilerRoutes } from "./compiler.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { firebaseAuth, optionalFirebaseAuth, requireCurrentUser } from "../middleware/firebaseAuth.js";
import rateLimit from "express-rate-limit";
import { generateChallenge, getChallengeRuntimeStatus, submitChallenge } from "../controllers/challengeController.js";
import { getFirebaseServiceStatus } from "../config/firebase.js";
import { validateStartupEnv } from "../config/envValidation.js";

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per windowMs
  message: { error: "Too many requests from this IP, please try again later." }
});

const heavyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20, // Limit AI/Compiler to 20 requests per min
  message: { error: "Rate limit exceeded for heavy operations." }
});

export function createApiRoutes({ roomController, roomProjectController, roomRepository, executionController, aiController, emotionController, profileController, compilerController, adminController, problemController, feedbackController, notificationController, directMessageController }) {
  const router = Router();
  
  // Apply standard rate limit to all routes
  router.use(apiLimiter);

  router.get("/health", (_request, response) => {
    const firebase = getFirebaseServiceStatus();
    response.json({
      ok: true,
      firestore: firebase.firestore.mode,
      auth: firebase.auth.mode,
      services: {
        environment: validateStartupEnv({ strict: false }),
        firebase,
        challengeRenderer: getChallengeRuntimeStatus(),
        rooms: {
          storage: roomRepository?.storageMode?.() || "unknown"
        }
      }
    });
  });
  router.get("/rooms", optionalFirebaseAuth, roomController.list);
  router.post("/rooms", optionalFirebaseAuth, roomController.rateLimit, roomController.create);
  router.get("/rooms/invite/:code", roomController.findByInviteCode);
  if (roomProjectController) {
    router.post("/rooms/:id/project", firebaseAuth, roomProjectController.save);
    router.post("/rooms/:id/project/resume", firebaseAuth, roomProjectController.resume);
    router.post("/rooms/:id/project/end", firebaseAuth, roomProjectController.end);
  }
  router.get("/rooms/:id", optionalFirebaseAuth, roomController.get);
  
  // Public problem routes
  router.get("/problems", problemController.list);
  router.get("/problems/:id", problemController.get);
  // Profile routes
  if (profileController) {
    router.post("/profiles/bootstrap", firebaseAuth, profileController.bootstrap);
    router.get("/profiles/search/:query", profileController.searchUser);
    router.get("/profiles/:userId", optionalFirebaseAuth, profileController.get);
    router.post("/profiles/:userId", firebaseAuth, requireCurrentUser, profileController.save);
    router.post("/profiles/:userId/save-work", firebaseAuth, requireCurrentUser, profileController.saveWork);
    router.post("/profiles/:userId/works/:workId/end", firebaseAuth, requireCurrentUser, profileController.endWork);
    if (profileController.deleteWork) {
      router.delete("/profiles/:userId/works/:workId", firebaseAuth, requireCurrentUser, profileController.deleteWork);
    }
    router.post("/profiles/:userId/works/:workId/resume-room", firebaseAuth, requireCurrentUser, roomProjectController.reopenSavedWork);
    router.post("/profiles/:userId/tour-status", firebaseAuth, requireCurrentUser, profileController.saveTourStatus);
    router.get("/profiles/:userId/tour-status/:pageName", firebaseAuth, requireCurrentUser, profileController.getTourStatus);
    router.post("/profiles/:userId/solve", firebaseAuth, requireCurrentUser, profileController.solveProblem);
    router.get("/profiles/:userId/works", firebaseAuth, requireCurrentUser, profileController.listWorks);
    router.post("/profiles/:userId/friends/request", firebaseAuth, requireCurrentUser, profileController.sendFriendRequest);
    router.post("/profiles/:userId/friends/handle", firebaseAuth, requireCurrentUser, profileController.handleFriendRequest);
    router.delete("/profiles/:userId/friends/:friendId", firebaseAuth, requireCurrentUser, profileController.removeFriend);
  }
  if (compilerController) {
    router.use("/compiler", heavyLimiter, createCompilerRoutes(compilerController));
  }
  router.post("/run", heavyLimiter, executionController.run);
  
  // Basic payload validation for AI route
  const validateAiRequest = (req, res, next) => {
    if (!req.body || typeof req.body.prompt !== 'string') {
      return res.status(400).json({ error: "Invalid AI request payload" });
    }
    next();
  };
  
  router.post("/ai", heavyLimiter, validateAiRequest, aiController.ask);
  
  // Emotion routes
  router.get("/emotions", emotionController.getEmotions);
  router.get("/emotions/:emotionId/image", emotionController.getEmotionImage);
  router.post("/emotions/init", emotionController.initEmotions);

  // Challenge Routes
  router.post("/challenge/generate", heavyLimiter, generateChallenge);
  router.post("/challenge/submit", heavyLimiter, submitChallenge);

  // Feedback routes
  router.post("/feedback", feedbackController.submit);
  router.get("/admin/feedback", adminAuth, feedbackController.getAll);
  router.patch("/admin/feedback/:id/status", adminAuth, feedbackController.updateStatus);

  // Admin routes (Protected)
  if (adminController) {
    router.get("/admin/me", adminAuth, adminController.me);
    if (notificationController) {
      router.post("/admin/announcements", adminAuth, notificationController.sendAnnouncement);
    }
    router.get("/admin/stats", adminAuth, adminController.getStats);
    router.get("/admin/rooms", adminAuth, adminController.getRooms);
    router.get("/admin/users", adminAuth, adminController.getUsers);
    router.post("/admin/users/:id/role", adminAuth, adminController.updateUserRole);
    router.patch("/admin/users/:id/account-status", adminAuth, adminController.updateUserAccountStatus);
    router.get("/admin/submissions", adminAuth, adminController.getSubmissions);
    router.get("/admin/audit-log", adminAuth, adminController.getAuditLog);
    router.get("/admin/problems", adminAuth, adminController.getProblems);
    router.delete("/admin/rooms/:id", adminAuth, adminController.deleteRoom);
    router.post("/admin/rooms/:id/lock", adminAuth, adminController.toggleRoomLock);
    router.post("/admin/problems/:id/publish", adminAuth, adminController.publishProblem);
    router.delete("/admin/problems/:id", adminAuth, adminController.deleteProblem);
    router.post("/admin/problems", adminAuth, adminController.addProblem);
    router.put("/admin/problems/:id", adminAuth, adminController.updateProblem);
  }

  if (notificationController) {
    router.get("/notifications/:userId", firebaseAuth, requireCurrentUser, notificationController.getNotifications);
    router.post("/notifications/invite", firebaseAuth, notificationController.sendRoomInvite);
    router.post("/notifications/:userId/read", firebaseAuth, requireCurrentUser, notificationController.markAsRead);
  }
  if (directMessageController) {
    router.post("/messages", firebaseAuth, directMessageController.send);
    router.get("/messages/:messageId", firebaseAuth, directMessageController.get);
    router.post("/messages/:messageId/seen", firebaseAuth, directMessageController.seen);
  }

  return router;
}
