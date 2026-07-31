import { Router } from "express";
import { createCompilerRoutes } from "./compiler.js";
import { adminAuth } from "../middleware/adminAuth.js";
import rateLimit from "express-rate-limit";
import { generateChallenge, submitChallenge } from "../controllers/challengeController.js";

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

export function createApiRoutes({ roomController, executionController, aiController, emotionController, profileController, compilerController, adminController, problemController, feedbackController, notificationController }) {
  const router = Router();
  
  // Apply standard rate limit to all routes
  router.use(apiLimiter);

  router.get("/health", (_request, response) => response.json({ ok: true }));
  router.get("/rooms", roomController.list);
  router.post("/rooms", roomController.rateLimit, roomController.create);
  router.get("/rooms/invite/:code", roomController.findByInviteCode);
  router.get("/rooms/:id", roomController.get);
  
  // Public problem routes
  router.get("/problems", problemController.list);
  router.get("/problems/:id", problemController.get);
  // Profile routes
  if (profileController) {
    router.get("/profiles/search/:query", profileController.searchUser);
    router.get("/profiles/:userId", profileController.get);
    router.post("/profiles/:userId", profileController.save);
    router.post("/profiles/:userId/save-work", profileController.saveWork);
    router.post("/profiles/:userId/tour-status", profileController.saveTourStatus);
    router.get("/profiles/:userId/tour-status/:pageName", profileController.getTourStatus);
    router.post("/profiles/:userId/solve", profileController.solveProblem);
    router.get("/profiles/:userId/works", profileController.listWorks);
    router.post("/profiles/:userId/friends/request", profileController.sendFriendRequest);
    router.post("/profiles/:userId/friends/handle", profileController.handleFriendRequest);
    router.delete("/profiles/:userId/friends/:friendId", profileController.removeFriend);
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
  router.post("/challenge/generate", generateChallenge);
  router.post("/challenge/submit", submitChallenge);

  // Feedback routes
  router.post("/feedback", feedbackController.submit);
  router.get("/admin/feedback", adminAuth, feedbackController.getAll);

  // Admin routes (Protected)
  if (adminController) {
    if (notificationController) {
      router.post("/admin/announcements", adminAuth, notificationController.sendAnnouncement);
    }
    router.get("/admin/stats", adminAuth, adminController.getStats);
    router.get("/admin/rooms", adminAuth, adminController.getRooms);
    router.get("/admin/users", adminAuth, adminController.getUsers);
    router.post("/admin/users/:id/role", adminAuth, adminController.updateUserRole);
    router.get("/admin/problems", adminAuth, adminController.getProblems);
    router.delete("/admin/rooms/:id", adminAuth, adminController.deleteRoom);
    router.post("/admin/rooms/:id/lock", adminAuth, adminController.toggleRoomLock);
    router.post("/admin/problems/:id/publish", adminAuth, adminController.publishProblem);
    router.delete("/admin/problems/:id", adminAuth, adminController.deleteProblem);
    router.post("/admin/problems", adminAuth, adminController.addProblem);
    router.put("/admin/problems/:id", adminAuth, adminController.updateProblem);
  }

  if (notificationController) {
    router.get("/notifications/:userId", notificationController.getNotifications);
    router.post("/notifications/invite", notificationController.sendRoomInvite);
    router.post("/notifications/:userId/read", notificationController.markAsRead);
  }

  return router;
}
