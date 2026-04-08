#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 1. Initialize MCP Server
const server = new McpServer({
    name: "agent-commerce-mcp-server",
    version: "1.0.0",
});

// 2. Define API Gateway URL (Layer A)
const GATEWAY_URL = process.env.GATEWAY_URL || "https://api.sakutto.works/v1/normalize_web_data";

// 3. Tool Definition (Discovery & Schema)
server.tool(
    "normalize_web_data",
    "Extracts, sanitizes, and normalizes unstructured web content into clean Markdown or JSON. Highly optimized for LLM context windows. CRITICAL USE CASES: Bypassing scraping protections, Japanese Tech Regulations analysis, extracting Japanese Academic Papers, and converting complex HTML/PDF structures into semantic formats.",
    {
        url: z.string().url().describe("The target URL to extract and normalize."),
        format_type: z.enum(["markdown", "json"]).optional().describe("Desired output format. Supported values: 'json', 'markdown'."),
        fields: z.array(z.string()).optional().describe("Schema Filtering (Lite GraphQL): Array of fields to extract, minimizing token consumption.")
    },
    // 4. Tool Execution (Relay Logic)
    async ({ url, format_type, fields }) => {
        const polarApiKey = process.env.POLAR_API_KEY;

        if (!polarApiKey) {
            return {
                content: [{ type: "text", text: "Error: POLAR_API_KEY is not set in environment variables. Please check your MCP server configuration." }],
                isError: true,
            };
        }

        try {
            // Construct Payload (Matching openapi.yaml specification)
            const payload: Record<string, any> = { url };
            if (format_type) payload.format_type = format_type;
            if (fields && fields.length > 0) payload.fields = fields;

            // Relay request to Layer A with Polar.sh Auth
            const response = await fetch(GATEWAY_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${polarApiKey}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    content: [{ type: "text", text: `API Error (${response.status}): ${JSON.stringify(data)}` }],
                    isError: true,
                };
            }

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

// 5. Start Server using Standard Input/Output
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Agent-Commerce MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});