export async function sendOtpEmail(email: string, otp: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || "peaceogunbowale@gmail.com";

  if (!apiKey) {
    throw new Error("Missing BREVO_API_KEY in environment variables.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "OAU FaaS Security",
        email: senderEmail,
      },
      to: [{ email }],
      subject: `${otp} is your OAU FaaS Access Code`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <body style="margin: 0; padding: 24px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 460px; margin: auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; color: #ffffff;">
              <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 11px; letter-spacing: 1px; margin-bottom: 20px;">
                OAU FaaS
              </div>
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800;">External Tester Access</h2>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 24px 0;">
                Use the one-time authentication code below to access the OAU FaaS testing workspace. This code is valid for 10 minutes.
              </p>
              <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #818cf8;">
                  ${otp}
                </span>
              </div>
              <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
                Obafemi Awolowo University Institutional Forms as a Service. If you did not request this, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Brevo API error:", errorBody);
    throw new Error(`Brevo API responded with status ${response.status}`);
  }

  return response.json();
}
