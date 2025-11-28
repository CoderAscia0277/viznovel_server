import { NextRequest,NextResponse } from "next/server";

export function proxy(req:NextRequest){
    console.log(req.nextUrl);
    const res = NextResponse.next();
    res.headers.append('Access-Control-Allow-Origin','*');
    res.headers.append("Access-Control-Allow-Credentials","true" );
    res.headers.append("Access-Control-Allow-Methods","GET,POST,OPTIONS");
    
    return res
}
export const config = {
    matcher:['/api/:path*']
}