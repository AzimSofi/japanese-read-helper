import type { ParsedItem } from '@/lib/types';
import {
  isHeadingLine,
  isSubItemLine,
  isBoldFormatted,
  isHashHeading,
  hasSubItemsAhead,
  isTwoSubItemPattern,
  isEmptyLineBeforeSubItems,
  isStandaloneHeading,
  isOrphanedDialogue,
} from './validator';
import {
  removeHeadingPrefix,
  removeSubItemPrefix,
  removeBoldFormatting,
  removeHashPrefix,
} from './normalizer';
import { fixMergedLine } from './splitter';

export function parseMarkdown(text: string, isError: boolean = false): ParsedItem[] {
  if (isError) {
    console.error('Error: Invalid response format');
    return [];
  }

  const hasHeadingPrefix = /^[<＜](?!ruby>|rt>)/m.test(text);
  const hasSubItemSeparator = text.includes('>>');
  const hasMarkdownFormat = hasHeadingPrefix || hasSubItemSeparator;

  if (!hasMarkdownFormat) {
    return text
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => ({
        head: paragraph,
        subItems: [],
      }));
  }

  const splitByLines = text.split('\n');
  const parsedData: ParsedItem[] = [];
  let currentHeadItem: ParsedItem | null = null;
  let collectingMultiLineHeader = false;

  for (let i = 0; i < splitByLines.length; i++) {
    let line = splitByLines[i];
    const previousLine = i > 0 ? splitByLines[i - 1] : '';

    if (line.trim() === '') {
      continue;
    }

    if (isHeadingLine(line)) {
      currentHeadItem = {
        head: removeHeadingPrefix(line),
        subItems: [],
      };
      parsedData.push(currentHeadItem);
      collectingMultiLineHeader = true;
    }
    else if (collectingMultiLineHeader && isSubItemLine(line)) {
      collectingMultiLineHeader = false;
      const trimmedSubItem = removeSubItemPrefix(line);
      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
      }
    }
    else if (collectingMultiLineHeader && currentHeadItem) {
      currentHeadItem.head += line;
    }
    else if (!collectingMultiLineHeader && isSubItemLine(line)) {
      const trimmedSubItem = removeSubItemPrefix(line);
      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
      }
    }
    else if (!collectingMultiLineHeader && hasSubItemsAhead(splitByLines, i, 4)) {
      const trimmedSubItem = removeSubItemPrefix(line);

      if (currentHeadItem) {
        currentHeadItem.subItems.push(trimmedSubItem);
        currentHeadItem.subItems.push(removeSubItemPrefix(splitByLines[i + 1]));
      }

      const foundPrefix = fixMergedLine(splitByLines, i);
      if (!foundPrefix) {
        console.log('Unexpected line format:', splitByLines[i + 2]);
      }
    }
    else if (!collectingMultiLineHeader && hasSubItemsAhead(splitByLines, i, 3)) {
      if (isBoldFormatted(line)) {
        line = removeBoldFormatting(line);
      }

      currentHeadItem = { head: line, subItems: [] };
      parsedData.push(currentHeadItem);
      collectingMultiLineHeader = true;
    }
    else if (!collectingMultiLineHeader && isTwoSubItemPattern(splitByLines, i)) {
      currentHeadItem = { head: line, subItems: [] };
      parsedData.push(currentHeadItem);
      collectingMultiLineHeader = true;
    }
    else if (!collectingMultiLineHeader) {
      if (isEmptyLineBeforeSubItems(splitByLines, i)) {
        currentHeadItem = { head: line, subItems: [] };
        collectingMultiLineHeader = true;
      }

      if (line.trim().length > 0 && currentHeadItem) {
        if (isHeadingLine(previousLine)) {
          const unfinishedHeadItem = { head: line, subItems: [] };
          currentHeadItem.head += '、' + unfinishedHeadItem.head;
        }
        else if (isSubItemLine(previousLine)) {
          const previousContent = removeSubItemPrefix(previousLine);
          for (let j = 0; j < currentHeadItem.subItems.length; j++) {
            if (currentHeadItem.subItems[j] === previousContent) {
              currentHeadItem.subItems[j] += '、' + line;
            }
          }
        }
        else if (isStandaloneHeading(splitByLines, i, previousLine)) {
          if (isHashHeading(line)) {
            currentHeadItem = {
              head: removeHashPrefix(line),
              subItems: [],
            };
            parsedData.push(currentHeadItem);
          } else {
            currentHeadItem = { head: line, subItems: [] };
            parsedData.push(currentHeadItem);
          }
          collectingMultiLineHeader = true;
        }
        else if (isOrphanedDialogue(line)) {
          console.warn('Orphaned dialogue detected:', line);
        }
        else {
          console.log('Unexpected line format:', line);
        }
      }
    }
  }

  return parsedData;
}

export {
  isHeadingLine,
  isSubItemLine,
} from './validator';
export {
  removeSubItemPrefix,
  normalizeHeading,
  removeHeadingPrefix,
  removeBoldFormatting
} from './normalizer';
export { hasEmbeddedHeading } from './splitter';
