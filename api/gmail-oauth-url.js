import { google } from "googleapis";

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export default async function handler(req, res) {
  try {
    const clientId = getEnv("GOOGLE_CLIENT_ID");
    const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/api/gmail-oauth-callback";

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/gmail.modify"],
      // keep it simple for now; callback will store refresh token
    });

    return res.status(200).json({
      success: true,
      redirectUri,
      url,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

