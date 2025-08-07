import fs from 'fs';
import path from 'path';
import CollapsibleItem from './CollapsibleItem';

export default function Home() {
  let inputSentence = "";

  //　例
  inputSentence = `
<正しい答えなどない。
>>唯一の正解はない。
>>必ずしも「これだ」という正しい答えがあるわけではない。
>>正解はない。

<それでも、自分のスタンスを決める
>>しかし、自分の意見や立場は決める必要がある。
>>それでも、最終的には自分の立ち位置を明確にする。
>>自分の意見を決める。
    `;

  const filePath = path.join(process.cwd(), 'public', 'text.txt');
  inputSentence = fs.readFileSync(filePath, 'utf8');

  interface ParsedItem {
    head: string;
    subItems: string[];
  }

  function parseMarkdown(text: string): ParsedItem[] {
    const splitByLines = text.split("\n");
    const headingPrefix = "<";
    const subItemPrefix = ">>";
    const parsedData: ParsedItem[] = [];
    let currentHeadItem: ParsedItem | null = null;

    splitByLines.forEach(line => {
      if (line.startsWith(headingPrefix)) {
        currentHeadItem = { head: line.slice(1), subItems: [] };
        parsedData.push(currentHeadItem);
      } else if (line.startsWith(subItemPrefix)) {
        const trimmedSubItem = line.slice(2);
        if (currentHeadItem) {
          currentHeadItem.subItems.push(trimmedSubItem);
        }
      }
      else {
        if (parsedData.length > 0) {
          const unfinishedHeadItem = { head: line, subItems: [] };
            if (currentHeadItem) {
              currentHeadItem.head += "、" + unfinishedHeadItem.head;
            }
          //console.log("current:", currentHeadItem.head);
          // parsedData.push(unfinishedHeadItem);
        }
      }
    });
    return parsedData;
  }

return (
    <div>
      <div className='mx-36'>
        {parseMarkdown(inputSentence).map((item, index) => (
          <CollapsibleItem key={index} head={item.head} subItems={item.subItems} />
        ))}
      </div>
    </div>
  );
}
