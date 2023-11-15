const axios = require('axios');
const fs = require("fs");
const path = require("path");

// グウェント公式サイトのデッキビルダーAPIからデータを取得
// 全カードはAPIのデフォルト値だがここには所有不可能なカード（リーダーとトークンなど）は含まれない
// このあたりの設定値はすべて settings.json から引っ張るべきだが、気が向いたときにやる
const data_dir          = "data";
const leader_patch_name = "LeadersPatch.json";
const cards_patch_name  = "CardsPatch.json";
const leaders_url       = "https://www.playgwent.com/en/decks/builder/api/search?type=1";
const cards_url         = "https://www.playgwent.com/en/decks/builder/api/search?";

console.log(`Patches for version: ${process.argv[2]}`);
getPatch(leaders_url, leader_patch_name);
getPatch(cards_url, cards_patch_name);

async function getPatch(url, filename) {
  try {
    const response = await axios.get(url);
    let fpath = path.join(
      "./",
      data_dir,
      process.argv[2],
      filename
    );
    fs.writeFileSync(fpath, JSON.stringify(response.data, null, 2));
    console.log(`... ${filename} downloaded to ${fpath}`);
  } catch (error) {
    console.error(error);
  }
}
