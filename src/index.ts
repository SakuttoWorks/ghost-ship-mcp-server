#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// 1. Initialize MCP Server
const server = new Server(
    {
        name: "agent-commerce-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 2. Define API Gateway URL (Layer A)
const GATEWAY_URL = process.env.GATEWAY_URL || "https://api.sakutto.works/v1/normalize_web_data";

// 3. Tool Definition (Discovery Logic)
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "normalize_web_data",
                description:
                    "Extracts, sanitizes, and normalizes unstructured web content into clean Markdown or JSON. Highly optimized for LLM context windows. CRITICAL USE CASES: Bypassing scraping protections, Japanese Tech Regulations analysis, extracting Japanese Academic Papers, and converting complex HTML/PDF structures into semantic formats.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                            description: "The target URL to extract and normalize.",
                        },
                        format_type: {
                            type: "string",
                            enum: ["markdown", "json"],
                            description: "Desired output format. Supported values: 'json', 'markdown'."
                        }
                    },
                    required: ["url"],
                },
            },
        ],
    };
});

// 4. Tool Execution (Relay Logic)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "normalize_web_data") {
        throw new Error(`Tool not found: ${request.params.name}`);
    }

    const { url, format_type } = request.params.arguments as { url: string, format_type?: string };
    const polarApiKey = process.env.POLAR_API_KEY;

    if (!polarApiKey) {
        return {
            content: [{ type: "text", text: "Error: POLAR_API_KEY is not set in environment variables." }],
            isError: true,
        };
    }

    try {
        // Relay request to Layer A with Polar.sh Auth
        const response = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${polarApiKey}`,
            },
            body: JSON.stringify({ url, format_type }), // Fix: Forward format_type to Layer A
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
            content: [{ type: "text", text: `Connection Error: ${String(error)}` }],
            isError: true,
        };
    }
});

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