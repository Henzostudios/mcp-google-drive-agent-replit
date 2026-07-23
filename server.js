/**
 * ============================================================
 * Portfolio Piece: Google Drive Asset Tagging MCP Server
 * Developer: Nikko Griffin / HenzoStudios
 * ============================================================
 * LEARNING JOURNEY: 
 * Initially, I built this as a static web app making direct REST 
 * calls to Anthropic and a Google Apps Script. Through my Claude 
 * Certification, I learned that true agentic architecture separates 
 * the tool logic from the client. 
 * 
 * By rewriting this as an MCP (Model Context Protocol) server, I am 
 * exposing my Google Drive workflow as modular "Tools". This allows 
 * any MCP-compatible client (like Claude Desktop) to autonomously 
 * discover and execute these functions without custom UI integrations.
 * ============================================================
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// LEARNING JOURNEY: Keeping the Apps Script backend allows me to bypass 
// complex Google OAuth flows in Node.js, acting as a secure microservice.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyHNEKhDUR4a4woB-jJdUgp9f4kE78ym69RsODEw85PXq8jokN1S3S0cuETqIeBDI62TA/exec";
const SHARED_TOKEN = "53ce486d8b466d41fb75cbac";

// Initialize the MCP Server
const server = new McpServer({
  name: "Henzo-Drive-Asset-Manager",
  version: "1.0.0"
});

/**
 * TOOL 1: list_drive_files
 * LEARNING JOURNEY: Using Zod for schema validation ensures the LLM 
 * strictly formats its arguments before the tool ever executes, 
 * preventing malformed API requests.
 */
server.tool(
  "list_drive_files",
  "List up to 15 files inside a specific Google Drive folder.",
  {
    folderId: z.string().describe("The specific Google Drive Folder ID to read from.")
  },
  async ({ folderId }) => {
    try {
      const fetchUrl = `${APPS_SCRIPT_URL}?action=list&folderId=${folderId}&token=${SHARED_TOKEN}`;
      const response = await fetch(fetchUrl);
      const data = await response.json();

      if (!data.success) {
        return { content: [{ type: "text", text: `Error: ${data.error}` }], isError: true };
      }

      // Return the file list as text for the LLM to process in its context window
      return {
        content: [{ type: "text", text: JSON.stringify(data.files, null, 2) }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Fetch failed: ${error.message}` }], isError: true };
    }
  }
);

/**
 * TOOL 2: tag_drive_file
 * LEARNING JOURNEY: Instead of asking the LLM to return a massive JSON block 
 * for me to parse on the frontend, I expose a tool that lets the LLM iteratively 
 * tag files one by one as it reasons through them.
 */
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

/**
 * START SERVER
 * Connect the server using standard input/output (stdio), which is the 
 * standard communication layer for local MCP servers.
 */
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Henzo MCP Server running on stdio"); // MCP logs must go to stderr
}

run().catch(console.error);