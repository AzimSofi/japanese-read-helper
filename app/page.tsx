import fs from 'fs';
import path from 'path';

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

  function parseMarkdown(text: string): string[] {
    const splitByLines = text.split("\n");
    const headingPrefix = "*   ";
    const subItemPrefix = "    *   "
    const result: string[] = [];

    splitByLines.forEach(line => {
      if (line.startsWith(headingPrefix)) {
        const trimmedHeading = line.match(/^\*\s+\*\*(.*)\*\*$/)[1];
        console.log("Heading:", trimmedHeading ?? "ないですか");
        result.push(trimmedHeading);
      } else if (line.startsWith(subItemPrefix)) {
        const trimmedSubItem = line.replace(/^\s*\*\s+/, '').trim();
        console.log("Sub-item:", trimmedSubItem ?? "ないですか");
        result.push(trimmedSubItem);
      }
    });
    return result;
  }

return (
    <div>
      <div>
        {parseMarkdown(inputSentence).map((line, index) => (
          <div key={index} className="text-sm">
            {line}
          </div>
        ))}
      </div>

    </div>
  );
}
