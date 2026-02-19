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
        const { gmailUser, gmailPass, subject, recipients, message } = req.body;

        if (!gmailUser || !gmailPass || !recipients || !message) {
            return res.status(400).json({ msg: "❌ All fields are required" });
        }

        const emailSubject = subject || "Bulk Message";

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

        for (let email of emails) {
            await transporter.sendMail({
                from: gmailUser,
                to: email,
                subject: emailSubject,
                text: message
            });

            await new Promise(r => setTimeout(r, 2000));
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
