require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (username === adminUser && password === adminPass) {
        res.json({ msg: "✅ Login successful" });
    } else {
        res.status(401).json({ msg: "❌ Invalid credentials" });
    }
});

app.post("/send", async (req, res) => {
    try {
        const { gmailUser, gmailPass, subject, recipients, message } = req.body;

        if (!gmailUser || !gmailPass || !recipients || !message) {
            return res.status(400).json({ msg: "❌ All fields are required" });
        }

        const emailSubject = subject || "Bulk Message";

        // Create a dynamic transporter using the provided credentials
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });

        const emails = recipients.split(",").map(e => e.trim()).filter(e => e !== "");
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

            await new Promise(r => setTimeout(r, 2000)); // 2 sec delay
        }

        res.json({ msg: "✅ Emails sent successfully!" });
    } catch (err) {
        console.error("Server Error:", err);

        let errorMsg = "❌ Error: ";

        if (err.code === "EAUTH" || err.responseCode === 535) {
            errorMsg += "Invalid Gmail credentials. Make sure you're using an App Password, not your regular password.";
        } else if (err.message && err.message.includes("Authentication")) {
            errorMsg += "Authentication failed. Enable 2-Step Verification and create an App Password.";
        } else {
            errorMsg += err.message || "An unknown error occurred on the server.";
        }

        if (!res.headersSent) {
            res.status(500).json({ msg: errorMsg });
        }
    }
});

app.use(express.static("Public"));

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
