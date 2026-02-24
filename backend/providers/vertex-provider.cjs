function createVertexProvider() {
  return {
    id: "vertex",
    async generateChat() {
      throw new Error(
        "Vertex provider is not configured yet. Add credentials and implementation in backend/providers/vertex-provider.cjs.",
      );
    },
  };
}

module.exports = {
  createVertexProvider,
};
