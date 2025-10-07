import logger from "./utils/logger";

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = "api-3E50B3ECEA894D1E8A8FFEF38495B5C4";
  const sender = "info@kashapw.com";

  if (!apiKey || !sender) {
    logger.error("❌ SMTP2GO API key or sender missing");
    return;
  }

  const payload = {
    api_key: apiKey,
    from: sender,
    to: [{ email: to }],
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

    if (data.data && data.data.succeeded && data.data.succeeded.length > 0) {
      logger.info(`✅ Email envoyé à ${to} | Sujet: ${subject}`);
    } else {
      logger.error(
        `⚠️ Échec d'envoi à ${to} | Réponse SMTP2GO: ${JSON.stringify(data)}`
      );
    }
  } catch (err: any) {
    logger.error(`🚨 Erreur envoi mail à ${to}: ${err.message}`);
  }
}
