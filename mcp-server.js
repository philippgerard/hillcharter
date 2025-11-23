#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer';
import { createHillChartHTML } from './lib/hill-chart-generator.js';
import { uploadToNotion } from './lib/notion-uploader.js';
import { COLORS, LAYOUT_CONFIG } from './lib/config.js';
import {
  calculateHillY,
  spreadOverlappingPoints,
  positionLabelsSmartly
} from './lib/chart-math.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateChartImage(points, title) {
  const spreadPoints = spreadOverlappingPoints(points);
  const positionedPoints = positionLabelsSmartly(spreadPoints);

  const dataPoints = positionedPoints.map(p => ({
    id: p.id,
    name: p.name,
    x: p.progress,
    y: calculateHillY(p.progress),
    color: p.color,
    xOffset: p.xOffset || 0,
    yOffset: p.yOffset || 0,
    labelYOffset: p.labelYOffset || p.yOffset || 0,
    labelSide: p.labelSide,
    maxCharsPerLine: p.maxCharsPerLine || Math.floor(LAYOUT_CONFIG.TEXT_MAX_WIDTH / 7)
  }));

  const html = createHillChartHTML(dataPoints, title);

  const tempDir = await fs.mkdtemp('/tmp/hill-chart-');
  const htmlPath = path.join(tempDir, 'chart.html');
  await fs.writeFile(htmlPath, html);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 700,
    deviceScaleFactor: 2
  });
  await page.goto(`file://${htmlPath}`);

  await page.waitForSelector('#hill-chart');

  const imagePath = path.join(tempDir, 'chart.png');
  await page.screenshot({
    path: imagePath,
    fullPage: false
  });

  await browser.close();

  return { imagePath, tempDir };
}

async function saveToOutputFolder(imagePath, chartName) {
  const outputDir = path.join(process.cwd(), 'outputs');
  await fs.mkdir(outputDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const safeName = chartName ? sanitize(chartName) : 'hill-chart';
  const baseFilename = `${safeName}-${date}`;

  let version = 0;
  let filename;
  let outputPath;

  while (true) {
    if (version === 0) {
      filename = `${baseFilename}.png`;
    } else {
      filename = `${baseFilename}-${version}.png`;
    }
    outputPath = path.join(outputDir, filename);

    try {
      await fs.access(outputPath);
      version++;
    } catch {
      break;
    }
  }

  await fs.copyFile(imagePath, outputPath);

  return outputPath;
}

// Create MCP server
const server = new Server(
  {
    name: 'hillcharter',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_hill_chart',
        description: 'Generate a hill chart visualization for project progress tracking. Hill charts show two phases: 0-50% is "Figuring things out" (unknowns, research, planning) and 50-100% is "Making it happen" (execution, completion). Returns the path to the generated PNG image.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The name/title of the project or chart',
            },
            points: {
              type: 'array',
              description: 'Array of data points to plot on the hill chart',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name/label of this point (e.g., "User Auth", "Database Setup")',
                  },
                  progress: {
                    type: 'number',
                    description: 'Progress percentage (0-100). 0-50 is figuring things out, 50-100 is making it happen.',
                    minimum: 0,
                    maximum: 100,
                  },
                },
                required: ['name', 'progress'],
              },
            },
          },
          required: ['project', 'points'],
        },
      },
      {
        name: 'upload_to_notion',
        description: 'Upload a hill chart image to a Notion page. The image will be appended to the page, preferably under a "Hill Chart" heading if it exists.',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'The Notion page ID where the image should be uploaded',
            },
            image_path: {
              type: 'string',
              description: 'The local file system path to the image file to upload',
            },
            notion_token: {
              type: 'string',
              description: 'The Notion API integration token. If not provided, will look for NOTION_API_KEY environment variable.',
            },
          },
          required: ['page_id', 'image_path'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'generate_hill_chart') {
      const { project, points } = args;

      // Validate inputs
      if (!project || typeof project !== 'string') {
        throw new Error('project must be a non-empty string');
      }

      if (!Array.isArray(points) || points.length === 0) {
        throw new Error('points must be a non-empty array');
      }

      // Transform points and assign colors
      const chartPoints = points.map((point, index) => {
        if (!point.name || typeof point.name !== 'string') {
          throw new Error(`Point ${index + 1} must have a name (string)`);
        }

        const progress = Number(point.progress);
        if (isNaN(progress) || progress < 0 || progress > 100) {
          throw new Error(`Point ${index + 1} must have progress between 0-100`);
        }

        return {
          id: `point-${index + 1}`,
          name: point.name,
          progress: progress,
          color: COLORS[index % COLORS.length],
        };
      });

      // Generate chart
      const { imagePath, tempDir } = await generateChartImage(chartPoints, project);

      // Save to outputs folder
      const outputPath = await saveToOutputFolder(imagePath, project);

      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Hill chart generated successfully',
              output_path: outputPath,
              project: project,
              points_count: chartPoints.length,
            }, null, 2),
          },
        ],
      };
    } else if (name === 'upload_to_notion') {
      const { page_id, image_path, notion_token } = args;

      // Validate inputs
      if (!page_id || typeof page_id !== 'string') {
        throw new Error('page_id must be a non-empty string');
      }

      if (!image_path || typeof image_path !== 'string') {
        throw new Error('image_path must be a non-empty string');
      }

      // Check if file exists
      try {
        await fs.access(image_path);
      } catch {
        throw new Error(`Image file not found: ${image_path}`);
      }

      // Use provided token or environment variable
      const token = notion_token || process.env.NOTION_API_KEY;
      if (!token) {
        throw new Error('Notion API token not provided. Pass notion_token or set NOTION_API_KEY environment variable.');
      }

      // Upload to Notion
      const result = await uploadToNotion(page_id, image_path, token);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Image uploaded to Notion successfully',
              page_id: page_id,
              image_name: path.basename(image_path),
              block_id: result.blockId,
            }, null, 2),
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Hillcharter MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
