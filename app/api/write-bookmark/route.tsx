import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  const { target, content } = await request.json();

  const filePath = path.join(process.cwd(), 'public', 'bookmark.json');
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  json[target] = content;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
  return NextResponse.json({ success: true });
}