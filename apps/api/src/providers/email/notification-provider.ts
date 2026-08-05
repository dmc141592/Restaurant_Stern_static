export interface NotificationMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface NotificationResult {
  success: boolean;
  providerMessageId?: string;
  errorMessage?: string;
}

/**
 * Abstraction the reservation/notification services depend on. The
 * reservation service must never import Nodemailer (or any other transport)
 * directly, so a different provider — or a future POS/CRM push — can be
 * swapped in without touching business logic.
 */
export interface NotificationProvider {
  send(message: NotificationMessage): Promise<NotificationResult>;
}
