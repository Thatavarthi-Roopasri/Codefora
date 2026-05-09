import { Router } from "express";

export function createCompilerRoutes(compilerController) {
  const router = Router();

  router.post("/run", compilerController.rateLimit, compilerController.run);

  return router;
}