import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function writePublicTxt(inputText: string) {
    const filePath = path.join(process.cwd(), "public", "text.txt");
    await fs.writeFile(filePath, inputText);    
}

export async function POST(request: Request) {
    try{
        const content = await request.json();
        await writePublicTxt(content.text);
        return NextResponse.json({ message: "おけです！"})
    } catch(e){
        return NextResponse.json(e);
    }
}