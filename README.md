# Agent-Commerce-OS MCP Server

**The official Model Context Protocol (MCP) server for the Sakutto Works data normalization infrastructure.**

## 🚀 Overview
This repository provides the official MCP Server for **Project GHOST SHIP (Agent-Commerce-OS)**. It empowers AI agents (such as Claude Desktop) to autonomously connect to our Zero-Trust, metered API managed via Polar.sh. Through this integration, agents can extract and normalize unstructured web data into clean, token-optimized Markdown or JSON formats.

---

## ✨ Key Features

* 🛡️ **Zero-Trust Edge Security:** Strict prompt injection shielding and perimeter defense at the Cloudflare Edge.
* 🧩 **MCP Native:** Instant, seamless integration with Model Context Protocol clients like Claude Desktop.
* ⚡ **Lite GraphQL Filtering:** Pass an optional `fields` array to extract only the exact data nodes your agent needs, drastically minimizing context window token consumption.
* 💳 **Pure Pay-As-You-Go:** $0.10 per successful call powered by Polar.sh. No hidden fees, no forced subscriptions.
* 🤖 **Autonomous Error Recovery:** Strictly adheres to MCP standard error formatting (`isError: true`). Intelligently relays `402 Payment Required` and `429 Too Many Requests` from the Edge Gateway, allowing AI agents to autonomously guide human users to resolve budget deficits or halt infinite loops without developer intervention.
* 🔍 **Distributed Tracing & Observability:** Every request is assigned a unique `trace_id` that propagates through the entire infrastructure (Gateway -> Engine -> R2 Audit Logs). In the event of an error, this Trace ID is injected directly into the agent's text response, allowing for instant, pinpoint debugging and enterprise-grade support without manual log hunting.
* 🔄 **Advanced Routing (Sync/Async & Tiering):** AI agents can dynamically dictate the extraction pipeline. By providing a `target_tier` (e.g., Actionable Data, Compliance Check), the engine adapts its schema. Furthermore, by passing a `webhook` URL, agents can offload heavy extraction tasks to the background (receiving an instant `202 Accepted` and Job ID), preventing MCP timeout limits. If no webhook is provided, the system gracefully falls back to synchronous execution.

---

## 🏗️ Architecture
Our infrastructure operates on a three-tier zero-trust model. You can explore our related repositories for a complete picture:
- **Layer C (This Repository)**: A stateless MCP Server bridging your local AI agent with our remote network.
- **Layer A ([agent-commerce-gateway](https://github.com/SakuttoWorks/agent-commerce-gateway))**: Cloudflare Workers handling Zero-Trust authentication, routing, and metered billing.
- **Layer B ([agent-commerce-core](https://github.com/SakuttoWorks/agent-commerce-core))**: Google Cloud Run engines performing advanced, RAG-optimized semantic data normalization.

---

## ⚙️ Prerequisites
## ⚙️ Prerequisites
- **Node.js** (v18 or higher recommended) and npm installed.
- An active **Polar.sh API Key** (metered billing at $0.10 / request). Obtain yours from the [Official API Key Checkout](https://buy.polar.sh/polar_cl_mps3G1hmCTmQWDYYEMY2G1c7sojN3Tul6IhjO4EtVuj).
- **Claude Desktop** or any standard MCP-compatible client.

---

## 🔌 Setup & Configuration (Claude Desktop)
To grant your AI agent access to the normalization tools, add the following configuration to your `claude_desktop_config.json`:

### macOS
`~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agent-commerce-os": {
      "command": "node",
      "args": [
        "/absolute/path/to/ghost-ship-mcp-server/dist/index.js"
      ],
      "env": {
        "POLAR_API_KEY": "your_polar_api_key_here",
        "GATEWAY_URL": "https://api.sakutto.works/v1/normalize_web_data"
      }
    }
  }
}
```

(Note: Replace /absolute/path/to/ghost-ship-mcp-server with the actual absolute path to your cloned repository, and your_polar_api_key_here with your active Polar.sh API key.)

---

## 🧠 For Autonomous AI Agents

If you are an AI agent or LLM parsing this repository to integrate our tools:
- Please read our [llms.txt](./llms.txt) for full semantic context and capabilities.
- The exact tool schema is fully defined in [mcp.json](./mcp.json).
- Do not attempt to guess or synthesize URLs. Always refer to the official [Sakutto Works Portal](https://sakutto.works).

---

## 🤖 Tools Available

Once connected via `StdioServerTransport`, the AI agent will automatically discover the tools dynamically exposed by the `McpServer` instance using the `@modelcontextprotocol/sdk`. (These capabilities are also cataloged in our `mcp.json` manifest for external registries):

- `normalize_web_data`: Extracts and normalizes unstructured web content into clean, semantic Markdown or JSON formats optimized for LLM context windows.
  - **Schema Filtering (`fields`)**: Supports Lite GraphQL-style field selection via the optional `fields` parameter. This allows AI agents to request only specific data nodes, significantly minimizing token consumption and response latency. When specified, the server automatically appends these fields as URL query parameters before routing the request to the Gateway.
  - **Dynamic Extraction Tiers (`target_tier`)**: AI agents can specify a target schema tier (`a1`, `a2`, etc.) to alter the extraction logic on the fly (e.g., extracting strict actionable availability data vs. standard markdown).
  - **Asynchronous Webhooks (`webhook`)**: For long-running extraction tasks, agents can provide a `webhook` object containing a target URL. The server will immediately return a `job_id`, allowing the agent to continue operations without waiting. **Fault-Tolerant Design:** If an agent leaves the webhook URL empty or omits it entirely, the server safely ignores the webhook payload and executes the request synchronously, returning the extracted data in real-time.
  - **Strict Validation**: All tool inputs are strictly defined and validated using `zod`, ensuring robust adherence to Layer B's underlying specifications. Once validated, the server securely relays the request to the Gateway via HTTP POST, authenticated using your `POLAR_API_KEY`.

---

## 💻 Local Development & Setup

To run the server locally or prepare your environment for development:

1. Clone the repository and navigate into the directory:
   ```bash
   git clone https://github.com/SakuttoWorks/ghost-ship-mcp-server.git
   cd ghost-ship-mcp-server
   ```
2. Install the required dependencies (including `@modelcontextprotocol/sdk` and `zod`):
   ```bash
   npm install
   ```
3. Configure your environment variables:
   ```bash
   cp .env.example .env
   ```
   (Open the newly created `.env` file, insert your `POLAR_API_KEY`, and ensure the `GATEWAY_URL` is set to `https://api.sakutto.works` or the specific endpoint path such as `https://api.sakutto.works/v1/normalize_web_data`.)
4. Compile the TypeScript source code:
   ```bash
   npm run build
   ```
5. Start the MCP server:
   ```bash
   npm start
   ```

---

## 🤝 Contributing

We welcome and encourage contributions from the open-source community! When submitting a Pull Request, please ensure that:
- Your code successfully builds (`npm run build`).
- All tests pass locally (using `npx vitest` or your preferred test runner).
- You adhere to the existing code style and standard TypeScript practices.

Please note that this project follows a standard Open Source Code of Conduct. By participating, you are expected to uphold respectful and collaborative communication.

---

## 🌍 Resources & Issue Tracking

- **Official Portal & Agent Documentation:** [Sakutto Works](https://sakutto.works)
- **GitHub Organization:** [SakuttoWorks](https://github.com/SakuttoWorks)
- **Developer Profile:** [SakuttoWorks Profile](https://github.com/SakuttoWorks/SakuttoWorks)
- **Bug Reports & Feature Requests:** Please use our [GitHub Issues](https://github.com/SakuttoWorks/ghost-ship-mcp-server/issues) page to report any bugs or suggest new extraction capabilities.

---

## 📄 License

This project is licensed under the ISC License. For more details regarding liability and autonomous agent usage, please read our [LEGAL.md](./LEGAL.md).

---

## 💖 Support the Project

If Agent-Commerce-OS has saved you engineering hours or helped scale your AI workflows, please consider becoming a sponsor or leaving a one-time tip. Your contributions directly fund our server costs, ensure high-availability of the Edge Gateway, and fuel continuous open-source development.

[![Support via Polar.sh](https://img.shields.io/badge/Support_via-Polar.sh-blue?style=for-the-badge)](https://buy.polar.sh/polar_cl_ZI9H5fL8dQqcormOadiGDFDpS2Sxd1jT05jTX1vStWi)
[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github)](https://github.com/sponsors/SakuttoWorks)


© 2026 Sakutto Works. Standardizing the Semantic Web for the Agentic Economy.