/** Masks personal data so it can appear in logs/error details without leaking it. */

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length <= 4) {
    return '*'.repeat(digits.length);
  }
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskName(name: string): string {
  if (name.length <= 1) {
    return '*';
  }
  return `${name.slice(0, 1)}${'*'.repeat(name.length - 1)}`;
}
