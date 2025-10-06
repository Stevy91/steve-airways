// utils/sendEmail.ts
import fetch from "node-fetch";

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = "api-3E50B3ECEA894D1E8A8FFEF38495B5C4";
  const sender = 'info@kashapw.com';

  if (!apiKey || !sender) {
    console.error("SMTP2GO API key or sender missing in environment variables");
    return;
  }

  const payload = {
    api_key: apiKey,
    sender,
    to: [to],
    subject,
    html_body: html,
  };

  try {
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("SMTP2GO response:", data);
  } catch (err) {
    console.error("Erreur lors de l’envoi de l’email:", err);
  }
}
