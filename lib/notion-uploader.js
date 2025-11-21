import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import FormData from 'form-data';

const NOTION_VERSION = '2022-06-28';

/**
 * Upload an image to a Notion page
 * @param {string} pageId - The Notion page ID
 * @param {string} imagePath - The local path to the image file
 * @param {string} notionToken - The Notion API integration token
 * @returns {Promise<{blockId: string}>} The ID of the created image block
 */
export async function uploadToNotion(pageId, imagePath, notionToken) {
  // Step 1: Get file size
  const stats = await fs.stat(imagePath);
  const fileSize = stats.size;
  const fileName = path.basename(imagePath);

  console.error(`📤 Uploading image to Notion...`);
  console.error(`   Page ID: ${pageId.slice(0, 8)}...${pageId.slice(-8)}`);
  console.error(`   Image: ${fileName}`);

  // Step 2: Create file upload
  console.error('\nStep 1/3: Creating file upload object...');

  const createResponse = await fetch('https://api.notion.com/v1/file_uploads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: fileName,
      parent: {
        type: 'page_id',
        page_id: pageId,
      },
      content_type: 'image/png',
      content_length: fileSize,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create file upload: ${createResponse.status} ${errorText}`);
  }

  const createData = await createResponse.json();
  const uploadUrl = createData.upload_url;
  const fileUploadId = createData.id;

  if (!uploadUrl || !fileUploadId) {
    throw new Error('Failed to get upload URL or file ID from Notion API');
  }

  console.error('✅ Upload URL obtained');
  console.error(`   File ID: ${fileUploadId.slice(0, 8)}...${fileUploadId.slice(-8)}`);

  // Step 3: Upload file contents
  console.error('\nStep 2/3: Uploading file contents...');

  const formData = new FormData();
  formData.append('file', createReadStream(imagePath), {
    filename: fileName,
    contentType: 'image/png',
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Notion-Version': NOTION_VERSION,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload file: ${uploadResponse.status} ${errorText}`);
  }

  const uploadData = await uploadResponse.json();

  if (uploadData.status !== 'uploaded') {
    throw new Error(`File upload failed with status: ${uploadData.status}`);
  }

  console.error('✅ File uploaded successfully');

  // Step 4: Attach to page
  console.error('\nStep 3/3: Attaching image to page...');

  // First, fetch the page to find the Hill Chart section
  const pageContentResponse = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': NOTION_VERSION,
      },
    }
  );

  let targetBlockId = pageId;

  if (pageContentResponse.ok) {
    const pageContent = await pageContentResponse.json();

    // Find the "Hill Chart" heading block
    const hillChartBlock = pageContent.results?.find(
      (block) =>
        block.type === 'heading_2' &&
        block.heading_2?.rich_text?.[0]?.plain_text === 'Hill Chart'
    );

    if (hillChartBlock) {
      console.error('✅ Found Hill Chart section');
      targetBlockId = hillChartBlock.id;
    } else {
      console.error('⚠️  Warning: Could not find "Hill Chart" heading, appending to end of page');
    }
  }

  // Append the image block
  const attachResponse = await fetch(
    `https://api.notion.com/v1/blocks/${targetBlockId}/children`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        children: [
          {
            type: 'image',
            image: {
              type: 'file_upload',
              file_upload: {
                id: fileUploadId,
              },
            },
          },
        ],
      }),
    }
  );

  if (!attachResponse.ok) {
    const errorText = await attachResponse.text();
    throw new Error(`Failed to attach image to page: ${attachResponse.status} ${errorText}`);
  }

  const attachData = await attachResponse.json();

  if (!attachData.results?.[0]?.id) {
    throw new Error('Failed to get block ID from attach response');
  }

  const blockId = attachData.results[0].id;

  console.error('✅ Image attached successfully!');
  console.error('\n🎉 Done! Image uploaded and attached to page.');

  return { blockId };
}
