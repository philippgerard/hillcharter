/**
 * Generates HTML with embedded D3.js hill chart
 */
export function createHillChartHTML(dataPoints, title) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: white;
    }
    #hill-chart {
      width: 1200px;
      height: 700px;
    }
    .hill-path {
      fill: none;
      stroke: #e0e0e0;
      stroke-width: 3;
    }
    .hill-fill {
      fill: #f5f5f5;
      opacity: 0.3;
    }
    .midline {
      stroke: #ccc;
      stroke-width: 1;
      stroke-dasharray: 5,5;
    }
    .label {
      font-size: 14px;
      fill: #666;
      font-weight: 500;
    }
    .phase-label {
      font-size: 16px;
      fill: #999;
      font-weight: 600;
    }
    .point {
      cursor: pointer;
    }
    .point circle {
      stroke: white;
      stroke-width: 2;
    }
    .point text {
      font-size: 13px;
      font-weight: 600;
      fill: #333;
      pointer-events: none;
    }
    .chart-title {
      font-size: 24px;
      font-weight: 700;
      fill: #333;
    }
    .chart-subtitle {
      font-size: 14px;
      font-weight: 400;
      fill: #666;
    }
  </style>
</head>
<body>
  <div id="hill-chart"></div>
  <script>
    const data = ${JSON.stringify(dataPoints)};
    const chartTitle = ${JSON.stringify(title)};

    // Dimensions
    const width = 1200;
    const height = 700;
    const margin = { top: 120, right: 40, bottom: 120, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select('#hill-chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', \`translate(\${margin.left},\${margin.top})\`);

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('class', 'chart-title')
      .text(chartTitle);

    // Add date subtitle
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 55)
      .attr('text-anchor', 'middle')
      .attr('class', 'chart-subtitle')
      .text(currentDate);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([chartHeight, 0]);

    // Hill curve function
    function hillY(x) {
      const normalized = (x - 50) / 50;
      return 100 * (1 - normalized * normalized);
    }

    // Generate hill path
    const hillPath = d3.range(0, 101, 1).map(x => ({
      x: x,
      y: hillY(x)
    }));

    const line = d3.line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveBasis);

    // Draw hill fill
    const area = d3.area()
      .x(d => xScale(d.x))
      .y0(chartHeight)
      .y1(d => yScale(d.y))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(hillPath)
      .attr('class', 'hill-fill')
      .attr('d', area);

    // Draw hill curve
    g.append('path')
      .datum(hillPath)
      .attr('class', 'hill-path')
      .attr('d', line);

    // Draw midline
    g.append('line')
      .attr('class', 'midline')
      .attr('x1', xScale(50))
      .attr('y1', 0)
      .attr('x2', xScale(50))
      .attr('y2', chartHeight);

    // Phase labels
    g.append('text')
      .attr('class', 'phase-label')
      .attr('x', xScale(25))
      .attr('y', chartHeight + 40)
      .attr('text-anchor', 'middle')
      .text('🔍  Figuring things out');

    g.append('text')
      .attr('class', 'phase-label')
      .attr('x', xScale(75))
      .attr('y', chartHeight + 40)
      .attr('text-anchor', 'middle')
      .text('🚀  Making it happen');

    // Draw connector lines for offset points
    g.selectAll('.connector')
      .data(data.filter(d => d.xOffset || d.yOffset))
      .enter()
      .append('line')
      .attr('class', 'connector')
      .attr('x1', d => xScale(d.x))
      .attr('y1', d => yScale(d.y))
      .attr('x2', d => xScale(d.x) + (d.xOffset || 0))
      .attr('y2', d => yScale(d.y) + (d.yOffset || 0))
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3');

    // Draw data points
    const points = g.selectAll('.point')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'point')
      .attr('transform', d => \`translate(\${xScale(d.x) + (d.xOffset || 0)},\${yScale(d.y) + (d.yOffset || 0)})\`);

    points.append('circle')
      .attr('r', 10)
      .attr('fill', d => d.color);

    // Add labels with background - positioned based on which side of hill
    const labelGroup = points.append('g')
      .attr('transform', d => {
        // Position label to the right if on left side, to the left if on right side
        const xOffset = d.x < 50 ? 15 : -15;
        return \`translate(\${xOffset}, 0)\`;
      });

    labelGroup.append('rect')
      .attr('x', function(d) {
        const textLength = d.name.length * 7;
        // Align background based on hill position
        if (d.x < 50) {
          // Left side: rectangle starts at 0 (extends right)
          return -5;
        } else {
          // Right side: rectangle ends at 0 (extends left)
          return -(textLength + 5);
        }
      })
      .attr('y', -10)
      .attr('width', function(d) {
        const textLength = d.name.length * 7;
        return textLength + 10;
      })
      .attr('height', 20)
      .attr('fill', 'white')
      .attr('opacity', 0.9)
      .attr('rx', 3);

    labelGroup.append('text')
      .attr('class', 'label')
      .attr('text-anchor', d => d.x < 50 ? 'start' : 'end')
      .attr('dy', '5')
      .text(d => d.name);

  </script>
</body>
</html>`;
}
