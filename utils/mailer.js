import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS,
  },
  from: process.env.ZOHO_USER,
});

export const verifySMTP = () => {
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ SMTP connection error:", error);
    } else {
      console.log("✅ SMTP server is ready:", success);
    }
  });
};

export const sendMail = async ({ to, subject, text, html, attachments, cc, bcc }) => {
  try {
    const fallbackEmail = "accounts@globalplugin.com";
    const recipient = (to && to.trim()) ? to.trim() : fallbackEmail;

    if (!recipient) {
      console.error("❌ sendMail called with no valid recipient. Skipping send.");
      return null;
    }

    const mailOptions = {
      from: `"Hemant K" <${process.env.ZOHO_USER}>`,
      to: recipient,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to: ${recipient} | Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return null;
  }
};

