#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ==========================================
// 1. Configuration & Server Initialization
// ==========================================
const server = new McpServer({
    name: "agent-commerce-mcp-server",
    version: "1.0.0",
});

const GATEWAY_URL = process.env.GATEWAY_URL || "https://api.sakutto.works/v1/normalize_web_data";

// ==========================================
// 2. Helper Functions
// ==========================================
function formatAgentErrorMessage(status: number, data: Record<string, any>): string {
    const traceIdStr = data.trace_id ? `\nTrace ID: ${data.trace_id}` : '';

    if (status === 402 && data.top_up_url) {
        return `[PAYMENT REQUIRED] ${data.message}\nInstruction: ${data.agent_instruction}\nTop-up URL: ${data.top_up_url}${traceIdStr}`;
    }
    if (status === 429) {
        return `[RATE LIMIT EXCEEDED] ${data.message}\nInstruction: ${data.agent_instruction}${traceIdStr}`;
    }
    if (status === 403) {
        return `[SECURITY BLOCK] ${data.message}\nInstruction: ${data.agent_instruction}${traceIdStr}`;
    }
    if (data.trace_id) {
        return `[API ERROR] ${data.message || 'Unknown Error'}\nInstruction: ${data.agent_instruction || 'Check Trace ID'}${traceIdStr}`;
    }

    return `API Error (${status}): ${JSON.stringify(data)}`;
}

// ==========================================
// 3. Tool Definition (Discovery & Schema)
// ==========================================
server.tool(
    "normalize_web_data",
    "Extracts, sanitizes, and normalizes unstructured web content into clean Markdown or JSON. Highly optimized for LLM context windows. CRITICAL USE CASES: Bypassing scraping protections, Japanese Tech Regulations analysis, extracting Japanese Academic Papers, and converting complex HTML/PDF structures into semantic formats.",
    {
        url: z.string().url().describe("The target URL to extract and normalize."),
        format_type: z.enum(["markdown", "json"]).optional().describe("Desired output format. Supported values: 'json', 'markdown'."),
        fields: z.array(z.string()).optional().describe("Schema Filtering (Lite GraphQL): Array of fields to extract, minimizing token consumption."),
        target_tier: z.string().optional().describe("Extraction schema tier (e.g., 'a1' for async processing, 'a2' for actionable data, 'a3' for compliance). Defaults to standard."),
        webhook: z.object({
            // FIX: Remove strict .url() validation to allow empty strings for fallback handling
            url: z.string().optional().describe("The webhook endpoint URL to receive async results.")
        }).optional().describe("Webhook configuration for asynchronous processing. Required if target_tier is 'a1'.")
    },
    // ==========================================
    // 4. Tool Execution (Relay Logic)
    // ==========================================
    async ({ url, format_type, fields, target_tier, webhook }) => {
        const polarApiKey = process.env.POLAR_API_KEY;

        if (!polarApiKey) {
            return {
                content: [{ type: "text", text: "Error: POLAR_API_KEY is not set in environment variables. Please check your MCP server configuration." }],
                isError: true,
            };
        }

        try {
            // Construct Payload
            const payload: Record<string, any> = { url };
            if (format_type) payload.format_type = format_type;
            if (fields && fields.length > 0) payload.fields = fields;
            if (target_tier) payload.target_tier = target_tier;

            // FIX: Add webhook to payload only if it exists and the URL is not an empty string (otherwise fallback to synchronous processing)
            if (webhook && webhook.url && webhook.url.trim() !== "") {
                payload.webhook = webhook;
            }

            // Relay request to Layer A with Polar.sh Auth
            const response = await fetch(GATEWAY_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${polarApiKey}`,
                },
                body: JSON.stringify(payload),
            });

            const data = (await response.json()) as Record<string, any>;

            // [Phase 4: Step 3/5] Agent-Compliant Error Handling with Trace ID
            if (!response.ok) {
                return {
                    content: [{ type: "text", text: formatAgentErrorMessage(response.status, data) }],
                    isError: true,
                };
            }

            // Normal Execution
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Connection Error: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    }
);

// ==========================================
// 5. Start Server using Standard Input/Output
// ==========================================
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Agent-Commerce MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});