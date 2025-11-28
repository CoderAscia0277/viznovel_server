import { NextApiRequest, NextApiResponse } from "next";
import client_promise from '../../lib/mongodb_sample';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from "crypto";
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

interface RefreshToken {
  token: string;       // raw token (give to client)
  hashed: string;      // hashed version (store in DB)
  expiresAt: Date;     // expiry timestamp
}

// Generate a refresh token with expiry
function createRefreshToken(ttlDays = 30): RefreshToken {
  const raw = crypto.randomBytes(48).toString("base64url");
  const hashed = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  return { token: raw, hashed, expiresAt };
}

// Example usage

// console.log("Raw token (send to client):", refresh.token);
// console.log("Hashed token (store in DB):", refresh.hashed);
// console.log("Expires at:", refresh.expiresAt);


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
  const { email, pass } = req.body;

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'invalid email' });
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'invalid password' });
    }

    const refresh = createRefreshToken(7); // 7-day expiry
    await users.updateOne(
      { _id: user._id },
      { $set: { refreshToken: refresh.hashed, refreshTokenExpiry: refresh.expiresAt } }
    );
    console.log(refresh.token);
    const loginCredentials = { userId: user._id,email: user.email,username: user.username,role: user.role, };
    const token = jwt.sign(loginCredentials, SECRET_KEY, { expiresIn: '5m' });
    
   
   

    return res.status(200).json({ message: 'successful',loginCredentials:loginCredentials, token , refreshToken: refresh.token});

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `Server error: ${err}` });
  }
}
