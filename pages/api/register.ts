import { NextApiRequest,NextApiResponse } from "next";
import client_promise from '../../lib/mongodb_sample';
import bcrypt from 'bcrypt';
export default async function handler(req:NextApiRequest,res:NextApiResponse){

    const client  = await client_promise;
    const db = client.db("MyServer");
    const users = db.collection("users");
    // const products = await collection.find({}).toArray();
    
    // return res.json({message:products})

    const {username,email,password} = req.body;

    if(req.method === 'POST'){
        const salt_rounds = 10;
        const pass_hash = await bcrypt.hash(password,salt_rounds);

        const isExitingEmail = await users.findOne({"email":email});

        if(isExitingEmail){
            return res.status(401).json({"message":"existing email"});
        }

        await users.insertOne({
            "username":username,
            "email":email,
            "password":pass_hash
        });
        
        return res.status(200).json({"message":"added successfully"});
    }else{
        return res.status(401).json({"message":"unauthorized"});
    }
}