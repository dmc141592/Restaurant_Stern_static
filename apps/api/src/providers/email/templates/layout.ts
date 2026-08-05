export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { escapeHtml };

export interface EmailRow {
  label: string;
  value: string;
}

export interface EmailAction {
  label: string;
  url: string;
  variant: 'primary' | 'secondary';
}

export function renderLayout(options: {
  preheader?: string;
  title: string;
  intro: string;
  rows: EmailRow[];
  noteLabel?: string;
  noteValue?: string;
  actions?: EmailAction[];
  footerNote?: string;
}): { html: string; text: string } {
  const rowsHtml = options.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 0;color:#6b6b6b;font-size:14px;width:160px;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join('');

  const noteHtml =
    options.noteLabel !== undefined
      ? `
        <tr>
          <td style="padding:6px 0;color:#6b6b6b;font-size:14px;width:160px;vertical-align:top;">${escapeHtml(options.noteLabel)}</td>
          <td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${escapeHtml(options.noteValue ?? '')}</td>
        </tr>`
      : '';

  const actionsHtml =
    options.actions && options.actions.length > 0
      ? `
      <table role="presentation" width="100%" style="margin-top:24px;">
        <tr>
          ${options.actions
            .map((action) => {
              const bg = action.variant === 'primary' ? '#1f6f43' : '#b3261e';
              return `<td style="padding-right:12px;">
                <a href="${escapeHtml(action.url)}"
                   style="display:inline-block;padding:12px 20px;background:${bg};color:#ffffff;
                          text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
                  ${escapeHtml(action.label)}
                </a>
              </td>`;
            })
            .join('')}
        </tr>
      </table>`
      : '';

  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f2ee;font-family:Georgia,'Times New Roman',serif;">
    ${options.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(options.preheader)}</div>` : ''}
    <table role="presentation" width="100%" style="background:#f4f2ee;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" style="background:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td>
                <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 16px;">Restaurant Sternen Albisrieden</h1>
                <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px;">${escapeHtml(options.title)}</h2>
                <p style="font-size:14px;color:#333333;line-height:1.5;margin:0 0 20px;">${escapeHtml(options.intro)}</p>
                <table role="presentation" width="100%" style="border-top:1px solid #e5e0d8;border-bottom:1px solid #e5e0d8;padding:8px 0;">
                  ${rowsHtml}
                  ${noteHtml}
                </table>
                ${actionsHtml}
                ${
                  options.footerNote
                    ? `<p style="font-size:12px;color:#8a8a8a;margin-top:24px;">${escapeHtml(options.footerNote)}</p>`
                    : ''
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    options.title,
    '',
    options.intro,
    '',
    ...options.rows.map((row) => `${row.label}: ${row.value}`),
    ...(options.noteLabel !== undefined ? [`${options.noteLabel}: ${options.noteValue ?? ''}`] : []),
    ...(options.actions && options.actions.length > 0
      ? ['', ...options.actions.map((action) => `${action.label}: ${action.url}`)]
      : []),
    ...(options.footerNote ? ['', options.footerNote] : []),
  ];

  return { html, text: textLines.join('\n') };
}
