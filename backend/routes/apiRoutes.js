import { Router } from "express";
import { createCompilerRoutes } from "./compiler.js";
import { adminAuth } from "../middleware/adminAuth.js";

export function createApiRoutes({ roomController, executionController, aiController, emotionController, profileController, compilerController, adminController, problemController, feedbackController }) {
  const router = Router();

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
    router.get("/profiles/:userId", profileController.get);
    router.post("/profiles/:userId", profileController.save);
    router.post("/profiles/:userId/save-work", profileController.saveWork);
    router.post("/profiles/:userId/tour-status", profileController.saveTourStatus);
    router.get("/profiles/:userId/tour-status/:pageName", profileController.getTourStatus);
    router.post("/profiles/:userId/solve", profileController.solveProblem);
    router.get("/profiles/:userId/works", profileController.listWorks);
  }
  if (compilerController) {
    router.use("/compiler", createCompilerRoutes(compilerController));
  }
  router.post("/run", executionController.run);
  router.post("/ai", aiController.ask);
  
  // Emotion routes
  router.get("/emotions", emotionController.getEmotions);
  router.get("/emotions/:emotionId/image", emotionController.getEmotionImage);
  router.post("/emotions/init", emotionController.initEmotions);

  // Feedback routes
  router.post("/feedback", feedbackController.submit);
  router.get("/admin/feedback", adminAuth, feedbackController.getAll);

  // Admin routes (Protected)
  if (adminController) {
    router.get("/admin/stats", adminAuth, adminController.getStats);
    router.get("/admin/rooms", adminAuth, adminController.getRooms);
    router.get("/admin/users", adminAuth, adminController.getUsers);
    router.get("/admin/problems", adminAuth, adminController.getProblems);
    router.delete("/admin/rooms/:id", adminAuth, adminController.deleteRoom);
    router.post("/admin/rooms/:id/lock", adminAuth, adminController.toggleRoomLock);
    router.post("/admin/problems/:id/publish", adminAuth, adminController.publishProblem);
    router.delete("/admin/problems/:id", adminAuth, adminController.deleteProblem);
    router.post("/admin/problems", adminAuth, adminController.addProblem);
    router.put("/admin/problems/:id", adminAuth, adminController.updateProblem);
  }

  return router;
}
