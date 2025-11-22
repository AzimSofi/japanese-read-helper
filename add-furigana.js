const fs = require('fs');
const path = require('path');

// Common N4 and lower kanji (these should NOT get furigana)
const n4AndLowerKanji = new Set([
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万',
  '日', '月', '火', '水', '木', '金', '土', '年', '今', '毎', '先', '来', '何', '時', '分', '半',
  '人', '男', '女', '子', '学', '生', '先', '友', '私', '父', '母', '兄', '姉', '弟', '妹', '家', '族',
  '本', '名', '前', '国', '語', '文', '字', '会', '社', '話', '読', '書', '見', '聞', '言', '食', '飲',
  '行', '来', '帰', '入', '出', '会', '休', '立', '座', '歩', '走', '作', '使', '働', '買', '売',
  '大', '小', '多', '少', '高', '安', '低', '長', '短', '新', '古', '若', '明', '暗', '白', '黒',
  '赤', '青', '色', '好', '悪', '元', '気', '有', '無', '便', '利', '不', '正', '間', '違',
  '右', '左', '上', '下', '中', '外', '内', '前', '後', '東', '西', '南', '北', '近', '遠',
  '山', '川', '田', '町', '村', '市', '駅', '校', '店', '車', '道', '門', '室', '開', '閉',
  '天', '雨', '雪', '花', '草', '木', '林', '森', '犬', '猫', '魚', '鳥', '肉', '米', '茶',
  '朝', '昼', '夜', '晩', '午', '早', '遅', '週', '円', '度', '回', '番', '方', '力', '勉', '強',
  '思', '知', '考', '教', '習', '問', '答', '分', '理', '解', '同', '意', '味', '物', '品', '者',
  '手', '足', '目', '耳', '口', '体', '頭', '顔', '心', '声', '電', '話', '写', '真', '切', '持',
  '貸', '借', '送', '返', '起', '寝', '着', '脱', '洗', '待', '取', '付', '始', '終', '住', '度'
]);

function isN3PlusKanji(char) {
  // Check if it's a kanji (CJK Unified Ideographs range)
  const code = char.charCodeAt(0);
  const isKanji = (code >= 0x4E00 && code <= 0x9FFF) ||
                  (code >= 0x3400 && code <= 0x4DBF);

  if (!isKanji) return false;

  // Return true if it's NOT in the N4-and-lower list
  return !n4AndLowerKanji.has(char);
}

function addFurigana(text) {
  let result = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (isN3PlusKanji(char)) {
      // Collect consecutive kanji
      let kanjiSequence = char;
      let j = i + 1;

      while (j < text.length && isN3PlusKanji(text[j])) {
        kanjiSequence += text[j];
        j++;
      }

      // Check if there's already furigana in bracket format like 与[あた]
      if (j < text.length && text[j] === '[') {
        // Find the closing bracket
        let bracketEnd = text.indexOf(']', j);
        if (bracketEnd !== -1) {
          const furigana = text.substring(j + 1, bracketEnd);

          // Convert to ruby format
          // Check if it's in format [reading・meaning] or just [reading]
          if (furigana.includes('・')) {
            // Format: kanji[reading・meaning] - keep only the reading part
            const reading = furigana.split('・')[0];
            result += `<ruby>${kanjiSequence}<rt>${reading}</rt></ruby>`;
          } else {
            // Format: kanji[reading]
            result += `<ruby>${kanjiSequence}<rt>${furigana}</rt></ruby>`;
          }

          i = bracketEnd + 1;
          continue;
        }
      }

      // No existing furigana found, add empty ruby tags for manual filling
      result += `<ruby>${kanjiSequence}<rt></rt></ruby>`;
      i = j;
    } else {
      result += char;
      i++;
    }
  }

  return result;
}

// Read the file
const filePath = path.join(__dirname, 'public', '俺にトラウマを与えた女子達がチラチラ見てくるけど、残念ですが手遅れです１.txt');
const content = fs.readFileSync(filePath, 'utf-8');

// Process the content
const processedContent = addFurigana(content);

// Write back to the file
fs.writeFileSync(filePath, processedContent, 'utf-8');

console.log('✓ Furigana conversion complete!');
console.log(`  Processed ${content.length} characters`);
