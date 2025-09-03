interface ParsedItem {
  head: string;
  subItems: string[];
}

export function parseMarkdown(
  text: string,
  isError: boolean = false
): ParsedItem[] {
  if (isError) {
    console.error("エラー: 正しい形式の応答が得られませんでした。");
    return [];
  }

  const splitByLines = text.split("\n");
  const headingPrefix = "<";
  const headingPrefixV2 = "＜";
  const subItemPrefix = ">>";
  const parsedData: ParsedItem[] = [];
  let currentHeadItem: ParsedItem | null = null;

  for (let i = 0; i < splitByLines.length; i++) {
    const line = splitByLines[i];
    const previousLineContent = i > 0 ? splitByLines[i - 1] : "";

    if (line.startsWith(headingPrefix) || line.startsWith(headingPrefixV2)) {
      currentHeadItem = { head: line.slice(1), subItems: [] };
      parsedData.push(currentHeadItem);
    } else if (
      i + 5 < splitByLines.length &&
      splitByLines[i + 1].startsWith(subItemPrefix) &&
      splitByLines[i + 2].startsWith(subItemPrefix) &&
      splitByLines[i + 3].startsWith(subItemPrefix) &&
      splitByLines[i + 4].startsWith(subItemPrefix)
    ) {
      // Headprefixは文書の中に入ってしまう
      // const oddLine = splitByLines[i + 2];
      // if (oddLine.includes(headingPrefix)) {
      //   console.log(splitByLines[i+2]);
      // } else if (oddLine.includes(headingPrefixV2)) {
      //   console.log(splitByLines[i+2]);
      // } else {
      //   console.log("Unexpected line format:", line);
      // }

      const trimmedSubItem = line.slice(2);
      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
        currentHeadItem.subItems.push(splitByLines[i + 1].slice(2));
      }

      if (splitByLines[i + 2].includes(headingPrefix)) {
        const oddLine = splitByLines[i + 2].split(headingPrefix);
        const part1 = oddLine[0];
        const part2 = oddLine[1];
        splitByLines[i + 1] = part1;
        splitByLines[i + 2] = part2;
      } else if (splitByLines[i + 2].includes(headingPrefixV2)) {
        const oddLine = splitByLines[i + 2].split(headingPrefixV2);
        const part1 = oddLine[0];
        const part2 = oddLine[1];
        splitByLines[i + 1] = part1;
        splitByLines[i + 2] = part2;
      } else {
        console.log("Unexpected line format:", splitByLines[i + 2]);
      }
    } else if (
      // 元々Headですが、〝headingPrefix〟はない、
      // Head = {}
      i + 3 < splitByLines.length &&
      splitByLines[i + 1].startsWith(subItemPrefix) &&
      splitByLines[i + 2].startsWith(subItemPrefix) &&
      splitByLines[i + 3].startsWith(subItemPrefix)
    ) {
      currentHeadItem = { head: line, subItems: [] };
      parsedData.push(currentHeadItem);
    } else if (line.startsWith(subItemPrefix)) {
      const trimmedSubItem = line.slice(2);
      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
      }
    } else if (
      // Headですが、subitemは2つしかいない
      i + 5 < splitByLines.length &&
      splitByLines[i + 1].startsWith(subItemPrefix) &&
      splitByLines[i + 2].startsWith(subItemPrefix) &&
      splitByLines[i + 3] === "" &&
      splitByLines[i + 4] &&
      splitByLines[i + 5].startsWith(subItemPrefix)
    ) {
      currentHeadItem = { head: line, subItems: [] };
      parsedData.push(currentHeadItem);
    } else {
      if (line.trim().length > 0 && currentHeadItem) {
        // Head + {}
        if (previousLineContent.startsWith(headingPrefix)) {
          const unfinishedHeadItem = { head: line, subItems: [] };
          currentHeadItem.head += "、" + unfinishedHeadItem.head;
        }
        // item + {}
        else if (previousLineContent.startsWith(subItemPrefix)) {
          for (let j = 0; j < currentHeadItem.subItems.length; j++) {
            if (currentHeadItem.subItems[j] == previousLineContent.slice(2)) {
              currentHeadItem.subItems[j] += "、" + line;
            }
          }
        }
        // 変な形
        else {
          console.log("Unexpected line format:", line);
        }
      }
    }
  }
  return parsedData;
}
