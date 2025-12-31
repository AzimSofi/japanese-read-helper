const fs = require('fs');
const path = require('path');
const Kuroshiro = require('kuroshiro').default;
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

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

function isKanji(char) {
  const code = char.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF);
}

function isN3PlusKanji(char) {
  return isKanji(char) && !n4AndLowerKanji.has(char);
}

function hasAnyN3PlusKanji(text) {
  for (let char of text) {
    if (isN3PlusKanji(char)) return true;
  }
  return false;
}

function cleanText(text) {
  let cleaned = text;

  // Keep removing ruby tags until there are none left (handles nested tags)
  let prevLength = -1;
  while (cleaned.length !== prevLength) {
    prevLength = cleaned.length;
    // Match innermost ruby tags first
    cleaned = cleaned.replace(/<ruby>([^<>]*?)<rt>.*?<\/rt><\/ruby>/g, '$1');
  }

  // Convert bracket format kanji[reading] or kanji[reading・meaning] to just kanji
  cleaned = cleaned.replace(/([一-龯々]+)\[([^\]]+)\]/g, '$1');

  return cleaned;
}

async function processFile() {
  console.log('Initializing Kuroshiro...');
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
  console.log('✓ Kuroshiro initialized');

  const filePath = path.join(__dirname, 'public', '俺にトラウマを与えた女子達がチラチラ見てくるけど、残念ですが手遅れです１.txt');
  console.log('Reading file...');
  let content = fs.readFileSync(filePath, 'utf-8');
  console.log(`✓ Read ${content.length} characters`);

  console.log('Cleaning existing ruby tags and brackets...');
  content = cleanText(content);
  console.log(`✓ Cleaned to ${content.length} characters`);

  console.log('Processing text (this may take a while)...');

  // Split into lines for progress tracking
  const lines = content.split('\n');
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    if (i % 100 === 0) {
      const percent = Math.round(i / lines.length * 100);
      console.log(`  Progress: ${i}/${lines.length} lines (${percent}%)`);
    }

    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      processedLines.push(line);
      continue;
    }

    try {
      // Convert to furigana using kuroshiro
      const result = await kuroshiro.convert(line, {
        to: 'hiragana',
        mode: 'furigana',
        romajiSystem: 'hepburn'
      });

      // Parse the result and filter to only add furigana for N3+ kanji
      // Kuroshiro returns format: <ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>
      let processed = result;

      // Remove the <rp> tags since we don't need them
      processed = processed.replace(/<rp>.*?<\/rp>/g, '');

      // Now we need to filter: only keep <ruby> tags that contain N3+ kanji
      processed = processed.replace(/<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/g, (match, kanji, reading) => {
        // Check if this kanji sequence contains any N3+ kanji
        if (hasAnyN3PlusKanji(kanji)) {
          return `<ruby>${kanji}<rt>${reading}</rt></ruby>`;
        } else {
          // Return just the kanji without ruby tags
          return kanji;
        }
      });

      processedLines.push(processed);
    } catch (error) {
      console.error(`Error processing line ${i}: ${error.message}`);
      processedLines.push(line); // Keep original line on error
    }
  }

  console.log('✓ Text processing complete');

  const finalContent = processedLines.join('\n');

  console.log('Writing to file...');
  fs.writeFileSync(filePath, finalContent, 'utf-8');
  console.log('✓ File written successfully');

  console.log('\n=== Summary ===');
  console.log(`Total lines processed: ${lines.length}`);
  console.log(`Original size: ${content.length} characters`);
  console.log(`Final size: ${finalContent.length} characters`);
}

processFile().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
