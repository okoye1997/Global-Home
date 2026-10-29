export function mailHtmlFromText(body: string) {
  const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#102c44;line-height:1.6;white-space:pre-wrap">${safe}</div>`;
}

export function smtpPort(value: string) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP port');
  return port;
}
