import { Router } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiConfig } from "../config.js";
import { createMcpServer } from "./server.js";
import { getLogger } from "../shared/logger.js";

export function mcpRouter(config: ApiConfig): Router {
  const router = Router();
  const logger = getLogger();

  // Map session IDs to transports and their servers
  const sessions = new Map<
    string,
    { transport: StreamableHTTPServerTransport; server: McpServer }
  >();

  // POST /mcp — MCP JSON-RPC requests
  router.post("/", async (req, res) => {
    try {
      // Check for existing session
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        const { transport } = sessions.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // Unknown session ID — reject
      if (sessionId && !sessions.has(sessionId)) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      // New session — create fresh server + transport pair
      const server = createMcpServer(config.baseRpcUrl);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          const session = sessions.get(transport.sessionId);
          if (session) {
            session.server.close();
          }
          sessions.delete(transport.sessionId);
          logger.info(
            { sessionId: transport.sessionId },
            "MCP session closed",
          );
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      // Session ID is generated during handleRequest
      const newSessionId = transport.sessionId;
      if (newSessionId) {
        sessions.set(newSessionId, { transport, server });
        logger.info({ sessionId: newSessionId }, "MCP session created");
      } else {
        logger.warn("MCP transport has no sessionId after handleRequest");
      }
    } catch (err) {
      logger.error({ err: String(err) }, "MCP POST error");
      if (!res.headersSent) {
        res.status(500).json({ error: "MCP request failed" });
      }
    }
  });

  // GET /mcp — SSE stream
  router.get("/", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Missing or invalid session ID" });
      return;
    }

    const { transport } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // DELETE /mcp — session termination
  router.delete("/", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const { transport, server } = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
    await server.close();
    sessions.delete(sessionId);
    logger.info({ sessionId }, "MCP session terminated");
  });

  return router;
}
