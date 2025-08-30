import fs from "fs";
import path from "path";

export function writePublicTxt(inputText: string) {
    const filePath = path.join(process.cwd(), "public", "text.txt");
    fs.writeFileSync(filePath, inputText);    
}
