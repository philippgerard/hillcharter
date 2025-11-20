# Hill Chart Publisher

Automated CLI tool to generate beautiful hill charts. Save them locally or publish to Notion pages. Stop drawing project status by hand!

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

- 📊 Interactive CLI to input project status
- 🎨 Beautiful D3.js-generated hill charts
- 🖼️ Automatic PNG export to `outputs/` folder
- 📝 Optional Notion integration for publishing
- 🌈 **Auto-assigned colors** - each point gets a unique color from a vibrant palette
- 📍 **Smart label positioning** - labels extend away from chart edges for perfect readability
- 📁 Organized filename format: `chart-name-2025-01-20.png`
- 🔄 **Automatic versioning** - never overwrites existing files, auto-increments version numbers

## Prerequisites

- Node.js 22 or higher
- Notion account with API access (optional, only if uploading to Notion)

## Setup

### 1. Install Dependencies

```bash
cd hill-chart-publisher
npm install
```

### 2. (Optional) Setup Notion Integration

**Only required if you want to upload charts to Notion.**

#### Get Your Notion API Key

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "+ New integration"
3. Give it a name (e.g., "Hill Chart Publisher")
4. Select the workspace where you want to publish charts
5. Click "Submit"
6. Copy the "Internal Integration Token" (starts with `secret_`)

#### Share Notion Page with Integration

1. Open the Notion page where you want to publish hill charts
2. Click "Share" in the top right
3. Click "Invite"
4. Select your integration from the list
5. Copy the page ID from the URL:
   - URL format: `https://notion.so/Page-Title-abc123def456...`
   - Page ID is the part after the last dash: `abc123def456...`

## Usage

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
- Notion upload is only available in interactive mode
- Progress values must be between 0-100
- Colors are automatically assigned

## Programmatic Usage with LLMs (Claude Code, etc.)

The JSON mode is designed specifically for easy integration with AI assistants and automation tools.

**Example for Claude Code or other LLMs:**

```bash
cd /Users/philippgerard/Sites/Prosperity/hill-chart-publisher
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

3. **Upload to Notion?**
   - **No (default):** Saves chart to `outputs/chart-name-2025-01-20.png`
   - **Yes:** Prompts for Notion credentials and uploads

### Local-Only Mode (No Notion)

If you choose **not** to upload to Notion, the tool will:
1. Generate a beautiful hill chart
2. Save it to `outputs/` folder with format: `project-name-YYYY-MM-DD.png`
3. Done! Use the image wherever you need

### Notion Upload Mode

If you choose to upload to Notion, the tool will:
1. Generate a beautiful hill chart
2. Create a Notion block with the chart title and timestamp
3. Save the PNG locally
4. Provide the image path for manual upload (Notion API limitation)

## Example Workflow

### Local-Only Mode (Default)

```bash
$ npm run publish-chart

📊 Hill Chart Publisher

Hill Chart Guide:
  0-50%: Figuring things out (unknowns, research, planning)
  50-100%: Making it happen (execution, completion)

✔ Hill chart name: Sprint 5 Progress    (you can edit the default "Hill Chart" text)

Now add points to the chart:

✔ Point name: User Authentication
✔ Current progress: 🚀 50-60% - Starting execution
✔ Add another point? yes

✔ Point name: Database Migration
✔ Current progress: 📋 25-40% - Planning and designing
✔ Add another point? no

✔ Upload to Notion? no

🎨 Generating hill chart...
✅ Chart generated successfully

💾 Saving to outputs folder...
✅ Chart saved successfully!
📁 Location: /Users/you/hill-chart-publisher/outputs/sprint-5-progress-2025-01-20.png

✨ Done!
```

### With Notion Upload

If you answer "yes" to "Upload to Notion?", you'll also be prompted for:

```bash
✔ Upload to Notion? yes
✔ Notion API Key: secret_***
✔ Notion Page ID: abc123def456
✔ Chart title: Q1 2024 - Sprint 3

🎨 Generating hill chart...
✅ Chart generated successfully

📤 Uploading to Notion...
✅ Notion page updated!

📁 Chart saved to: /tmp/hill-chart-xyz/chart.png
⚠️ Note: Please manually upload the image to Notion (API limitation)

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

## Notion API Limitation

⚠️ **Note for Notion users:** The Notion API doesn't support directly uploading images as base64 or from local files.

When uploading to Notion, the tool will:
1. Create a text block in your Notion page with the chart title and timestamp
2. Save the PNG image locally
3. You'll need to manually drag-and-drop the image into your Notion page

**Alternatives:**
- **Use local-only mode** (default): Skip Notion upload entirely, just generate charts to `outputs/` folder
- **Workaround for automation:** Host images on S3/Cloudinary and use external URLs
- **Future enhancement:** Using Notion's file upload endpoints (requires additional setup)

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

### "Invalid API Key"

Make sure:
- Your Notion integration token starts with `secret_`
- The integration has access to the workspace
- The page is shared with the integration

### "Page not found"

Make sure:
- You've shared the Notion page with your integration
- The page ID is correct (from the URL)

## Future Enhancements

Potential improvements:
- Save configuration to avoid re-entering Notion credentials
- Automated image hosting for direct Notion upload
- Historical tracking (save previous chart states)
- Export to other formats (SVG, PDF)
- Support Notion upload in CLI/JSON modes

## License

MIT

## Contributing

Part of the Prosperity ecosystem. For internal use.
