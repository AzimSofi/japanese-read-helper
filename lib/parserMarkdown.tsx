interface ParsedItem {
  head: string;
  subItems: string[];
}

export function parseMarkdown(text: string): ParsedItem[] {
  const splitByLines = text.split("\n");
  const headingPrefix = "<";
  const subItemPrefix = ">>";
  const parsedData: ParsedItem[] = [];
  let currentHeadItem: ParsedItem | null = null;

  for (let i = 0; i < splitByLines.length; i++) {
    const line = splitByLines[i];
    const previousLineContent = i > 0 ? splitByLines[i - 1] : "";

    if (line.startsWith(headingPrefix)) {
      currentHeadItem = { head: line.slice(1), subItems: [] };
      parsedData.push(currentHeadItem);
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
