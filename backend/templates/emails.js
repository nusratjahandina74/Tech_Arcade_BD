// Table-based layout with inline styles on purpose — this is what actually
// renders consistently across Gmail, Outlook, and mobile mail clients.
// Modern CSS (flexbox, external stylesheets, custom fonts) is unreliable in
// email, so we deliberately keep this old-school.

const BRAND = {
  ink: "#0D1321",
  copper: "#E0A458",
  paper: "#F7F5F0",
  border: "#E5E2D9",
  text: "#333333",
  muted: "#888888",
};

function emailShell({ preheader, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tech Arcade BD</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.paper};font-family:Arial,Helvetica,sans-serif;">
  <!-- Preheader text (hidden preview shown in inbox list) -->
  <div style="display:none;max-height:0;overflow:hidden;">${preheader || ""}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.paper};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${BRAND.border};">
          <tr>
            <td style="background-color:${BRAND.ink};padding:24px 32px;">
              <span style="color:${BRAND.copper};font-size:20px;font-weight:bold;letter-spacing:0.3px;">Tech Arcade BD</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:${BRAND.paper};padding:16px 32px;text-align:center;border-top:1px solid ${BRAND.border};">
              <span style="font-size:11px;color:${BRAND.muted};">© ${new Date().getFullYear()} TechArcade. All rights reserved.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(url, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:6px;background-color:${BRAND.copper};">
        <a href="${url}" style="display:inline-block;padding:13px 30px;font-size:14px;font-weight:bold;color:${BRAND.ink};text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function passwordResetEmail({ name, resetUrl }) {
  const bodyHtml = `
    <h1 style="font-size:20px;color:${BRAND.ink};margin:0 0 16px;">Password reset request</h1>
    <p style="font-size:14px;color:${BRAND.text};line-height:1.6;margin:0;">
      Hi ${name || "there"}, we received a request to reset the password on your TechArcade account.
      Click the button below to choose a new one. This link expires in <strong>30 minutes</strong>.
    </p>
    ${button(resetUrl, "Reset your password")}
    <p style="font-size:12px;color:${BRAND.muted};line-height:1.6;margin:0;">
      If the button doesn't work, copy and paste this link into your browser:<br />
      <a href="${resetUrl}" style="color:${BRAND.copper};word-break:break-all;">${resetUrl}</a>
    </p>
    <p style="font-size:12px;color:${BRAND.muted};line-height:1.6;margin:16px 0 0;">
      If you didn't request this, you can safely ignore this email — your password will stay unchanged.
    </p>
  `;
  return emailShell({ preheader: "Reset your TechArcade password — link expires in 30 minutes.", bodyHtml });
}

function passwordChangedEmail({ name }) {
  const bodyHtml = `
    <h1 style="font-size:20px;color:${BRAND.ink};margin:0 0 16px;">Your password was changed</h1>
    <p style="font-size:14px;color:${BRAND.text};line-height:1.6;margin:0;">
      Hi ${name || "there"}, this confirms your TechArcade account password was just changed.
      All other devices have been logged out for your security.
    </p>
    <p style="font-size:12px;color:${BRAND.muted};line-height:1.6;margin:16px 0 0;">
      If this wasn't you, please contact support immediately.
    </p>
  `;
  return emailShell({ preheader: "Your TechArcade password was changed.", bodyHtml });
}

module.exports = { passwordResetEmail, passwordChangedEmail };
