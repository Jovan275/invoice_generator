import "server-only";
import type { Attachment, CreateEmailResponse } from "resend";
import { sanitizeHeaderValue } from "@/lib/sanitize";
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

function sanitizeHeaderValues(
  value: string | string[] | undefined
): string | string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeHeaderValue);
  }

  return sanitizeHeaderValue(value);
}

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
    from: sanitizeHeaderValue(
      from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL
    ),
    to: sanitizeHeaderValues(to)!,
    subject: sanitizeHeaderValue(subject),
    html,
    cc: sanitizeHeaderValues(cc),
    bcc: sanitizeHeaderValues(bcc),
    replyTo: sanitizeHeaderValues(replyTo),
    attachments,
  });

  if (result.error) {
    throw new Error("Failed to send email.");
  }

  return result;
};
