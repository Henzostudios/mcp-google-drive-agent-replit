import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyHNEKhDUR4a4woB-jJdUgp9f4kE78ym69RsODEw85PXq8jokN1S3S0cuETqIeBDI62TA/exec";
const SHARED_TOKEN = "53ce486d8b466d41fb75cbac";

function buildServer() {
  const server = new McpServer({
    name: "Henzo-Drive-Asset-Manager",
    version: "1.0.0"
  });

  // TOOL 1: Accepts ANY public folder ID or link extracted by the LLM
  server.tool(
    "list_drive_files",
    "List up to 15 files inside any public Google Drive folder link or folder ID.",
    {
      folderId: z.string().describe("The Google Drive Folder ID or extracted folder ID from a URL.")
    },
    async ({ folderId }) => {
      try {
        // Clean folder ID if full URL was passed directly
        const cleanId = folderId.includes("folders/") 
          ? folderId.split("folders/")[1].split("?")[0] 
          : folderId;

        const fetchUrl = `${APPS_SCRIPT_URL}?action=list&folderId=${cleanId}&token=${SHARED_TOKEN}`;
        const response = await fetch(fetchUrl);
        const data = await response.json();

        if (!data.success) {
          return { content: [{ type: "text", text: `Error: ${data.error}` }], isError: true };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.files, null, 2) }]
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Fetch failed: ${error.message}` }], isError: true };
      }
    }
  );

  // TOOL 2: Tags any file passed by the LLM
  server.tool(
    "tag_drive_file",
    "Star a file and add AI-generated category and tags to its Drive description.",
    {
      fileId: z.string().describe("The Google Drive File ID."),
      category: z.string().describe("The primary category (e.g., 3D Asset, Video, Render/Image)."),
      tags: z.array(z.string()).describe("Array of up to 3 short string tags.")
    },
    async ({ fileId, category, tags }) => {
      try {
        const tagString = `Agent Category: ${category} | Tags: ${tags.join(', ')}`;
        const updateUrl = `${APPS_SCRIPT_URL}?action=update&fileId=${fileId}&description=${encodeURIComponent(tagString)}&token=${SHARED_TOKEN}`;

        const response = await fetch(updateUrl);
        const data = await response.json();

        if (!data.success) {
          return { content: [{ type: "text", text: `Error updating file: ${data.error}` }], isError: true };
        }

        return {
          content: [{ type: "text", text: `Successfully tagged file ${fileId} with category ${category}.` }]
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Update failed: ${error.message}` }], isError: true };
      }
    }
  );

  return server;
}

const app = createMcpExpressApp({ host: "0.0.0.0" });

app.post("/mcp", async (req, res) => {
  const server = buildServer();
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

app.get("/mcp", (req, res) => {
  res.writeHead(405).end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP remote server listening on 0.0.0.0:${PORT}/mcp`);
});