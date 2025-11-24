# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hillcharter is an automated CLI tool and MCP server for generating beautiful hill chart visualizations. Hill charts (popularized by Basecamp) visualize project progress across two phases:
- **0-50%**: "Figuring things out" (unknowns, research, planning)
- **50-100%**: "Making it happen" (execution, completion)

The project provides three usage modes:
1. **Interactive CLI** - prompts user for input
2. **JSON mode** - programmatic usage ideal for LLMs and automation
3. **CLI arguments mode** - direct command-line usage
4. **MCP Server** - integration with Claude Desktop and other MCP clients

## Technology Stack

- **Node.js** 22+ (ES modules)
- **D3.js v7** - chart rendering
- **Puppeteer** - headless browser for PNG generation
- **JSDOM** - DOM manipulation for chart generation
- **prompts** - interactive CLI input
- **@modelcontextprotocol/sdk** - MCP server implementation

## Key Commands

```bash
# Interactive mode
npm run publish-chart

# JSON mode (for LLMs/automation)
node index.js --json '{"project":"Sprint 5","points":[{"name":"Task","progress":50}]}'

# CLI arguments mode
node index.js --project "Sprint 5" --point "Task" --progress 50

# Run as MCP server
npm run mcp
# or
hillcharter-mcp

# Install globally for MCP usage
npm install -g github:philippgerard/hillcharter

# Install Puppeteer Chrome if needed
npx puppeteer browsers install chrome
```

## Architecture

### Core Modules

**index.js** - Main CLI entry point
- Parses CLI arguments (interactive, JSON, or args mode)
- Orchestrates chart generation pipeline
- Handles file output and versioning

**mcp-server.js** - MCP server implementation
- Exposes two tools: `generate_hill_chart` and `upload_to_notion`
- Uses stdio transport for communication
- Shares chart generation logic with CLI

**lib/hill-chart-generator.js** - Chart rendering
- Generates D3.js-based HTML with embedded SVG
- Creates beautiful hill curve visualization
- Handles label positioning and connector lines
- Uses Puppeteer to render HTML → PNG

**lib/chart-math.js** - Mathematical and layout calculations
- `calculateHillY(x)` - parabolic curve function (peak at x=50, y=100)
- `spreadOverlappingPoints()` - prevents dot clustering with dynamic vertical spacing
- `positionLabelsSmartly()` - advanced label positioning with collision detection
  - Multi-zone strategy: left zone labels extend right, right zone extends left
  - Pixel-perfect 2D bounding box collision detection
  - Iterative collision resolution (max iterations configurable)
  - Boundary checking to keep labels within canvas
- `estimateLabelDimensions()` - calculates text wrapping and dimensions

**lib/config.js** - Shared configuration
- Color palette (7 colors, auto-assigned in order, cycles for 8+ points)
- Layout constants (spacing, thresholds, dimensions)
- Centralized configuration for consistency

**lib/notion-uploader.js** - Notion API integration
- Uploads generated PNG to Notion pages
- Uses Notion API with multipart/form-data
- Requires NOTION_API_KEY environment variable

### Chart Generation Pipeline

1. **Input Collection** - via interactive prompts, JSON, or CLI args
2. **Point Processing** - auto-assign colors from palette
3. **Overlap Handling** - `spreadOverlappingPoints()` separates clustered dots
4. **Label Positioning** - `positionLabelsSmartly()` with collision detection
5. **HTML Generation** - D3.js chart with embedded data
6. **Rendering** - Puppeteer screenshot at 2x DPI (Retina quality)
7. **File Output** - save to `outputs/` with auto-versioning

### File Versioning System

Files are **never overwritten**. Format: `{sanitized-name}-{date}.png`
- First save: `sprint-5-2025-01-20.png`
- Second save (same day): `sprint-5-2025-01-20-1.png`
- Third save: `sprint-5-2025-01-20-2.png`

Implementation in `index.js:saveToOutputFolder()` - checks `fs.access()` in loop to find next available version.

### Color Assignment

Colors auto-assigned in order from `COLORS` array in `lib/config.js`:
1. Red (#FF6B6B)
2. Teal (#4ECDC4)
3. Blue (#45B7D1)
4. Coral (#FFA07A)
5. Mint (#98D8C8)
6. Yellow (#F7DC6F)
7. Purple (#BB8FCE)

For 8+ points, colors cycle through palette using modulo: `COLORS[index % COLORS.length]`

### Label Positioning Algorithm

Located in `lib/chart-math.js:positionLabelsSmartly()`:

1. **Zone-based initial placement**:
   - Left zone (0-35%): labels extend right
   - Peak zone (35-65%): alternate based on vertical offset
   - Right zone (65-100%): labels extend left

2. **Collision detection** (iterative):
   - 2D bounding box overlap detection
   - Label-to-label collision resolution
   - Label-to-dot collision avoidance
   - Minimum separation distance (`MIN_LABEL_SEPARATION`)

3. **Boundary enforcement**:
   - Keep labels within canvas padding
   - Vertical adjustment if out of bounds

4. **Connector lines**:
   - Color-coded Bezier curves from dots to labels
   - Visual connection using dot's color
   - Dashed lines with opacity for subtlety

## MCP Server Usage

### Installation

```bash
# Install globally first
npm install -g github:philippgerard/hillcharter

# Add to .mcp.json or Claude Desktop config
{
  "mcpServers": {
    "hillcharter": {
      "command": "hillcharter-mcp",
      "env": {
        "NOTION_API_KEY": "your_notion_api_key_here"
      }
    }
  }
}
```

**Important**: Restart Claude Desktop after config changes.

### MCP Tools

**generate_hill_chart**
- Input: `{ project: string, points: [{ name: string, progress: number }] }`
- Output: JSON with success status and output path
- Saves to `outputs/` directory with auto-versioning

**upload_to_notion**
- Input: `{ page_id: string, image_path: string, notion_token?: string }`
- Uploads image to Notion page
- Falls back to NOTION_API_KEY env var if token not provided

## Development Patterns

### When Adding New Features

1. **Chart appearance changes** → edit `lib/hill-chart-generator.js`
   - Modify D3.js code in HTML template string
   - Adjust SVG dimensions, colors, or styling

2. **Layout/positioning logic** → edit `lib/chart-math.js`
   - Mathematical functions for curve or spacing
   - Collision detection algorithms

3. **Configuration** → edit `lib/config.js`
   - Color palette changes
   - Layout constants (spacing, thresholds)

4. **New CLI modes** → edit `index.js`
   - Add argument parsing in `parseCliArguments()`
   - Extend prompt flow in `collectProjectData()`

5. **New MCP tools** → edit `mcp-server.js`
   - Add tool definition in `ListToolsRequestSchema` handler
   - Implement logic in `CallToolRequestSchema` handler

### Testing Chart Generation

Quick test command:
```bash
node index.js --json '{"project":"Test Chart","points":[{"name":"Feature A","progress":25},{"name":"Feature B","progress":60},{"name":"Feature C","progress":85}]}'
```

Check output in `outputs/test-chart-{date}.png`

### Progress Value Guidelines

- 0-25%: Early exploration/research
- 25-50%: Planning and design
- 50-75%: Active implementation
- 75-100%: Finishing and completion

## Important Implementation Details

### ES Modules
All files use ES module syntax (`import`/`export`). Package.json has `"type": "module"`.

### Puppeteer Configuration
- Headless mode: true
- Viewport: 1200x700 at 2x deviceScaleFactor (Retina quality)
- Uses `--no-sandbox` and `--disable-setuid-sandbox` for MCP compatibility

### Temporary Files
- HTML and images generated in `/tmp/hill-chart-*` directories
- Cleaned up after successful save to `outputs/`

### Output Directory
- Created automatically if doesn't exist: `outputs/`
- Organized by date in filename for easy sorting

## Troubleshooting

**"Could not find Chrome"**
```bash
npx puppeteer browsers install chrome
```

**MCP server not appearing in Claude Desktop**
- Verify global installation: `which hillcharter-mcp`
- Check config syntax in `.mcp.json`
- Restart Claude Desktop

**JSON validation errors**
- Ensure `project` field is a string
- Ensure `points` is an array with at least one point
- Each point needs `name` (string) and `progress` (number 0-100)
