// グウェントフィニティ以降は
// 修正データはクライアントにないので新規作成せず、
// GwentCards.jsonに公式サイトデッキビルダーのAPIから得られた最新情報をパッチとして適用する
// dataディレクトリには前バージョンで作成したGwentCards.jsonが入っている必要がある

// const GwentCards = require('./lib/GwentCards'); // クライアントデータを抽出する場合はこちら
const GwentCards = require('./lib/GwentfinityCards');
const ConverterCSV = require('./lib/converter/GwentCard2CSV');
const ConverterSS = require('./lib/converter/GwentCard2Seesaa');
const { execSync } = require('child_process'); // パッチを落としてから作業を始めるための同期処理に必要

// グウェントフィニティ以後のバージョンは「v.bc（日付）.（回数）」の形式でないとエラーに
let version = 'v.bc20240401.6';

// 先にパッチをダウンロードしておかなければならない
const stdout = execSync(`node PatchDownloader.js ${version}`);
console.log(`${stdout.toString()}`);

let gc  = new GwentCards(version);

let CSV = new ConverterCSV(gc);
CSV.saveFile('ja-jp');
CSV.saveFile('en-us');

let Seesaa = new ConverterSS(gc);
Seesaa.make();
