import { NextApiRequest, NextApiResponse } from "next";
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert("google-services.json"),
});

async function verifyFirebaseToken(idToken: string) {
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("Verified UID:", decoded.uid);
    return decoded; // contains uid, email, name, picture, etc.
  } catch (error) {
    console.error("Invalid token", error);
    throw new Error("Unauthorized");
  }
}


export default async function handler(req:NextApiRequest, res:NextApiResponse) {
    const { idToken } = req.body;
    try {
    const user = await verifyFirebaseToken(idToken);

    // Now you can:
    // - Create/find user in DB
    // - Issue your own access + refresh tokens
    // - Start a session

    res.json({
      uid: user.uid,
      email: user.email,
    });
    
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
  
}