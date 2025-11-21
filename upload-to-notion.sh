#!/bin/bash

# Upload image to Notion page using the Notion API
# Usage: ./upload-to-notion.sh <page_id> <image_path> [notion_token]

set -e

PAGE_ID="$1"
IMAGE_PATH="$2"
NOTION_TOKEN="${3:-$(op item get pagwdwkeufbgjev4nbz5xwqly4 --reveal --format json 2>/dev/null | jq -r '.fields[] | select(.label == "Anmeldedaten") | .value')}"

if [ -z "$PAGE_ID" ] || [ -z "$IMAGE_PATH" ] || [ -z "$NOTION_TOKEN" ]; then
    echo "❌ Error: Missing required parameters"
    echo "Usage: $0 <page_id> <image_path> [notion_token]"
    exit 1
fi

if [ ! -f "$IMAGE_PATH" ]; then
    echo "❌ Error: Image file not found: $IMAGE_PATH"
    exit 1
fi

NOTION_VERSION="2022-06-28"

echo "📤 Uploading image to Notion..."
echo "   Page ID: ${PAGE_ID:0:8}...${PAGE_ID: -8}"
echo "   Image: $(basename "$IMAGE_PATH")"

# Step 1: Create file upload
echo ""
echo "Step 1/3: Creating file upload object..."

# Get file size
FILE_SIZE=$(wc -c < "$IMAGE_PATH" | tr -d ' ')

CREATE_RESPONSE=$(curl -s -X POST https://api.notion.com/v1/file_uploads \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: $NOTION_VERSION" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'"$(basename "$IMAGE_PATH")"'",
    "parent": {
      "type": "page_id",
      "page_id": "'"$PAGE_ID"'"
    },
    "content_type": "image/png",
    "content_length": '"$FILE_SIZE"'
  }')

# Extract upload URL and ID
UPLOAD_URL=$(echo "$CREATE_RESPONSE" | jq -r '.upload_url // empty')
FILE_UPLOAD_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

if [ -z "$UPLOAD_URL" ] || [ -z "$FILE_UPLOAD_ID" ]; then
    echo "❌ Error: Failed to create file upload"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

echo "✅ Upload URL obtained"
echo "   File ID: ${FILE_UPLOAD_ID:0:8}...${FILE_UPLOAD_ID: -8}"

# Step 2: Upload file contents
echo ""
echo "Step 2/3: Uploading file contents..."
UPLOAD_RESPONSE=$(curl -s -X POST "$UPLOAD_URL" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: $NOTION_VERSION" \
  -F "file=@$IMAGE_PATH;type=image/png")

# Verify upload succeeded
UPLOAD_STATUS=$(echo "$UPLOAD_RESPONSE" | jq -r '.status // "error"')
if [ "$UPLOAD_STATUS" != "uploaded" ]; then
    echo "❌ Error: File upload failed"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo "✅ File uploaded successfully"

# Step 3: Attach to page by appending an image block
echo ""
echo "Step 3/3: Attaching image to page..."

# First, fetch the page to find the Hill Chart section
PAGE_CONTENT=$(curl -s -X GET "https://api.notion.com/v1/blocks/${PAGE_ID}/children?page_size=100" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: $NOTION_VERSION")

# Find the "Hill Chart" heading block ID
HILL_CHART_BLOCK_ID=$(echo "$PAGE_CONTENT" | jq -r '.results[]? | select(.type == "heading_2" and (.heading_2.rich_text[0].plain_text // "") == "Hill Chart") | .id' 2>/dev/null || echo "")

if [ -z "$HILL_CHART_BLOCK_ID" ]; then
    echo "⚠️  Warning: Could not find 'Hill Chart' heading, appending to end of page"
    TARGET_BLOCK_ID="$PAGE_ID"
else
    echo "✅ Found Hill Chart section"
    TARGET_BLOCK_ID="$HILL_CHART_BLOCK_ID"
fi

# Append the image block
ATTACH_RESPONSE=$(curl -s -X PATCH "https://api.notion.com/v1/blocks/${TARGET_BLOCK_ID}/children" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: $NOTION_VERSION" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {
        "type": "image",
        "image": {
          "type": "file_upload",
          "file_upload": {
            "id": "'"$FILE_UPLOAD_ID"'"
          }
        }
      }
    ]
  }')

# Check if attachment was successful
if echo "$ATTACH_RESPONSE" | jq -e '.results[0].id' > /dev/null 2>&1; then
    echo "✅ Image attached successfully!"
    echo ""
    echo "🎉 Done! Image uploaded and attached to page."
else
    echo "❌ Error: Failed to attach image"
    echo "Response: $ATTACH_RESPONSE"
    exit 1
fi
