import * as fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function readPublicTxt(fileName: string): Promise<string> {
    const filePath = path.join(process.cwd(), "public", `${fileName}.txt`);
    return (await fs.readFile(filePath, "utf8")) || "";
}


export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fileName = searchParams.get("fileName");
        if (!fileName) {
            return NextResponse.json({ error: "fileName query parameter is required" }, { status: 400 });
        }
        const content = await readPublicTxt(fileName);
        return NextResponse.json({ text: content });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
