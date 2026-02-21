const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Login route
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const adminUser = (process.env.ADMIN_USERNAME || "").trim();
    const adminPass = (process.env.ADMIN_PASSWORD || "").trim();

    if (username.trim() === adminUser && password.trim() === adminPass) {
        return res.json({ msg: "✅ Login successful" });
    } else {
        return res.status(401).json({ msg: "❌ Invalid credentials" });
    }
});

// Send mail route
app.post("/send", async (req, res) => {
    try {
        const { gmailUser, gmailPass, senderName, subject, recipients, message } = req.body;

        if (!gmailUser || !gmailPass || !recipients || !message) {
            return res.status(400).json({ msg: "❌ All fields are required" });
        }

        const emailSubject = subject || "Bulk Message";
        const fromName = senderName ? senderName.trim() : "Support";

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });

        const emails = recipients
            .split(",")
            .map(e => e.trim())
            .filter(e => e !== "");

        if (emails.length === 0) {
            return res.status(400).json({ msg: "❌ No valid recipient emails found" });
        }

        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const messageId = `<${Date.now()}.${Math.floor(Math.random() * 10000)}@gmail.com>`;

            await transporter.sendMail({
                from: `"${fromName}" <${gmailUser}>`,
                to: email,
                subject: emailSubject,
                text: message,
                headers: {
                    'Message-ID': messageId,
                    'Date': new Date().toUTCString(),
                    'X-Mailer': 'Professional Mailer 1.0',
                    'List-Unsubscribe': `<mailto:${gmailUser}?subject=unsubscribe>`
                }
            });

            console.log(`✅ Sent to: ${email} (${i + 1}/${emails.length})`);

            // Randomized delay between 2 to 5 seconds to look human-like
            if (i < emails.length - 1) {
                const delay = Math.floor(Math.random() * 3000) + 2000;
                await new Promise(r => setTimeout(r, delay));
            }
        }

        return res.json({ msg: "✅ Emails sent successfully!" });

    } catch (err) {
        console.error(err);

        let errorMsg = "❌ Error: ";

        if (err.code === "EAUTH" || err.responseCode === 535) {
            errorMsg += "Invalid Gmail App Password.";
        } else {
            errorMsg += err.message;
        }

        return res.status(500).json({ msg: errorMsg });
    }
});

// Export app for Vercel
module.exports = app;

// Local server for testing
if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    // In local mode, we need to serve static files
    app.use(express.static(path.join(__dirname, "../Public")));
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../Public/index.html"));
    });

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
