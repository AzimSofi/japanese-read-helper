import fs from "fs";
import path from "path";
import CollapsibleItem from "./CollapsibleItem";
import { parseMarkdown } from "../lib/parserMarkdown";

export default function Home() {
  let inputSentence = "";

  //　例
  inputSentence = `
<膨大な資料を短時間で読み解くための
「仮説」と「異常値」
>>大量の資料を短い時間で理解するために使う
「仮説」と「例外」
>>たくさんの資料を短い時間で理解するヒントは
「仮説」と「普通ではないこと」
>>資料を早く読むコツは「仮説」と「異常値」
    `;

  const filePath = path.join(process.cwd(), "public", "text.txt");
  inputSentence = fs.readFileSync(filePath, "utf8");

  return (
    <div className="mx-36 my-5">
      {parseMarkdown(inputSentence).map((item, index) => (
        <CollapsibleItem
          key={index}
          head={item.head}
          subItems={item.subItems}
        />
      ))}
    </div>
  );
}
