import { NextApiRequest, NextApiResponse } from "next";
import client_promise from '../../lib/mongodb_sample';
import crypto from "crypto";
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { ObjectId } from "mongodb";


dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;

interface RefreshToken {
  token: string;       // raw token (give to client)
  hashed: string;      // hashed version (store in DB)
  expiresAt: Date;     // expiry timestamp
}

function createRefreshToken(ttlDays = 30): RefreshToken {
  const raw = crypto.randomBytes(48).toString("base64url");
  const hashed = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  return { token: raw, hashed, expiresAt };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 
  if (req.method == "GET") {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond to preflight
  }
  if (!SECRET_KEY) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }
  
  const client = await client_promise;
  const db = client.db('MyServer');
  const users = db.collection('users');
  const {refreshToken,userId} = req.body;
  console.log("Received refreshToken:", refreshToken);
  console.log("Received userId:", userId);
  try{
    const id = new ObjectId(userId);
    const user = await users.findOne({ _id: id });// from DB
    if (!user) {
      return res.status(400).json({ message: 'invalid user' });
    }
    const hashedIncoming = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // Validate
    if (hashedIncoming !== user.refreshToken || new Date() > new Date(user.refreshTokenExpiry)) {
        return res.status(400).json({ message: "invalid or expired refresh token" });
    }

    // Generate new tokens
    const newRefresh = createRefreshToken(7);

    await users.updateOne(
        { _id: user._id },
        { $set: { refreshToken: newRefresh.hashed, refreshTokenExpiry: newRefresh.expiresAt } }
    );

    const accessToken = jwt.sign(
        { userId: user._id, email: user.email, username: user.username, role: user.role },
          SECRET_KEY,
          { expiresIn: '15m' }
    );
       
    return res.status(200).json({ message: 'successful',userCredentials:{ userId: user._id,email: user.email,username: user.username,role: user.role, refreshToken: newRefresh.token}, accessToken });
    
  }catch(err){
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }

}