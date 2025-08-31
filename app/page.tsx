import CollapsibleItem from "./CollapsibleItem";
import { parseMarkdown } from "../lib/parserMarkdown";

export default async function Home() {
  let inputSentence: string = "";
  const englishRegex = /[a-zA-Z]/;; 

  //　例
  inputSentence = `
<膨大な資料を短時間で読み解くための
「仮説」と「異常値」
>>大量の資料を短い時間で理解するために使う
「仮説」と「例外」
>>たくさんの資料を短い時間で理解するヒントは
「仮説」と「普通ではないこと」
>>資料を早く読むコツは「仮説」と「異常値」
    `;

  const response = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"}/api/read-public-txt`, {
    method: "GET",
  });

  if (response.ok) {
    const data = await response.json();
    inputSentence = await data.text;
  } else {
    console.error(response.statusText);
  }
  
  return (
    <div className="mx-36 my-5">
      {parseMarkdown(inputSentence).map((item, index) => (
        <CollapsibleItem
          key={index}
          head={item.head}
          subItems={item.subItems}
          initialDropdownState={ /*englishRegex.test(item.head) || */item.subItems.length>3 ? true : false 
            || (item.subItems[2] !== "" && item.subItems[2] !== "無い") }
        />
      ))}
    </div>
  );
}
