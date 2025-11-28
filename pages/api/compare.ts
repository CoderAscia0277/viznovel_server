import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from 'bcrypt';

export default async function handler(req:NextApiRequest,res:NextApiResponse){
    if(req.method === 'GET'){
        const {input,hash} = req.body
        
        const isMatch = await bcrypt.compare(input,hash);

        if(isMatch){
            return res.status(200).json({result:'match!'});
        }else{
            return res.status(401).json({result:'not match'});
        }

    }
}