const fs = require("fs");

/* ---------------------------------------------------------
ローカライズの対応連想配列を返す関数
バージョン情報は含まないので注意

まずはローカライズファイル自体を確認してもらいたいが
"122304_fluff;流行りの城攻め用兵器" と記載されているものを
単純に key-value 方式の連想配列にしているだけのプログラム

const LDic = require("このファイルまでのパス");
var   JPs  = LDic("目的の言語のローカライズファイルまでのパス");

console.log(JPs["122304_fluff"])
// => 流行りの城攻め用兵器
--------------------------------------------------------- */
module.exports = (fpath) => {
  // Unity では改行コードは \r\n に統一することを推奨しているらしい
  // CSV の区切り文字をオプションで指定可能にしてもいいかも
  const lines = fs.readFileSync(fpath, "utf8").toString().split(/\r\n|\n/);
  let pair = [];
  let dic  = [];
  lines.forEach(line => {
    if(line.includes(";")) {
      pair = line.split(";");
      dic[pair[0]] = pair[1];
    }
  });
  return dic;
}