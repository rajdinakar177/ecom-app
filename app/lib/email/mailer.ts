
import Mailgen from "mailgen";
import { BrevoClient } from "@getbrevo/brevo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "YourStore";
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || "noreply@yourstore.com";

/**
 * Initialise Brevo API client.
 * Call this inside each send function — not at module level —
 * so it only runs server-side (Next.js can try to bundle mailer on the client).
 */
const brevo = new BrevoClient({
    apiKey: () => {
        const key = process.env.BREVO_API_KEY;

        if (!key) {
            throw new Error("BREVO_API_KEY is not set");
        }

        return key;
    },

    timeoutInSeconds: 30,
    maxRetries: 3,
});

// ---------------------------------------------------------------------------
// Verification Email
// ---------------------------------------------------------------------------

interface VerificationEmailOptions {
    email: string;
    firstName: string;
    token: string; // RAW token — goes in the URL
}

export async function sendVerificationEmail({
    email,
    firstName,
    token,
}: VerificationEmailOptions): Promise<void> {
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;



    const mailgen = new Mailgen({
        theme: "default",
        product: { name: APP_NAME, link: APP_URL },
    });

    const emailBody = mailgen.generate({
        body: {
            name: firstName,
            intro: "Welcome! Please verify your email address.",
            action: {
                instructions: "Click the button below to verify your email:",
                button: { color: "#22BC66", text: "Verify Email", link: verifyUrl },
            },
            outro: "This link expires in 24 hours. If you didn't create an account, ignore this email.",
        },
    });


    await brevo.transactionalEmails.sendTransacEmail({
        sender: { name: APP_NAME, email: FROM_EMAIL },
        to: [{ email, name: firstName }],
        subject: `Verify your ${APP_NAME} account`,
        htmlContent: emailBody,
    });


    // Development stub — logs the link so you can test without an email provider
    console.log(`\n📧 [DEV] Verification Email → ${email}`);
    console.log(`   Link: ${verifyUrl}\n`);
}

// ---------------------------------------------------------------------------
// Password Reset Email
// ---------------------------------------------------------------------------

interface PasswordResetEmailOptions {
    email: string;
    firstName: string;
    token: string; // RAW token — goes in the URL
}

export async function sendPasswordResetEmail({
    email,
    firstName,
    token,
}: PasswordResetEmailOptions): Promise<void> {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;



    const mailgen = new Mailgen({
        theme: "default",
        product: { name: APP_NAME, link: APP_URL },
    });

    const emailBody = mailgen.generate({
        body: {
            name: firstName,
            intro: "You requested a password reset.",
            action: {
                instructions: "Click the button below to reset your password:",
                button: { color: "#FF6B6B", text: "Reset Password", link: resetUrl },
            },
            outro: "This link expires in 1 hour. If you didn't request this, ignore this email.",
        },
    });

    await brevo.transactionalEmails.sendTransacEmail({
        sender: { name: APP_NAME, email: FROM_EMAIL },
        to: [{ email, name: firstName }],
        subject: `Reset your ${APP_NAME} password`,
        htmlContent: emailBody,
    });


    console.log(`\n📧 [DEV] Password Reset Email → ${email}`);
    console.log(`   Link: ${resetUrl}\n`);
}