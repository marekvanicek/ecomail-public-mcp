import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addTransactionalTools(
  server: McpServer,
  ecomail: EcomailClient,
) {
  server.registerTool(
    'send-transactional-email',
    {
      title: 'Send Transactional Email',
      description: `Send a transactional email with custom HTML/text content. Requires a paid account with a verified sending domain.

**When to use:** User wants to send a one-off email (password reset, order confirmation, notification, etc.)

**Limits:** 100,000 bytes for merge tags. Message + attachments must be under 4 MB.`,
      inputSchema: {
        subject: z.string().describe('Email subject line'),
        from_name: z.string().describe("Sender's display name"),
        from_email: z
          .email()
          .describe("Sender's email (must be from a verified domain)"),
        reply_to: z.email().optional().describe('Reply-to email address'),
        text: z
          .string()
          .optional()
          .describe(
            'Plain text content. At least one of text or html is required.',
          ),
        html: z
          .string()
          .optional()
          .describe('HTML content. At least one of text or html is required.'),
        to: z
          .array(
            z.object({
              email: z.email().describe("Recipient's email"),
              name: z.string().optional().describe("Recipient's name"),
              cc: z.email().optional().describe('CC email address'),
              bcc: z.email().optional().describe('BCC email address'),
            }),
          )
          .min(1)
          .describe('Array of recipients'),
        global_merge_vars: z
          .array(
            z.object({
              name: z.string().describe('Merge tag name'),
              content: z.string().describe('Merge tag value'),
            }),
          )
          .optional()
          .describe('Merge tags for personalization'),
        attachments: z
          .array(
            z.object({
              type: z.string().describe('MIME type'),
              name: z.string().describe('File name'),
              content: z.string().describe('Base64 encoded content'),
            }),
          )
          .optional()
          .describe('File attachments'),
        options: z
          .object({
            click_tracking: z.boolean().optional(),
            open_tracking: z.boolean().optional(),
          })
          .optional()
          .describe('Tracking options'),
      },
    },
    async ({
      subject,
      from_name,
      from_email,
      reply_to,
      text,
      html,
      to,
      global_merge_vars,
      attachments,
      options,
    }) => {
      const message: Record<string, unknown> = {
        subject,
        from_name,
        from_email,
        to,
      };
      if (reply_to) message.reply_to = reply_to;
      if (text) message.text = text;
      if (html) message.html = html;
      if (global_merge_vars) message.global_merge_vars = global_merge_vars;
      if (attachments) message.attachments = attachments;
      if (options) message.options = options;

      const response = await ecomail.post<any>('/transactional/send-message', {
        message,
      });

      const r = response.results;
      return {
        content: [
          {
            type: 'text',
            text: `Transactional email sent!\nID: ${r.id}\nAccepted: ${r.total_accepted_recipients}\nRejected: ${r.total_rejected_recipients}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'send-transactional-template',
    {
      title: 'Send Transactional Template',
      description:
        'Send a transactional email using a pre-defined template. Requires a paid account with a verified sending domain.',
      inputSchema: {
        template_id: z.number().describe('ID of the template to use'),
        subject: z.string().describe('Email subject line'),
        from_name: z.string().describe("Sender's display name"),
        from_email: z
          .email()
          .describe("Sender's email (must be from a verified domain)"),
        reply_to: z.email().optional().describe('Reply-to email address'),
        to: z
          .array(
            z.object({
              email: z.email().describe("Recipient's email"),
              name: z.string().optional().describe("Recipient's name"),
              cc: z.email().optional().describe('CC email'),
              bcc: z.email().optional().describe('BCC email'),
            }),
          )
          .min(1)
          .describe('Array of recipients'),
        global_merge_vars: z
          .array(
            z.object({
              name: z.string().describe('Merge tag name'),
              content: z.string().describe('Merge tag value'),
            }),
          )
          .optional()
          .describe('Merge tags for personalization'),
        attachments: z
          .array(
            z.object({
              type: z.string().describe('MIME type'),
              name: z.string().describe('File name'),
              content: z.string().describe('Base64 encoded content'),
            }),
          )
          .optional()
          .describe('File attachments'),
        options: z
          .object({
            click_tracking: z.boolean().optional(),
            open_tracking: z.boolean().optional(),
          })
          .optional()
          .describe('Tracking options'),
      },
    },
    async ({
      template_id,
      subject,
      from_name,
      from_email,
      reply_to,
      to,
      global_merge_vars,
      attachments,
      options,
    }) => {
      const message: Record<string, unknown> = {
        template_id,
        subject,
        from_name,
        from_email,
        to,
      };
      if (reply_to) message.reply_to = reply_to;
      if (global_merge_vars) message.global_merge_vars = global_merge_vars;
      if (attachments) message.attachments = attachments;
      if (options) message.options = options;

      const response = await ecomail.post<any>('/transactional/send-template', {
        message,
      });

      const r = response.results;
      return {
        content: [
          {
            type: 'text',
            text: `Transactional template email sent!\nID: ${r.id}\nTemplate: ${template_id}\nAccepted: ${r.total_accepted_recipients}\nRejected: ${r.total_rejected_recipients}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-transactional-stats',
    {
      title: 'Transactional Email Stats',
      description:
        'Get statistics for transactional emails for the past 6 months.',
      inputSchema: {},
    },
    async () => {
      const response = await ecomail.get<any>('/transactional/stats');

      const s = response.stats;
      let text = 'Transactional Email Statistics (past 6 months):\n';
      text += `  Injected: ${s.count_injected}\n`;
      text += `  Accepted: ${s.count_accepted}\n`;
      text += `  Delivered: ${s.count_delivered}\n`;
      text += `  Opens: ${s.count_unique_rendered} unique (${s.count_rendered} total)\n`;
      text += `  Open Rate: ${s.open_rate}%\n`;
      text += `  Clicks: ${s.count_unique_clicked} unique (${s.count_clicked} total)\n`;
      text += `  Click Rate: ${s.click_rate}%\n`;
      text += `  Bounces: ${s.count_bounce} (hard: ${s.count_hard_bounce}, soft: ${s.count_soft_bounce})\n`;
      text += `  Bounce Rate: ${s.bounce_rate}%\n`;
      text += `  Rejected: ${s.count_rejected}\n`;
      text += `  Spam Complaints: ${s.count_spam_complaint}`;

      return { content: [{ type: 'text', text }] };
    },
  );

  server.registerTool(
    'get-doi-stats',
    {
      title: 'Double Opt-in Stats',
      description:
        'Get statistics for double opt-in emails for the past 6 months.',
      inputSchema: {},
    },
    async () => {
      const response = await ecomail.get<any>('/transactional/stats/doi');

      const s = response.stats;
      let text = 'Double Opt-in Statistics (past 6 months):\n';
      text += `  Injected: ${s.count_injected}\n`;
      text += `  Accepted: ${s.count_accepted}\n`;
      text += `  Delivered: ${s.count_delivered}\n`;
      text += `  Opens: ${s.count_unique_rendered} unique (${s.count_rendered} total)\n`;
      text += `  Open Rate: ${s.open_rate}%\n`;
      text += `  Clicks: ${s.count_unique_clicked} unique (${s.count_clicked} total)\n`;
      text += `  Click Rate: ${s.click_rate}%\n`;
      text += `  Bounces: ${s.count_bounce} (hard: ${s.count_hard_bounce}, soft: ${s.count_soft_bounce})\n`;
      text += `  Bounce Rate: ${s.bounce_rate}%\n`;
      text += `  Rejected: ${s.count_rejected}\n`;
      text += `  Spam Complaints: ${s.count_spam_complaint}`;

      return { content: [{ type: 'text', text }] };
    },
  );
}
