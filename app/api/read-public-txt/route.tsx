import * as fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function readPublicTxt(): Promise<string> {
    const filePath = path.join(process.cwd(), "public", "text.txt");
    return (await fs.readFile(filePath, "utf8")) || "";
}

export async function GET() {
    try {
        const content = await readPublicTxt();
        return NextResponse.json({ text: content });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error }, { status: 500 });
    }
}
