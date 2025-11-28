import { NextApiRequest,NextApiResponse } from "next";
import client_promise from '../../lib/mongodb_sample';
export default async function handler(req:NextApiRequest,res:NextApiResponse){

    const client  = await client_promise;
    const db = client.db("sample_mflix");
    const collection = db.collection("users");
    const products = await collection.find({}).toArray();
    
    return res.json({message:products})
}