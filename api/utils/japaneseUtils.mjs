import wanakana from 'wanakana';
import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const kuroshiro = new Kuroshiro.default();
await kuroshiro.init(new KuromojiAnalyzer());

const { toRomaji } = wanakana;

async function convertToRomaji(text) {
  try {
    return toRomaji(text, { upcaseKatakana: true }); // Convert Katakana to uppercase
  } catch (error) {
    console.error('Error converting to Romaji:', error);
    return 'Error occurred';
  }
}

async function convertText(text) {
  const result = await kuroshiro.convert(text, {to:"hiragana"});
  return result;
}
/*
  const names = [
    '大谷　翔平 (Ohtani Shohei)', // Full name with space (space needs to be removed)
    '田中　花子 (Tanaka Hanako)',  // Another name with space
    '鈴木一郎 (Suzuki Ichiro)',    // Single name
  ];

  // Test convertText
  async function testConvertText() {
    for (const name of names) {
      const hiragana = await convertText(name);
      console.log(`Hiragana conversion of "${name}":`);
      console.log(hiragana);
      console.log('--------------------');
    }
  }

  testConvertText();
*/

export { 
  toRomaji,
  convertToRomaji,  
  convertText,
};
