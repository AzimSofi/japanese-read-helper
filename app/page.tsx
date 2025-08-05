import fs from 'fs';
import path from 'path';
import CollapsibleItem from './CollapsibleItem';

export default function Home() {
  let inputSentence = "";

  //　例
  inputSentence = `
*   **アウトプットを最大化する**
    *   成果を最大限に引き出す
    *   最も良い結果を出すには
    *   良い結果を出す

*   **2アウトプットを最大化する**
    *   2成果を最大限に引き出す
    *   2最も良い結果を出すには
    *   2良い結果を出す
    `;

  const filePath = path.join(process.cwd(), 'public', 'text.txt');
  inputSentence = fs.readFileSync(filePath, 'utf8');

  interface ParsedItem {
    head: string;
    subItems: string[];
  }

  function parseMarkdown(text: string): ParsedItem[] {
    const splitByLines = text.split("\n");
    const headingPrefix = "*   ";
    const subItemPrefix = "    *   ";
    const parsedData: ParsedItem[] = [];
    let currentHeadItem: ParsedItem | null = null;

    splitByLines.forEach(line => {
      if (line.startsWith(headingPrefix)) {
        // const match = line.match(/^\*\s+\*\*(.*?)\*\*$/);
        // console.log(`Line: ${line}`);
        // console.log(`Line: ${line.match(/^\*\s+\*\*(.*?)\*\*$/)}`);
        // console.log(`Match: ${match}`);
        // const trimmedHeading = match ? match[1] : '';
        currentHeadItem = { head: line.slice(6, -3), subItems: [] };
        parsedData.push(currentHeadItem);
        // console.log(`Heading found: ${trimmedHeading}`);
      } else if (line.startsWith(subItemPrefix)) {
        const trimmedSubItem = line.replace(/^\s*\*\s+/, '').trim();
        if (currentHeadItem) {
          currentHeadItem.subItems.push(trimmedSubItem);
          // console.log(`Sub-item found: ${trimmedSubItem}`);
        }
      }
    });
    return parsedData;
  }

return (
    <div>
      <div>
        {parseMarkdown(inputSentence).map((item, index) => (
          <CollapsibleItem key={index} head={item.head} subItems={item.subItems} />
        ))}
      </div>
    </div>
  );
}
