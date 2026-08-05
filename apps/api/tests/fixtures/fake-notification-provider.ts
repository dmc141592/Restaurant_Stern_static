import type {
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
} from '../../src/providers/email/notification-provider.js';

/** Records every message it was asked to send, instead of contacting SMTP. */
export class FakeNotificationProvider implements NotificationProvider {
  readonly sent: NotificationMessage[] = [];

  async send(message: NotificationMessage): Promise<NotificationResult> {
    this.sent.push(message);
    return { success: true, providerMessageId: `fake-${this.sent.length}` };
  }
}

/** Simulates a completely unreachable SMTP server (e.g. outage). */
export class AlwaysFailingNotificationProvider implements NotificationProvider {
  attempts = 0;

  async send(_message: NotificationMessage): Promise<NotificationResult> {
    this.attempts += 1;
    return { success: false, errorMessage: 'SMTP-Verbindung fehlgeschlagen (simuliert).' };
  }
}
