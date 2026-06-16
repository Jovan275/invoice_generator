import "server-only";
import type { Attachment, CreateEmailResponse } from "resend";
import { getResendClient } from "./client";

const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  attachments?: Attachment[];
};

export const sendEmail = async ({
  to,
  subject,
  html,
  from,
  cc,
  bcc,
  replyTo,
  attachments,
}: SendEmailParams): Promise<CreateEmailResponse> => {
  const resend = getResendClient();

  const result = await resend.emails.send({
    from: from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL,
    to,
    subject,
    html,
    cc,
    bcc,
    replyTo,
    attachments,
  });

  if (result.error) {
    throw new Error(`Failed to send email: ${result.error.message}`);
  }

  return result;
};
