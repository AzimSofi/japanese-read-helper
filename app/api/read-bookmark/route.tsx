import * as fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { json } from "stream/consumers";

const bookmarkFileName = 'bookmark.json';

export async function GET(request: Request) {
    try {
        const content = await fs.readFile(path.join(process.cwd(), "public", bookmarkFileName), "utf8");
        const json = JSON.parse(content);
        return NextResponse.json({ text: json["text-1"] || "" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
