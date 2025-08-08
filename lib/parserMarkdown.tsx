interface ParsedItem {
  head: string;
  subItems: string[];
}

export function parseMarkdown(text: string): ParsedItem[] {
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
