# Hill Chart Publisher

Automated CLI tool to generate beautiful hill charts and save them locally. Stop drawing project status by hand!

## What are Hill Charts?

Hill charts (popularized by Basecamp) visualize project progress across two key phases:

- **Left side (0-50%):** "Figuring things out" - unknowns, research, planning, decision-making
- **Right side (50-100%):** "Making it happen" - execution, building, completing

Projects move left-to-right across the hill as they progress from planning to completion.

Each chart displays:
```
Your Chart Title        ← Your custom name
January 20, 2025        ← Auto-generated date
```

## Features

- 📊 Three usage modes: interactive CLI, JSON (for LLMs), and CLI arguments
- 🤖 **MCP Server** - Use directly in Claude Desktop and other MCP clients
- 🎨 Beautiful D3.js-generated hill charts
- 🖼️ Automatic PNG export to `outputs/` folder
- 📤 **Notion integration** - Upload charts directly to Notion pages via MCP
- 🌈 **Auto-assigned colors** - each point gets a unique color from a vibrant palette
- 📍 **Smart label positioning** - labels extend away from chart edges for perfect readability
- 📁 Organized filename format: `chart-name-2025-01-20.png`
- 🔄 **Automatic versioning** - never overwrites existing files, auto-increments version numbers
- 🤖 **LLM-friendly** - perfect for automation with Claude Code and other AI tools

## Quick Start

No installation required! Run directly with npx:

```bash
npx -y philippgerard/hillcharter /path/to/save/chart.png
```

This will:
1. Download and run the latest version
2. Launch the interactive CLI
3. Generate and save your chart to the specified path

## MCP Server (Use with Claude Desktop)

Hillcharter includes an MCP server that lets you generate and upload hill charts directly from Claude Desktop!

Add to your `.mcp.json` or Claude Desktop config:

```json
{
  "mcpServers": {
    "hillcharter": {
      "command": "npx",
      "args": ["-y", "github:philippgerard/hillcharter"],
      "env": {
        "NOTION_API_KEY": "your_notion_api_key_here"
      }
    }
  }
}
```

**Usage in Claude:**

Just ask Claude to generate hill charts naturally:

> Generate a hill chart for my Sprint 5 with these tasks:
> - User Auth at 60%
> - Database at 85%
> - API at 30%

Or upload to Notion:

> Upload the chart to my Notion page abc123def456

## CLI Usage

The tool supports **three modes**: interactive, JSON (ideal for LLMs), and CLI arguments.

### Mode 1: Interactive Mode (Default)

Run the CLI tool with no arguments to be prompted interactively:

```bash
npm run publish-chart
```

### Mode 2: JSON Mode (Best for LLMs and Automation)

Perfect for programmatic use, especially with AI assistants like Claude Code:

```bash
node index.js --json '{"project":"Sprint 5 Progress","points":[{"name":"User Authentication","progress":60},{"name":"Database Migration","progress":85},{"name":"API Refactoring","progress":30}]}'
```

**JSON Format:**
```json
{
  "project": "Project Name",
  "points": [
    {
      "name": "Task Name",
      "progress": 50
    }
  ]
}
```

- `project` (required): The chart title/name
- `points` (required): Array of tasks with name and progress (0-100)
- Colors are automatically assigned from the palette
- Unlimited points supported

### Mode 3: CLI Arguments Mode

Pass arguments directly on the command line:

```bash
node index.js --project "Sprint 5 Progress" \
  --point "User Authentication" --progress 60 \
  --point "Database Migration" --progress 85 \
  --point "API Refactoring" --progress 30
```

**Notes for all modes:**
- Charts are automatically saved to `outputs/` folder
- Progress values must be between 0-100
- Colors are automatically assigned
- Files are automatically versioned if duplicates exist

## Programmatic Usage with LLMs (Claude Code, etc.)

The JSON mode is designed specifically for easy integration with AI assistants and automation tools.

**Example for Claude Code or other LLMs:**

```bash
node index.js --json '{"project":"Q1 2025 Roadmap","points":[{"name":"Authentication System","progress":75},{"name":"Payment Integration","progress":45},{"name":"Mobile App","progress":20},{"name":"Analytics Dashboard","progress":90}]}'
```

**Generated output:**
- File: `outputs/q1-2025-roadmap-2025-01-20.png`
- Auto-versioned if file exists
- All points displayed with unique colors
- Ready to share or include in reports

**Progress value guide for LLMs:**
- 0-25: Early exploration/research phase
- 25-50: Planning and design phase
- 50-75: Active implementation phase
- 75-100: Finishing and completion phase

### Interactive Mode Workflow

The tool will prompt you for:

1. **Chart name** (e.g., "Sprint 5 Progress", "Q1 2025 Roadmap")
   - Default: "Hill Chart" (fully editable - just start typing or use arrow keys)
   - Date is automatically added below the title on the chart

2. **Points to add:**
   - Name (e.g., "User Authentication", "API Migration", "Mobile App")
   - Progress percentage (0-100%)
   - Colors are **automatically assigned** from a diverse palette
   - Add as many points as needed

The tool will then:
1. Generate a beautiful hill chart
2. Save it to `outputs/` folder with format: `project-name-YYYY-MM-DD.png`
3. Done! Use the image wherever you need

## Example Workflows

### Interactive Mode Example

```bash
$ npm run publish-chart

📊 Hill Chart Publisher

Hill Chart Guide:
  0-50%: Figuring things out (unknowns, research, planning)
  50-100%: Making it happen (execution, completion)

✔ Hill chart name: Sprint 5 Progress

Now add points to the chart:

✔ Point name: User Authentication
✔ Current progress: 🚀 50-60% - Starting execution
✔ Add another point? yes

✔ Point name: Database Migration
✔ Current progress: 📋 25-40% - Planning and designing
✔ Add another point? no

🎨 Generating hill chart...
✅ Chart generated successfully

💾 Saving to outputs folder...
✅ Chart saved successfully!
📁 Location: /Users/you/hillcharter/outputs/sprint-5-progress-2025-01-20.png

✨ Done!
```

### JSON Mode Example

```bash
$ node index.js --json '{"project":"Q1 Roadmap","points":[{"name":"Auth","progress":75},{"name":"API","progress":45}]}'

📊 Generating hill chart for: Q1 Roadmap
📍 Points: 2

🎨 Generating hill chart...
✅ Chart generated successfully

💾 Saving to outputs folder...
✅ Chart saved successfully!
📁 Location: /Users/you/hillcharter/outputs/q1-roadmap-2025-01-20.png

✨ Done!
```

## Understanding Progress Stages

| Progress | Stage | Meaning |
|----------|-------|---------|
| 0-10% | Just starting | Lots of unknowns, initial exploration |
| 10-25% | Exploring | Active research, gathering requirements |
| 25-40% | Planning | Designing solution, making architecture decisions |
| 40-50% | Final decisions | Last unknowns being resolved, ready to build |
| 50-60% | Starting execution | Implementation has begun |
| 60-75% | Building | Active development, features coming together |
| 75-90% | Finishing up | Polish, testing, final touches |
| 90-100% | Nearly complete | Done or nearly done |

## Automatic Color Assignment

Colors are **automatically assigned** to each point in order:

1. 🔴 **Red** (#FF6B6B)
2. 🩵 **Teal** (#4ECDC4)
3. 🔵 **Blue** (#45B7D1)
4. 🧡 **Coral** (#FFA07A)
5. 💚 **Mint** (#98D8C8)
6. 💛 **Yellow** (#F7DC6F)
7. 💜 **Purple** (#BB8FCE)

If you have more than 7 points, colors will cycle through the palette again. Each point gets a visually distinct color for easy identification.

## Automatic File Versioning

The tool **never overwrites** existing files. If you create multiple charts with the same name on the same day, they're automatically versioned:

```
outputs/
├── sprint-5-2025-01-20.png       ← First chart
├── sprint-5-2025-01-20-1.png     ← Second chart (same name, same day)
├── sprint-5-2025-01-20-2.png     ← Third chart
└── sprint-5-2025-01-20-3.png     ← Fourth chart
```

**How it works:**
- First save: `sprint-5-2025-01-20.png`
- File exists? Next save: `sprint-5-2025-01-20-1.png`
- That exists too? Next save: `sprint-5-2025-01-20-2.png`
- And so on...

You'll see a message when versioning occurs:
```
✅ Chart saved successfully!
📁 Location: outputs/sprint-5-2025-01-20-2.png
   (Version 2 - previous versions exist)
```

This lets you:
- Track progress throughout the day
- Compare different iterations
- Never lose previous charts

## Customization

### Modify Chart Appearance

Edit `lib/hill-chart-generator.js` to customize:
- Chart dimensions
- Colors and styling
- Font sizes
- Labels and text

### Change Progress Stages

Edit `index.js` to customize the progress choices in the CLI prompts.

## Troubleshooting

### "Error: Could not find Chrome"

Puppeteer needs Chrome/Chromium to generate images. Install it:

```bash
npx puppeteer browsers install chrome
```

### JSON Validation Errors

Make sure your JSON input:
- Has a valid `project` field (string)
- Has a `points` array with at least one point
- Each point has `name` (string) and `progress` (number 0-100)

## Future Enhancements

Potential improvements:
- Historical tracking (save previous chart states)
- Export to other formats (SVG, PDF)
- Animated progress transitions
- Comparison view between different chart versions
- Custom color schemes and themes
- Batch processing from CSV/JSON files

## License

MIT

## Contributing

Contributions are welcome! This is an open-source project designed to make hill chart generation easy and accessible for everyone.

Please feel free to:
- Report bugs via GitHub issues
- Suggest new features
- Submit pull requests

When contributing code, please ensure it follows the existing code style and includes appropriate tests.
