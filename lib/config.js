/**
 * Shared configuration constants for hillcharter
 */

export const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

export const LAYOUT_CONFIG = {
  MIN_LABEL_SEPARATION: 15,        // Minimum pixels between any two labels
  MIN_LABEL_TO_POINT_DISTANCE: 30, // Minimum distance label-to-nearest-point
  POINT_CLUSTERING_THRESHOLD: 3,   // % progress to group as "same position"
  MIN_VERTICAL_SPACING: 50,        // Min pixels between stacked points
  CANVAS_PADDING: 30,              // Keep elements this far from edge
  MAX_COLLISION_ITERATIONS: 20,    // Collision resolution limit
  TEXT_MAX_WIDTH: 200,             // Max label width before wrapping
  TEXT_LINE_HEIGHT: 18,            // Pixels per line of text
  CHART_WIDTH: 900,                // Actual chart area width (1200 - margins)
  CHART_HEIGHT: 460,               // Actual chart area height (700 - margins)
  MARGIN_LEFT: 150,                // Left margin for labels
  MARGIN_TOP: 120,                 // Top margin
};
