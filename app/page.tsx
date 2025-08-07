import fs from "fs";
import path from "path";
import CollapsibleItem from "./CollapsibleItem";

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

  // const filePath = path.join(process.cwd(), 'public', 'text.txt');
  // inputSentence = fs.readFileSync(filePath, 'utf8');

  interface ParsedItem {
    head: string;
    subItems: string[];
  }

  function parseMarkdown(text: string): ParsedItem[] {
    const splitByLines = text.split("\n");
    const headingPrefix = "<";
    const subItemPrefix = ">>";
    const parsedData: ParsedItem[] = [];
    let previousLine = "";
    let currentHeadItem: ParsedItem | null = null;

    splitByLines.forEach((line) => {
      if (line.startsWith(headingPrefix)) {
        currentHeadItem = { head: line.slice(1), subItems: [] };
        parsedData.push(currentHeadItem);
        previousLine = line;
      } else if (line.startsWith(subItemPrefix)) {
        const trimmedSubItem = line.slice(2);
        if (currentHeadItem) {
          currentHeadItem.subItems.push(trimmedSubItem);
          previousLine = line;
        }
      } else {
        if (line.trim().length > 0 && currentHeadItem) {
          if (previousLine.startsWith(headingPrefix)) {
            const unfinishedHeadItem = { head: line, subItems: [] };
            currentHeadItem.head += "、" + unfinishedHeadItem.head;
          } else if (previousLine.startsWith(subItemPrefix)) {
            for (let i = 0; i < currentHeadItem.subItems.length; i++) {
              if (currentHeadItem.subItems[i] == previousLine.slice(2)) {
                currentHeadItem.subItems[i] += "、" + line;
              }
            }
          } else {
            console.log("Unexpected line format:", line);
          }
        }
      }
    });
    return parsedData;
  }

  return (
    <div>
      <div className="mx-36">
        {parseMarkdown(inputSentence).map((item, index) => (
          <CollapsibleItem
            key={index}
            head={item.head}
            subItems={item.subItems}
          />
        ))}
      </div>
    </div>
  );
}
