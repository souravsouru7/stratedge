const nodemailer = require("nodemailer");

/**
 * Send an OTP email to the user
 * @param {string} email - Recipient email
 * @param {string} otp - The 6-digit OTP
 */
exports.sendOTPEmail = async (email, otp) => {
  try {
    // Note: SMTP credentials should be set in .env
    // These are placeholders - if not provided, the service will log the OTP to console for dev
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Stratedge Support" <${process.env.SMTP_USER || "no-reply@stratedge.live"}>`,
      to: email,
      subject: "Your Stratedge Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0d9e6e; text-align: center;">STRATEDGE AI</h2>
          <p>Hello,</p>
          <p>You requested a password reset. Use the following 6-digit One-Time Password (OTP) to reset your password. This OTP is valid for 10 minutes.</p>
          <div style="background-color: #f0fdf9; border: 1px dashed #0d9e6e; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="color: #0d9e6e; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 Stratedge. All rights reserved.</p>
        </div>
      `,
    };

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials missing. Logging OTP to console for development:");
      console.log(`[DEV] OTP for ${email}: ${otp}`);
      return true;
    }

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // In dev, we might still want to see the OTP even if mail failed
    console.log(`[DEV-FALLBACK] OTP for ${email}: ${otp}`);
    throw new Error("Failed to send OTP email");
  }
};
