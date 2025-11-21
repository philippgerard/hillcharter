# Hillcharter MCP Server Setup

This guide explains how to set up and use the Hillcharter MCP server with Claude Desktop or other MCP clients.

## What is MCP?

The Model Context Protocol (MCP) is a standard for connecting AI assistants like Claude to external tools and services. The Hillcharter MCP server exposes two powerful tools:

1. **`generate_hill_chart`** - Generate beautiful hill chart visualizations
2. **`upload_to_notion`** - Upload hill charts directly to Notion pages

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Claude Desktop

Add the Hillcharter MCP server to your Claude Desktop configuration file:

**macOS/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hillcharter": {
      "command": "node",
      "args": ["/absolute/path/to/hillcharter/mcp-server.js"],
      "env": {
        "NOTION_API_KEY": "your_notion_integration_token_here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/hillcharter/` with the actual absolute path to this directory.

### 3. Set Up Notion Integration (Optional)

To use the `upload_to_notion` tool, you need a Notion integration token:

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name (e.g., "Hillcharter")
4. Copy the "Internal Integration Token"
5. Add the token to your MCP configuration (see step 2)
6. Share the target Notion pages with your integration:
   - Open the page in Notion
   - Click "..." menu → "Add connections"
   - Select your integration

### 4. Restart Claude Desktop

After updating the configuration, restart Claude Desktop to load the MCP server.

## Usage Examples

### Generating a Hill Chart

Ask Claude:

> Generate a hill chart for my Sprint 5 project with these points:
> - User Authentication at 60% progress
> - Database Setup at 85% progress
> - API Development at 30% progress
> - Frontend Design at 10% progress

Claude will use the `generate_hill_chart` tool to create the visualization and save it to the `outputs/` folder.

### Uploading to Notion

After generating a chart:

> Upload the hill chart to my Notion page with ID abc123def456

Claude will use the `upload_to_notion` tool to upload the image to your Notion page.

### Combined Workflow

> Generate a hill chart for Q1 Planning with these items:
> - Market Research: 75%
> - Product Design: 40%
> - Engineering Kickoff: 15%
>
> Then upload it to my Notion page abc123def456

## Tool Reference

### `generate_hill_chart`

**Parameters:**
- `project` (string, required): The name/title of the project or chart
- `points` (array, required): Array of data points
  - `name` (string): The label for this point
  - `progress` (number): Progress percentage (0-100)
    - 0-50: "Figuring things out" phase
    - 50-100: "Making it happen" phase

**Returns:**
- `output_path`: The local file path where the PNG was saved
- `project`: The project name
- `points_count`: Number of points in the chart

**Example:**
```json
{
  "project": "Sprint 5",
  "points": [
    {"name": "User Auth", "progress": 60},
    {"name": "Database", "progress": 85},
    {"name": "API", "progress": 30}
  ]
}
```

### `upload_to_notion`

**Parameters:**
- `page_id` (string, required): The Notion page ID where the image should be uploaded
- `image_path` (string, required): The local file path to the image
- `notion_token` (string, optional): Notion API token (defaults to NOTION_API_KEY env var)

**Returns:**
- `page_id`: The Notion page ID
- `image_name`: The uploaded image filename
- `block_id`: The ID of the created image block

**Finding Your Page ID:**

The page ID is in the URL when you open a page in Notion:
```
https://www.notion.so/My-Page-abc123def456?...
                              ^^^^^^^^^^^^^ this is the page ID
```

## Troubleshooting

### "Hillcharter MCP server not found"

- Ensure the path in `claude_desktop_config.json` is absolute and correct
- Make sure you ran `npm install` to install dependencies
- Restart Claude Desktop after configuration changes

### "Notion API token not provided"

- Add `NOTION_API_KEY` to the `env` section of your MCP configuration
- Or pass `notion_token` explicitly when calling the tool

### "Page not found" or "Unauthorized" Notion errors

- Ensure you've shared the Notion page with your integration
- Verify your integration token is correct
- Check that the page ID is correct (remove any query parameters)

### Charts not generating

- Ensure Puppeteer can run (it needs Chrome/Chromium)
- Check that the `outputs/` directory is writable
- Look for error messages in Claude Desktop's developer console

## Running the MCP Server Standalone

For testing or debugging:

```bash
npm run mcp
```

The server will run on stdio and wait for MCP protocol messages.

## Understanding Hill Charts

Hill charts visualize project progress in two distinct phases:

**Left Side (0-50%): 🔍 Figuring Things Out**
- Research and exploration
- Identifying unknowns
- Making key decisions
- Planning and design

**Right Side (50-100%): 🚀 Making It Happen**
- Execution and implementation
- Building and coding
- Testing and refinement
- Completion and delivery

The peak of the hill (50%) represents the transition from uncertainty to certainty.

## Output

Generated charts are saved to:
```
./outputs/project-name-YYYY-MM-DD.png
```

Files are automatically versioned if a file with the same name exists:
```
./outputs/sprint-5-2025-01-20.png
./outputs/sprint-5-2025-01-20-1.png
./outputs/sprint-5-2025-01-20-2.png
```

## License

See the main project README for license information.

## Support

For issues or questions:
- Check the main README.md
- Review the troubleshooting section above
- Ensure all dependencies are installed correctly
