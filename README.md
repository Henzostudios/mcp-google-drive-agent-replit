# Claude Asset Tagging Agent

**Copyright © Nikko Griffin | HenzoStudios**



Overview

\---

The **Claude Asset Tagging Agent** is a robust Model Context Protocol (MCP) server that connects large language models
directly to Google Drive. It operates as an autonomous agent that reads files from any public Google Drive folder link,
categorizes and tags each asset via Claude, and securely writes those tags back into the Drive file's description
metadata while applying a star for rapid filtering.



Built as a working portfolio demo and field-ready enablement lab.



\---

Key Features

\---

* **Universal Public Folder Access:** Dynamically reads asset manifests from any public Google Drive folder link.
* **Automated Asset Categorization:** Claude acts as a creative pipeline tool, parsing filenames and metadata to
assign categories (e.g., `Video`, `Design Asset`, `Render/Image`, `3D Asset`).
* **Metadata Write-Back:** Automatically updates the `description` field of files in Google Drive and stars
processed assets.
* 
* **Dual MCP Transports:** Includes both local Stdio execution and cloud-ready HTTP Streamable transport
options.



\---

The Architecture: Dual MCP Implementation

\---

```text

\\\\\\\[ Claude.ai / Custom Connector ]
               │
               ▼ (Streamable HTTP / SSE)
     \\\\\\\[ server-remote.js (Express + MCP SDK) ]
               │
               ▼ (HTTP GET / JSON Web App Endpoint)
     \\\\\\\[ Code.gs (Google Apps Script Gateway) ]
               │
               ▼ (DriveApp Native API)
      \\\\\\\[ Google Drive Workspace ]

\\\*\\\*The Architecture: Dual MCP Implementation\\\*\\\*

---

The Model Context Protocol establishes a standard client-server connection between AI agents and external data. 
To ensure this tool can be run in any environment, this repository contains two distinct server implementations 
pointing to a shared Google Apps Script microservice.



\\\*\\\*Remote HTTP Server (server-remote.js):\\\*\\\* 
Utilizes the Streamable HTTP transport wrapped in an Express server. 
Designed to be hosted on cloud platforms like Replit and connected directly to Claude.ai via Custom Connectors.



\\\*\\\*Local Stdio Server (server.js):\\\*\\\* 
Utilizes standard input/output communication. The default mode for local development 
and connecting to desktop clients like Claude Desktop.



\\\*\\\*The Backend Microservice (Code.gs):\\\*\\\* 
A serverless Google Apps Script acts as the secured gateway, safely interacting 
with Google's DriveApp API and bypassing the need for complex Google OAuth flows in the Node.js application.



\\\*\\\*Setup Instructions:\\\*\\\* 
Replit \\\\\\\& Claude.ai Custom Connector

This guide walks through deploying the Remote HTTP server on Replit and connecting it to a free Claude.ai account 
using a Custom Connector.



**\*\*\\\*\\\*Step 1: Deploy the Backend Microservice\\\*\\\*\*\***


Go to Google Apps Script and create a new project.



Paste the contents of Code.gs into the editor.



Click Deploy -> New deployment.



Select Web app, set access to "Anyone", and deploy. (No URL pasting required for the MCP server—the endpoint is 
already configured in the JS files).



**\\\*\\\*Step 2: Spin up the Replit Server\\\*\\\***


Upload the project files to a Replit Node.js container.



Open the Replit Shell and install dependencies by running: npm install



Start the HTTP server by running: node server-remote.js



You should see a terminal output confirming the server is listening on 0.0.0.0:3000.



Grab the public URL provided by Replit's webview (e.g., https://your-repl-name.your-username.replit.dev).



**\\\*\\\*Step 3: Add to Claude.ai\\\*\\\***


Log into Claude.ai and navigate to Settings -> Connectors.



Click Add custom connector.



Paste your Replit URL and append /mcp to the very end of it (e.g., https://<YOUR-REPLIT-URL>.replit.dev/mcp).



Click Add.



**\\\*\\\*Step 4: Run the Agent\\\*\\\***


Start a new chat in Claude with your connector enabled and use a prompt like:



"Use the Asset Tagging agent to list all the files inside this Google Drive folder link: \\\\\\\[YOUR\\\\\\\_PUBLIC\\\\\\\_FOLDER\\\\\\\_LINK], then tag them."



Troubleshooting \\\\\\\& Known Issues

During development and testing, a few infrastructure and cloud-networking realities were encountered. If you run into issues, check here first:



**\\\*\\\*1. The "Folder ID Not Permitted" Error\\\*\\\***

Symptom: Claude returns an error saying the tool blocked the request because the Folder ID isn't permitted.



Cause: Google Apps Script does not automatically push saved code live. If you update Code.gs in the editor, 
the active web URL still runs the old code.



Fix: In Google Apps Script, go to Deploy -> Manage deployments. Click the Edit (pencil) icon, change the 
Version dropdown to New version, and click Deploy.



**\\\*\\\*2. "Failed to Connect" on First Try (Replit Cold Starts)\\\*\\\***

Symptom: When adding the connector or sending the very first prompt, Claude says the connection failed.



**\\\*\\\*Cause:\\\*\\\*** Free Replit containers go into a "sleep mode" after a few minutes of inactivity. When Claude pings 
the server, Replit takes a few seconds to wake up (a cold start), which occasionally causes Claude's initial 
handshake to time out.



**\\\*\\\*Fix:\\\*\\\*** Simply click Try Again or resend the prompt. Once the Replit container is awake, it will connect instantly.



**\\\*\\\*3.** Connector Timeouts on Bulk Tagging (Parallel Requests)\\\*\\\*

Symptom: Claude successfully tags one file but hits a "connector isn't responding" error on the rest of the files 
in the folder.



**\\\*\\\*Cause:\\\*\\\*** When told to tag a list of files, the LLM fires a burst of parallel tag\\\\\\\_drive\\\\\\\_file tool calls all at the 
exact same time. Because Google Apps Script takes 1-2 seconds to physically write metadata to each file, this data 
bottleneck can trigger Claude's HTTP connector timeout threshold.



**\\\*\\\*Fix:\\\*\\\*** If a file times out, just tell Claude "Try tagging \\\\\\\[Filename] again." To prevent this entirely during bulk 
operations, adjust your prompt to enforce sequential processing: "Tag the remaining files one by one, waiting for 
each to finish before starting the next."



**\\\*\\\*4. "Your App is Not Running" / Replit Port Binding\\\*\\\***

Symptom: The Replit Preview pane shows a grey "Your app is not running" screen, or a browser returns a JSON Method 
not allowed error.



**\\\*\\\*Cause:\\\*\\\*** By default, standard web apps bind to localhost (127.0.0.1), which makes them invisible to the outside internet.



**\\\*\\\*Fix:\\\*\\\*** This is already solved in the codebase! The createMcpExpressApp({ host: "0.0.0.0" }) configuration explicitly binds 
the server to 0.0.0.0. Ignore the Replit browser preview—MCP HTTP servers are strictly API endpoints meant to receive POST 
requests from LLMs, so rejecting a standard web browser view is proof that the security is working correctly.



**\\\*\\\*File Structure\\\*\\\***

---

server-remote.js — HTTP version for cloud hosting / Replit / Claude.ai connectors.



server.js — Stdio version for local testing / Claude Desktop.



Code.gs — Google Apps Script backend code (bypasses heavy OAuth).



package.json — Project dependencies (@modelcontextprotocol/sdk, express, zod).



