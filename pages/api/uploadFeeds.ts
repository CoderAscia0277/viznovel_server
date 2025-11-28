import formidable , {File} from 'formidable';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { NextApiRequest,NextApiResponse } from 'next';

export const config = {
    api : {
        bodyParser : false
    }
};

export default async function handler(req:NextApiRequest,res:NextApiResponse){
    if(req.method != "POST"){
        return res.status(405).send('Invalid method');
    }
    
    const authHeader = req.headers.authorization;
    const token = authHeader!.split(' ')[1];
    let decoded;

    if (!process.env.SECRET_KEY) {
       throw new Error('SECRET_KEY is not defined in environment variables');
    }

    try{
         decoded = jwt.verify(token, process.env.SECRET_KEY);
         
         if(decoded){
            const form = formidable({
                uploadDir:'./public/uploads',
                keepExtensions:true,
                multiples: false,
            });

            const data = new Promise((resolve,reject)=> {
                form.parse(req, async (err, fields, files) => {
                    if (err) {
                        console.error('Error parsing form:', err);
                        reject();
                        // return res.status(500).json({ error: 'Form parsing failed' });
                    }
    
                    const imageField = files.image;

                    if (!imageField) {
                        return res.status(400).json({ error: 'No image uploaded' });
                    }

                    const image: File = Array.isArray(imageField) ? imageField[0] : imageField;
                    const oldPath = image.filepath;
                    const newFileName = `${Date.now()}-${image.originalFilename}`;
                    const newPath = path.join('public/uploads', newFileName);

                    fs.rename(oldPath, newPath, (err) => {
                        if (err) return res.status(500).json({ error: 'Rename failed' });
                    });

                    resolve(newFileName);

                });
            }); 
            console.log(await data);
            res.status(200).json({ message: 'Upload successful', filename: await data });
        }else{
            res.status(500).json({ error: 'Invalid token' });
        }
    }catch(err){
          res.status(401).json({error:'Invalid token'});
    }

    // res.status(200).json({message:data});
}




