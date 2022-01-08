const fs = require("fs"); // いわゆるI/O処理を行う標準ライブラリ
const path = require("path"); // ファイルパスを扱うための標準ライブラリ
const GWENT = require("../GwentConstants"); // チュートリアルカードを弾くために必要

const NL = "\r\n";
const cautionary_statement = "// An unofficial fan work under the fan content guidelines: https://cdprojektred.com/en/fan-content" + NL;

class GwentCards2CSV {
  /*
  コンストラクタではGwentCardsオブジェクトを受け取る。
  一応、引数の多少の確認はしておく

  チュートリアルカードを書き出すかどうかのオプションもある
  デフォルトは false （チュートリアルカードを無視）
  --------------------------------------------------------*/
  constructor(GwentCards, tutorial = false) {
    if(GwentCards === undefined || GwentCards === null) {
      throw 'Parameter Required: GwentCards2CSV->constructor()';
    }
    if(GwentCards.constructor.name !== "GwentCards") {
      throw 'The first parameter must be "GwentCards" object: GwentCards2CSV->constructor()';
    }
    this.GwentCards = GwentCards;
    this.Version    = GwentCards.Version;
    this.Tutorial   = tutorial;
  }

  /*
  保存先のディレクトリパスと言語を受け取る
  初期値は 
  lang  = 'ja-jp'
  --------------------------------------------------------*/
  saveFile(lang = 'ja-jp') {
    if(this.GwentCards.Settings.OutputDir === undefined) {
      throw `GwentCards.Settings.OutputDir required: plaese check settings.json`;
    }
    let dpath = this.GwentCards.Settings.OutputDir;

    // 保存先ディレクトリの存在確認＆なければ作成
    if(!fs.existsSync(dpath)) fs.mkdirSync(dpath);

    // バージョンごとに管理
    let dpath_v = path.join(
      dpath,
      this.Version
    );
    if(!fs.existsSync(dpath_v)) fs.mkdirSync(dpath_v);

    // 保存ファイル名を作成
    let fpath = path.join(
      dpath_v,
      `./cards_${lang}.utf8.csv`
    );

    if(this.GwentCards.CardData[lang] === undefined || this.GwentCards.CardData[lang] === null ) {
      throw `No such language(${lang}) in the data: GwentCards2CSV->saveFile()`;
    }
    let Cards = this.GwentCards.CardData[lang].Cards;
    let output_text  = cautionary_statement;
        output_text += "// " + this.GwentCards.CardData.Version + NL;
    
    // 表頭の設定
    // Keywords は内部的なデータなのでCSVに展開していない
    let Header = Object.keys(Cards[0]);
    output_text += '"' + Header.join('","').replace(/"Keywords",/, "") + '"' + NL;

    // 各データの処理
    Cards.forEach(Card => {
      // チュートリアルカードを無視するかどうか
      // デフォルトでは無視する
      // "CardId: 202892" はチュートリアルだがトークン扱いなので個別に弾く
      if(this.Tutorial === false) {
        if(Card.Cardset === GWENT[lang]["Cardset"][2]) return;
        if(Card.CardId  === "202892") return;
      }

      // convertSymbols() は改行コードをどうするか決めている
      // とりあえず改行コードは「 // 」に変更している
      output_text += `"${Card.CardId}",`;
      output_text += `"${Card.DebugName}",`;
      output_text += `"${Card.Collectable}",`;
      output_text += `"${Card.Faction}",`;
      output_text += `"${Card.Faction2}",`;
      output_text += `"${Card.CardType}",`;
      output_text += `"${Card.Rarity}",`;
      output_text += `"${Card.Border}",`;
      output_text += `"${Card.Cardset}",`;
      output_text += `"${Card.Name}",`;
      output_text += `"${Card.Categories.join(', ')}",`;
      output_text += `"${Card.Provision}",`;
      output_text += `"${Card.Power}",`;
      output_text += `"${Card.Armor}",`;
      output_text += `"${this.convertSymbols(Card.Ability)}",`;
      output_text += `"${this.convertSymbols(Card.Flavor)}",`;
      output_text += `"${Card.Artist}",`;
      output_text += `"${Card.Changelog.Summary}"`;
      output_text += NL;
    });

    try {
      fs.writeFileSync(fpath, output_text);
    } catch(e) {
      console.log(e);
    }
  }
    
  /*
  文字列の記号を変換する
  今のところ、必要なのは改行コードぐらいだと思う
  --------------------------------------------------------*/
  convertSymbols(txt) {
    if(txt === undefined || txt === null) {
      return '';
    }
    // 実際の改行コードではなく「\n」という文字列なので
    // 正規表現もそれにしておくこと
    txt = txt.replace(/\\n/g, ' // ');

    return txt;
  }
}
module.exports = GwentCards2CSV;
