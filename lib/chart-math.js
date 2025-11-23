/**
 * Shared mathematical and layout calculation functions for hill charts
 */

import { LAYOUT_CONFIG } from './config.js';

/**
 * Calculate Y position on the hill curve for a given X progress value
 * Hill chart uses a parabola with peak at x=50, y=100
 */
export function calculateHillY(x) {
  const normalized = (x - 50) / 50;
  const y = 100 * (1 - normalized * normalized);
  return y;
}

/**
 * Estimate label dimensions based on text content
 */
export function estimateLabelDimensions(name) {
  const maxCharsPerLine = Math.floor(LAYOUT_CONFIG.TEXT_MAX_WIDTH / 7); // ~7px per char

  if (name.length <= maxCharsPerLine) {
    return {
      width: name.length * 7 + 10,
      height: LAYOUT_CONFIG.TEXT_LINE_HEIGHT + 8,
      lines: 1
    };
  }

  // Estimate word wrapping
  const words = name.split(' ');
  let lines = 1;
  let currentLine = '';
  let maxLineLength = 0;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines++;
      maxLineLength = Math.max(maxLineLength, currentLine.length);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  maxLineLength = Math.max(maxLineLength, currentLine.length);
  lines = Math.min(lines, 4); // Max 4 lines

  return {
    width: Math.min(maxLineLength * 7 + 10, LAYOUT_CONFIG.TEXT_MAX_WIDTH + 10),
    height: lines * LAYOUT_CONFIG.TEXT_LINE_HEIGHT + 8,
    lines
  };
}

/**
 * Spread overlapping points with dynamic spacing based on label heights
 */
export function spreadOverlappingPoints(points) {
  const threshold = LAYOUT_CONFIG.POINT_CLUSTERING_THRESHOLD;

  // Sort points by progress
  const sorted = [...points].sort((a, b) => a.progress - b.progress);

  // Group points that are within threshold of each other
  const groups = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (Math.abs(curr.progress - prev.progress) <= threshold) {
      currentGroup.push(curr);
    } else {
      groups.push(currentGroup);
      currentGroup = [curr];
    }
  }
  groups.push(currentGroup);

  // Spread each group vertically with dynamic spacing
  const result = [];
  groups.forEach(group => {
    if (group.length === 1) {
      result.push({
        ...group[0],
        xOffset: 0,
        yOffset: 0
      });
    } else {
      // Calculate required spacing based on label heights
      const labelHeights = group.map(p => estimateLabelDimensions(p.name).height);
      const maxLabelHeight = Math.max(...labelHeights);
      const spacing = Math.max(maxLabelHeight + 10, LAYOUT_CONFIG.MIN_VERTICAL_SPACING);

      const totalHeight = (group.length - 1) * spacing;
      const startOffset = -totalHeight / 2;

      // Add slight horizontal jitter for groups with 5+ points
      const useJitter = group.length >= 5;

      group.forEach((p, idx) => {
        result.push({
          ...p,
          xOffset: useJitter ? (idx % 2 === 0 ? -5 : 5) : 0,
          yOffset: startOffset + (idx * spacing)
        });
      });
    }
  });

  return result;
}

/**
 * Convert progress (0-100) to pixel X coordinate
 */
export function progressToPixelX(progress) {
  const xScale = LAYOUT_CONFIG.CHART_WIDTH / 100;
  return progress * xScale;
}

/**
 * Convert hill Y (0-100) to pixel Y coordinate
 */
export function hillYToPixelY(hillY) {
  const yScale = LAYOUT_CONFIG.CHART_HEIGHT / 100;
  return LAYOUT_CONFIG.CHART_HEIGHT - (hillY * yScale);
}

/**
 * Position labels using multi-zone radial layout with collision detection
 */
export function positionLabelsSmartly(points) {
  const DOT_RADIUS = 10;

  // Step 1: Assign initial label positions with zone-based strategy
  const positioned = points.map((p, i) => {
    const dims = estimateLabelDimensions(p.name);
    const pixelX = progressToPixelX(p.progress) + (p.xOffset || 0);
    const pixelY = hillYToPixelY(calculateHillY(p.progress)) + (p.yOffset || 0);

    // Determine label side based on zones
    let labelSide;
    if (p.progress < 35) {
      labelSide = 'right';  // Left zone: labels extend right
    } else if (p.progress > 65) {
      labelSide = 'left';   // Right zone: labels extend left
    } else {
      // Peak zone: alternate or use radial pattern
      labelSide = p.yOffset && p.yOffset > 0 ? 'right' : 'left';
    }

    // Initial label position (horizontal offset from dot)
    const labelDistance = LAYOUT_CONFIG.MIN_LABEL_TO_POINT_DISTANCE;
    const labelPixelX = labelSide === 'right'
      ? pixelX + labelDistance
      : pixelX - labelDistance - dims.width;

    return {
      ...p,
      index: i,
      labelSide,
      dotPixelX: pixelX,
      dotPixelY: pixelY,
      labelPixelX,
      labelPixelY: pixelY, // Start at dot's Y
      labelWidth: dims.width,
      labelHeight: dims.height,
      y: calculateHillY(p.progress)
    };
  });

  // Step 2: Collision detection and resolution
  const DOT_CLEARANCE = 5;
  const MIN_SEP = LAYOUT_CONFIG.MIN_LABEL_SEPARATION;

  for (let iteration = 0; iteration < LAYOUT_CONFIG.MAX_COLLISION_ITERATIONS; iteration++) {
    let hadCollision = false;

    for (let i = 0; i < positioned.length; i++) {
      const current = positioned[i];

      // Check collisions with all other labels
      for (let j = 0; j < positioned.length; j++) {
        if (i === j) continue;
        const other = positioned[j];

        // 2D bounding box collision detection
        const currentLeft = current.labelPixelX;
        const currentRight = current.labelPixelX + current.labelWidth;
        const currentTop = current.labelPixelY - current.labelHeight / 2;
        const currentBottom = current.labelPixelY + current.labelHeight / 2;

        const otherLeft = other.labelPixelX;
        const otherRight = other.labelPixelX + other.labelWidth;
        const otherTop = other.labelPixelY - other.labelHeight / 2;
        const otherBottom = other.labelPixelY + other.labelHeight / 2;

        const hOverlap = currentRight + MIN_SEP > otherLeft && currentLeft - MIN_SEP < otherRight;
        const vOverlap = currentBottom + MIN_SEP > otherTop && currentTop - MIN_SEP < otherBottom;

        if (hOverlap && vOverlap) {
          // Push current label down
          const requiredShift = (otherBottom + MIN_SEP) - currentTop;
          if (requiredShift > 0) {
            current.labelPixelY += requiredShift;
            hadCollision = true;
          }
        }
      }

      // Check collision with all dots
      for (const point of positioned) {
        const dotLeft = point.dotPixelX - DOT_RADIUS - DOT_CLEARANCE;
        const dotRight = point.dotPixelX + DOT_RADIUS + DOT_CLEARANCE;
        const dotTop = point.dotPixelY - DOT_RADIUS - DOT_CLEARANCE;
        const dotBottom = point.dotPixelY + DOT_RADIUS + DOT_CLEARANCE;

        const currentLeft = current.labelPixelX;
        const currentRight = current.labelPixelX + current.labelWidth;
        const currentTop = current.labelPixelY - current.labelHeight / 2;
        const currentBottom = current.labelPixelY + current.labelHeight / 2;

        const hOverlap = currentRight + MIN_SEP > dotLeft && currentLeft - MIN_SEP < dotRight;
        const vOverlap = currentBottom + MIN_SEP > dotTop && currentTop - MIN_SEP < dotBottom;

        if (hOverlap && vOverlap && point.index !== current.index) {
          const requiredShift = (dotBottom + MIN_SEP) - currentTop;
          if (requiredShift > 0) {
            current.labelPixelY += requiredShift;
            hadCollision = true;
          }
        }
      }

      // Boundary checking: keep label within canvas
      const canvasTop = LAYOUT_CONFIG.CANVAS_PADDING;
      const canvasBottom = LAYOUT_CONFIG.CHART_HEIGHT - LAYOUT_CONFIG.CANVAS_PADDING;

      const labelTop = current.labelPixelY - current.labelHeight / 2;
      const labelBottom = current.labelPixelY + current.labelHeight / 2;

      if (labelTop < canvasTop) {
        current.labelPixelY = canvasTop + current.labelHeight / 2;
        hadCollision = true;
      } else if (labelBottom > canvasBottom) {
        current.labelPixelY = canvasBottom - current.labelHeight / 2;
        hadCollision = true;
      }
    }

    if (!hadCollision) break;
  }

  // Step 3: Convert back to offset format for rendering
  positioned.forEach(p => {
    p.labelYOffset = p.labelPixelY - p.dotPixelY;
    p.maxCharsPerLine = Math.floor(LAYOUT_CONFIG.TEXT_MAX_WIDTH / 7);
  });

  console.log('Multi-zone radial label positioning with pixel-perfect collision detection');
  return positioned;
}
