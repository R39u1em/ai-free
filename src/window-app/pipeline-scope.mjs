export function projectPipeline(pipeline, visibleIds) {
  return {
    ...pipeline,
    mainAgentId: visibleIds.has(pipeline?.mainAgentId) ? pipeline.mainAgentId : null,
    edges: (pipeline?.edges || []).filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)),
  };
}

export function mergeVisiblePipeline(existing, patch, visibleIds) {
  const hiddenEdges = (existing?.edges || []).filter((edge) => !visibleIds.has(edge.from) || !visibleIds.has(edge.to));
  return {
    ...patch,
    edges: [...hiddenEdges, ...(patch?.edges || [])],
    mainAgentId: patch?.mainAgentId || (visibleIds.has(existing?.mainAgentId) ? null : existing?.mainAgentId || null),
  };
}
