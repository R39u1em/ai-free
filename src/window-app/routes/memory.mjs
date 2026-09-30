// HTTP routes для memory API.

import { addMemory, deleteMemory, getMemoryById, searchMemory, getMemoryBackend, warmMemoryBackend } from "../../memory/store.mjs";
import { getGraphBackend } from "../../memory/graph/store.mjs";
import { getMemoryQueueStats } from "../../memory/async-queue.mjs";
import { sendJson, readJsonBody } from "../http.mjs";

export async function handleMemoryRoute(req, url, res, { workspaceAllowed } = {}) {
  if (url.pathname === "/api/memory/queue" && req.method === "GET") {
    if (workspaceAllowed) {
      sendJson(res, { error: "Unavailable through main" }, 403);
      return true;
    }
    sendJson(res, getMemoryQueueStats());
    return true;
  }

  if (url.pathname === "/api/memory" && req.method === "GET") {
    const query = url.searchParams.get("q") || "";
    const workspace = url.searchParams.get("workspace") || "";
    if (workspaceAllowed && !workspaceAllowed(workspace)) {
      sendJson(res, { error: "Workspace unavailable through main" }, 403);
      return true;
    }
    sendJson(res, {
      items: scopedItems(searchMemory(query, workspace), workspaceAllowed, workspace),
      backend: getMemoryBackend(),
      graphBackend: getGraphBackend(),
    });
    return true;
  }

  if (url.pathname === "/api/memory/search" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (workspaceAllowed && !workspaceAllowed(body.workspace)) {
      sendJson(res, { error: "Workspace unavailable through main" }, 403);
      return true;
    }
    sendJson(res, {
      items: scopedItems(searchMemory(body.query || "", body.workspace || ""), workspaceAllowed, body.workspace),
    });
    return true;
  }

  if (url.pathname === "/api/memory" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (workspaceAllowed && !workspaceAllowed(body.workspace)) {
      sendJson(res, { error: "Workspace unavailable through main" }, 403);
      return true;
    }
    const item = addMemory({
      type: body.type || "note",
      content: body.content || "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      workspace: body.workspace || "",
      meta: { ...(body.meta || {}), important: true },
    });
    if (!item) {
      sendJson(res, { error: "Memory rejected (not important enough)" }, 400);
      return true;
    }
    sendJson(res, { item });
    return true;
  }

  const itemMatch = url.pathname.match(/^\/api\/memory\/([^/]+)$/);
  if (itemMatch) {
    const id = decodeURIComponent(itemMatch[1]);
    if (req.method === "GET") {
      const item = getMemoryById(id);
      if (!item || (workspaceAllowed && !workspaceAllowed(item.workspace))) {
        sendJson(res, { error: "Not found" }, 404);
        return true;
      }
      sendJson(res, { item });
      return true;
    }
    if (req.method === "DELETE") {
      const item = getMemoryById(id);
      if (workspaceAllowed && (!item || !workspaceAllowed(item.workspace))) {
        sendJson(res, { error: "Not found" }, 404);
        return true;
      }
      const ok = deleteMemory(id);
      sendJson(res, { ok });
      return true;
    }
  }

  return false;
}

function scopedItems(items, workspaceAllowed, workspace) {
  return workspaceAllowed ? items.filter((item) => item.workspace === workspace) : items;
}
