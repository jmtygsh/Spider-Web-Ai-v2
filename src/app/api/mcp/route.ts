import { createBaseMcpServer } from "@corsair-dev/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextResponse } from "next/server";

import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";

type McpServerSession = {
  server: ReturnType<typeof createBaseMcpServer>;
  transport: WebStandardStreamableHTTPServerTransport;
  tenantId: string;
};

const sessions = new Map<string, McpServerSession>();

async function cleanupSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  sessions.delete(sessionId);
  await session.transport.close();
  await session.server.close();
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function getSessionForRequest(request: Request) {
  let workspace;
  try {
    workspace = await requireAuthenticatedWorkspace();
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return { error: jsonError(401, "Unauthorized"), session: null };
    }

    throw error;
  }

  const sessionId = request.headers.get("mcp-session-id");
  if (!sessionId) {
    return {
      error: jsonError(400, "Missing or invalid mcp-session-id"),
      session: null,
    };
  }

  const session = sessions.get(sessionId);
  if (!session || session.tenantId !== workspace.tenantId) {
    return { error: jsonError(404, "Session not found"), session: null };
  }

  return { error: null, session };
}

export async function POST(request: Request) {
  let workspace;
  try {
    workspace = await requireAuthenticatedWorkspace();
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return jsonError(401, "Unauthorized");
    }

    throw error;
  }

  const sessionId = request.headers.get("mcp-session-id");
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session || session.tenantId !== workspace.tenantId) {
      return jsonError(404, "Session not found");
    }

    return session.transport.handleRequest(request);
  }

  const server = createBaseMcpServer({
    corsair: workspace.tenant,
    tenantId: workspace.tenantId,
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (createdSessionId: string) => {
      sessions.set(createdSessionId, {
        server,
        transport,
        tenantId: workspace.tenantId,
      });
    },
    onsessionclosed: async (closedSessionId: string) => {
      sessions.delete(closedSessionId);
      await server.close();
    },
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const createdSessionId = transport.sessionId;

  if (createdSessionId) {
    setTimeout(() => {
      void cleanupSession(createdSessionId);
    }, 60_000);
  }

  return response;
}

export async function GET(request: Request) {
  const { error, session } = await getSessionForRequest(request);
  if (error || !session) return error!;

  return session.transport.handleRequest(request);
}

export async function DELETE(request: Request) {
  const { error, session } = await getSessionForRequest(request);
  if (error || !session) return error!;

  const sessionId = request.headers.get("mcp-session-id");
  if (sessionId) {
    await cleanupSession(sessionId);
  }

  return new Response(null, { status: 200 });
}
