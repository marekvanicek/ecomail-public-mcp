import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addTemplateTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'create-template',
    {
      title: 'Create Template',
      description: 'Create a new email template with HTML content.',
      inputSchema: {
        name: z.string().describe('Template name'),
        html: z.string().describe('Template HTML content'),
      },
    },
    async ({ name, html }) => {
      const response = await ecomail.post<any>('/template', {
        name,
        html,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Template created!\nID: ${response.id}\nName: ${response.name}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-template',
    {
      title: 'Get Template',
      description:
        'Retrieve a specific template by its ID, including HTML content.',
      inputSchema: {
        template_id: z.number().describe('Template ID'),
      },
    },
    async ({ template_id }) => {
      const response = await ecomail.get<any>(`/template/${template_id}`);

      let details = `Template: ${response.name} (ID: ${response.id})\n`;
      details += `Folder: ${response.folder}\n`;
      details += `Created: ${response.created_at}\n`;
      details += `Updated: ${response.updated_at}\n`;
      if (response.html) {
        details += `\n--- HTML Content ---\n${response.html}\n`;
      }

      return { content: [{ type: 'text', text: details }] };
    },
  );
}
