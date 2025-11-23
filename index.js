#!/usr/bin/env node

import prompts from 'prompts';
import puppeteer from 'puppeteer';
import { createHillChartHTML } from './lib/hill-chart-generator.js';
import { COLORS, LAYOUT_CONFIG } from './lib/config.js';
import {
  calculateHillY,
  spreadOverlappingPoints,
  positionLabelsSmartly
} from './lib/chart-math.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Parse JSON input from --json flag
 * Expected format: { project: "name", points: [{ name: "task", progress: 50 }] }
 */
function parseJsonInput(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    // Validate required fields
    if (!data.project || typeof data.project !== 'string') {
      throw new Error('JSON must have a "project" field (string)');
    }

    if (!Array.isArray(data.points) || data.points.length === 0) {
      throw new Error('JSON must have a "points" array with at least one point');
    }

    // Validate and transform points
    const points = data.points.map((point, index) => {
      if (!point.name || typeof point.name !== 'string') {
        throw new Error(`Point ${index + 1} must have a "name" field (string)`);
      }

      const progress = Number(point.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        throw new Error(`Point ${index + 1} must have a "progress" field (number 0-100)`);
      }

      // Auto-assign color from palette
      const color = COLORS[index % COLORS.length];

      return {
        id: `point-${index + 1}`,
        name: point.name,
        progress: progress,
        color: color,
      };
    });

    return {
      chartName: data.project,
      points: points,
    };
  } catch (error) {
    console.error('❌ Error parsing JSON input:', error.message);
    console.log('\nExpected format:');
    console.log('--json \'{"project":"Sprint 5","points":[{"name":"Task 1","progress":50}]}\'');
    process.exit(1);
  }
}

/**
 * Parse CLI arguments (--project, --point, --progress)
 * Example: --project "Sprint 5" --point "Task 1" --progress 50 --point "Task 2" --progress 75
 */
function parseArgsInput(args) {
  try {
    // Extract project name
    const projectIndex = args.indexOf('--project');
    if (projectIndex === -1 || !args[projectIndex + 1]) {
      throw new Error('--project flag requires a value');
    }
    const chartName = args[projectIndex + 1];

    // Extract points and progress values
    const points = [];
    let currentPoint = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--point') {
        // If we have a pending point without progress, error
        if (currentPoint !== null) {
          throw new Error(`Point "${currentPoint}" is missing --progress value`);
        }
        if (!args[i + 1]) {
          throw new Error('--point flag requires a value');
        }
        currentPoint = args[i + 1];
        i++; // Skip the point name
      } else if (args[i] === '--progress') {
        if (currentPoint === null) {
          throw new Error('--progress must come after --point');
        }
        if (!args[i + 1]) {
          throw new Error('--progress flag requires a value');
        }

        const progress = Number(args[i + 1]);
        if (isNaN(progress) || progress < 0 || progress > 100) {
          throw new Error(`Invalid progress value "${args[i + 1]}" (must be 0-100)`);
        }

        // Auto-assign color from palette
        const color = COLORS[points.length % COLORS.length];

        points.push({
          id: `point-${points.length + 1}`,
          name: currentPoint,
          progress: progress,
          color: color,
        });

        currentPoint = null;
        i++; // Skip the progress value
      }
    }

    // Check for pending point without progress
    if (currentPoint !== null) {
      throw new Error(`Point "${currentPoint}" is missing --progress value`);
    }

    if (points.length === 0) {
      throw new Error('At least one --point and --progress pair is required');
    }

    return {
      chartName: chartName,
      points: points,
    };
  } catch (error) {
    console.error('❌ Error parsing CLI arguments:', error.message);
    console.log('\nExpected format:');
    console.log('--project "Sprint 5" --point "Task 1" --progress 50 --point "Task 2" --progress 75');
    process.exit(1);
  }
}

/**
 * Parse command line arguments to check for programmatic input
 * Returns null if no CLI args (triggers interactive mode)
 */
function parseCliArguments() {
  const args = process.argv.slice(2);

  // No arguments = interactive mode
  if (args.length === 0) {
    return null;
  }

  // Check for --json flag
  const jsonIndex = args.indexOf('--json');
  if (jsonIndex !== -1) {
    if (!args[jsonIndex + 1]) {
      console.error('❌ --json flag requires a JSON string argument');
      process.exit(1);
    }
    return parseJsonInput(args[jsonIndex + 1]);
  }

  // Check for --project flag (CLI args mode)
  const projectIndex = args.indexOf('--project');
  if (projectIndex !== -1) {
    return parseArgsInput(args);
  }

  // Unknown arguments = show help
  console.error('❌ Unknown arguments. Use one of:');
  console.log('\n1. Interactive mode (no arguments):');
  console.log('   npm run publish-chart');
  console.log('\n2. JSON mode:');
  console.log('   node index.js --json \'{"project":"Sprint 5","points":[{"name":"Task 1","progress":50}]}\'');
  console.log('\n3. CLI arguments mode:');
  console.log('   node index.js --project "Sprint 5" --point "Task 1" --progress 50 --point "Task 2" --progress 75');
  process.exit(1);
}

async function collectProjectData() {
  console.log('\nHill Chart Publisher\n');
  console.log('Hill Chart Guide:');
  console.log('  0-50%: Figuring things out (unknowns, research, planning)');
  console.log('  50-100%: Making it happen (execution, completion)\n');

  // Get chart name first
  const { chartName } = await prompts({
    type: 'text',
    name: 'chartName',
    message: 'Hill chart name:',
    initial: 'Hill Chart',
    validate: value => value.length > 0 ? true : 'Chart name is required'
  });

  if (!chartName) {
    return { chartName: null, points: [] };
  }

  console.log('\nNow add points to the chart:\n');

  const points = [];
  let addMore = true;

  while (addMore) {
    const response = await prompts([
      {
        type: 'text',
        name: 'name',
        message: 'Point name:',
        validate: value => value.length > 0 ? true : 'Name is required'
      },
      {
        type: 'select',
        name: 'progress',
        message: 'Current progress:',
        choices: [
          { title: '0-10% - Just starting, lots of unknowns', value: 5 },
          { title: '10-25% - Exploring and researching', value: 17 },
          { title: '25-40% - Planning and designing', value: 32 },
          { title: '40-50% - Final decisions being made', value: 45 },
          { title: '50-60% - Starting execution', value: 55 },
          { title: '60-75% - Building and implementing', value: 67 },
          { title: '75-90% - Finishing up', value: 82 },
          { title: '90-100% - Nearly complete/Done', value: 95 },
        ]
      }
    ]);

    if (!response.name) break; // User cancelled

    // Auto-assign color from palette, cycling through colors
    const color = COLORS[points.length % COLORS.length];

    points.push({
      id: `point-${points.length + 1}`,
      name: response.name,
      progress: response.progress,
      color: color,
    });

    const { more } = await prompts({
      type: 'confirm',
      name: 'more',
      message: 'Add another point?',
      initial: true
    });

    addMore = more;
  }

  return { chartName, points };
}

async function generateChartImage(points, title) {
  console.log('\nGenerating hill chart...');

  // Spread out overlapping points
  const spreadPoints = spreadOverlappingPoints(points);

  // Apply smart label positioning
  const positionedPoints = positionLabelsSmartly(spreadPoints);

  // Transform points to include y coordinate based on hill curve
  const dataPoints = positionedPoints.map(p => ({
    id: p.id,
    name: p.name,
    x: p.progress,
    y: calculateHillY(p.progress),
    color: p.color,
    xOffset: p.xOffset || 0,
    yOffset: p.yOffset || 0,
    labelYOffset: p.labelYOffset || p.yOffset || 0, // Keep labels close to dots
    labelSide: p.labelSide, // Which side of dot label extends to
    maxCharsPerLine: p.maxCharsPerLine || 22
  }));

  const html = createHillChartHTML(dataPoints, title);

  // Save HTML temporarily
  const tempDir = await fs.mkdtemp('/tmp/hill-chart-');
  const htmlPath = path.join(tempDir, 'chart.html');
  await fs.writeFile(htmlPath, html);

  // Launch puppeteer and render
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({
    width: 1200, // Match SVG width
    height: 700,
    deviceScaleFactor: 2  // 2x DPI for Retina-quality output
  });
  await page.goto(`file://${htmlPath}`);

  // Wait for chart to render
  await page.waitForSelector('#hill-chart');
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));

  const imagePath = path.join(tempDir, 'chart.png');
  await page.screenshot({
    path: imagePath,
    fullPage: false
  });

  await browser.close();

  console.log('Chart generated successfully');

  return { imagePath, tempDir };
}

async function saveToOutputFolder(imagePath, chartName) {
  console.log('\nSaving to outputs folder...');

  const outputDir = path.join(process.cwd(), 'outputs');
  await fs.mkdir(outputDir, { recursive: true });

  // Generate base filename from chart name + date
  const date = new Date().toISOString().split('T')[0];
  const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const safeName = chartName ? sanitize(chartName) : 'hill-chart';
  const baseFilename = `${safeName}-${date}`;

  // Find next available version number
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
      // Check if file exists
      await fs.access(outputPath);
      // File exists, try next version
      version++;
    } catch {
      // File doesn't exist, use this filename
      break;
    }
  }

  await fs.copyFile(imagePath, outputPath);

  console.log('Chart saved successfully!');
  console.log(`Location: ${outputPath}`);
  if (version > 0) {
    console.log(`(Version ${version} - previous versions exist)`);
  }

  return outputPath;
}

async function main() {
  try {
    // Try to parse CLI arguments first
    const cliData = parseCliArguments();

    let chartName, points;

    if (cliData) {
      // CLI mode: use parsed data
      ({ chartName, points } = cliData);
      console.log(`\nGenerating hill chart for: ${chartName}`);
      console.log(`Points: ${points.length}`);
    } else {
      // Interactive mode: prompt user
      ({ chartName, points } = await collectProjectData());
    }

    if (!chartName || points.length === 0) {
      console.log('No chart created. Exiting.');
      return;
    }

    // Generate the chart image
    const { imagePath, tempDir } = await generateChartImage(points, chartName);

    // Save to outputs folder
    await saveToOutputFolder(imagePath, chartName);

    console.log('\nDone!');

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log('\nCancelled.');
    } else {
      console.error('Error:', error);
    }
  }
}

main();
