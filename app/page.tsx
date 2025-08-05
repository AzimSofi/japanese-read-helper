export default function Home() {
  let inputSentence = "";

  //　例
  inputSentence = `
*   **アウトプットを最大化する**
    *   成果を最大限に引き出す
    *   最も良い結果を出すには
    *   良い結果を出す
    `;


  function parseMarkdown(text: string): string[] {
    const splitByLines = text.split("\n");
    // console.log(splitByLines);
    // return splitByLines;
    splitByLines.forEach(line => {
      if (line.startsWith("*   ")) {
        console.log("Heading:", line);
      } else if (line.startsWith("    *   ")) {
        console.log("Sub-item:", line);
      }
    });

    return splitByLines;


    // const lines = text.trim().split('\n');
    //   return lines.map(line => {
    //     const trimmedLine = line.trim();
    //     if (trimmedLine.startsWith('* ')) {
    //       const content = trimmedLine.substring(2);
    //       // 太字かどうかを判定 (簡易的に ** で囲まれているかで判断)
    //       const isHeading = content.startsWith('**') && content.endsWith('**');
    //       return {
    //         text: content.replace(/\*\*/g, ''), // 太字マークを削除
    //         isHeading: isHeading,
    //       };
    //     }
    //     return { text: trimmedLine }; // リスト形式でない行も考慮する場合
    //   }).filter(item => item.text); // 空の項目を除外
  }

return (
    <div>Test
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
