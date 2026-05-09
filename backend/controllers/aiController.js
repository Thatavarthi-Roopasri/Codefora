export function createAiController(aiService) {
  return {
    ask: async (request, response) => {
      try {
        response.json(await aiService.ask(request.body || {}));
      } catch (error) {
        response.status(500).json({ error: error.message });
      }
    }
  };
}
