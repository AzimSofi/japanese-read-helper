import * as fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function readPublicTxt(fileName: string): Promise<string> {
    const filePath = path.join(process.cwd(), "public", `${fileName}.txt`);
    try {
        return await fs.readFile(filePath, "utf8");
    } catch {
        return "";
    }
}


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");
    if (!fileName) {
        return NextResponse.json({ text: "" });
    }
    const content = await readPublicTxt(fileName);
    return NextResponse.json({ text: content });
}
