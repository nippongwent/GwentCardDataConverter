const fs = require("fs"); // いわゆるI/O処理を行う標準ライブラリ
const path = require("path"); // ファイルパスを扱うための標準ライブラリ
const GWENT = require("../GwentConstants"); // チュートリアルカードを弾くために必要
const SEESAA = require("./SeesaaConvertJP"); // Seesaa用の変換関数

const NL = "\r\n";
const cautionary_statement = "// An unofficial fan work under the fan content guidelines: https://cdprojektred.com/en/fan-content" + NL;

class GwentCards2Seesaa {
  /*
  コンストラクタではGwentCardsオブジェクトを受け取る。
  一応、引数の多少の確認はしておく

  チュートリアルカードを書き出すかどうかのオプションもある
  デフォルトは false （チュートリアルカードを無視）
  --------------------------------------------------------*/
  constructor(GwentCards, tutorial = false) {
    if(GwentCards === undefined || GwentCards === null) {
      throw 'Parameter Required: GwentCards2Seesaa->constructor()';
    }
    if(GwentCards.constructor.name !== "GwentCards") {
      throw 'The first parameter must be "GwentCards" object: GwentCards2Seesaa->constructor()';
    }
    this.GwentCards = GwentCards;
    this.Version    = GwentCards.Version;
    this.Tutorial   = tutorial;
  }

  /*
  必要なファイルをすべて作る

  保存する言語を受け取る
  初期値は 
  lang  = 'ja-jp'
  --------------------------------------------------------*/
  make(lang = 'ja-jp') {
    if(this.GwentCards.Settings.OutputDir === undefined) {
      throw `GwentCards.Settings.OutputDir required: plaese check settings.json`;
    }
    let dpath = this.GwentCards.Settings.OutputDir;

    // 保存先ディレクトリの存在確認＆なければ作成
    if(!fs.existsSync(dpath)) fs.mkdir(dpath);

    // バージョンごとに管理
    let dpath_v = path.join(
      dpath,
      this.Version
    );
    if(!fs.existsSync(dpath_v)) fs.mkdir(dpath_v);

    // バージョン配下に faction と cardset を入れる
    let dpath_v_f = path.join(
      dpath_v,
      "faction"
    );
    if(!fs.existsSync(dpath_v_f)) fs.mkdir(dpath_v_f);
    
    let dpath_v_c = path.join(
      dpath_v,
      "cardset"
    );
    if(!fs.existsSync(dpath_v_c)) fs.mkdir(dpath_v_c);

    if(this.GwentCards.CardData[lang] === undefined || this.GwentCards.CardData[lang] === null ) {
      throw `No such language(${lang}) in the data: GwentCards2Seesaa->make()`;
    }

    // 必要なファイルを各々作成する
    this.saveMain(dpath_v, lang);
    // this.saveFaction(dpath_f, lang);
    // this.saveCardset(dpath_c, lang);
  }

  /*
  主要ファイルを作る

  保存先のディレクトリと言語を受け取る
  初期値は 
  dpath = ''
  lang  = 'ja-jp'
  単体で使わず make() で全部作ることを推奨
  保存のファイル名は seesaawiki.utf8.txt に固定してある
  --------------------------------------------------------*/
  saveMain(dpath_v = '', lang = 'ja-jp') {
    let Cards = this.GwentCards.CardData[lang].Cards;
    let output_text  = cautionary_statement;
        output_text += "// " + this.GwentCards.CardData.Version + NL;
        output_text += NL;

    // 各データの処理
    Cards.forEach(Card => {
      // チュートリアルカードを無視するかどうか
      // デフォルトでは無視する
      // "CardId: 202892" はチュートリアルだがトークン扱いなので個別に弾く
      if(this.Tutorial === false) {
        if(Card.Cardset === GWENT[lang]["Cardset"][2]) return;
        if(Card.CardId  === "202892") return;
      }

      // どのカードのデータを作成するかを決めたら
      // this.seesaaFormat() で個々のカードを変換する
      output_text += this.seesaaCardFormat(Card);
    });

    let fpath = path.join(
      dpath_v,
      "seesaawiki.utf8.txt"
    );

    try {
      fs.writeFileSync(fpath, output_text);
    } catch(e) {
      console.log(e);
    }
  }

  /*
  1枚のカードデータを seesaa 用のフォーマットにして
  テキストデータを返す
  --------------------------------------------------------*/
  seesaaCardFormat(Card) {
    let seesaaText = "";

    // カードデータのヘッダー
    seesaaText  = `// [GCDC:StartCard] - 編集者へ：StartからEndまでコメント部分も一緒で投稿してください` + `${NL}`;
    seesaaText += `// [CardId]: ${Card.CardId}, [DebugName]: ${Card.DebugName}` + `${NL}`;
    seesaaText += `|w(100):center:bgcolor(#333333):color(#f3f3fe)|left:|c`;

    // カードデータの本体
    seesaaText += `|!カード名|${Card.Name}|` + `${NL}`;
    // 英語カード名は DebugName で代用できる（一部のトークンは注意）
    seesaaText += `|!英語カード名|${Card.DebugName}|` + `${NL}`;
    seesaaText += `|!勢力|${SEESAA.linkFaction(Card.Faction)}|` + `${NL}`;
    seesaaText += `|!カードタイプ|${Card.CardType}|` + `${NL}`;
    seesaaText += `|!カテゴリ|${SEESAA.linkCategory(Card.Categories.join(', '))}|` + `${NL}`;
    seesaaText += `|!構築コスト|${Card.Provision}|` + `${NL}`;
    seesaaText += `|!戦力|${Card.Power}|` + `${NL}`;
    seesaaText += `|!アーマー|${Card.Armor}|` + `${NL}`;
    seesaaText += `|!アビリティ|${SEESAA.convertAbility(Card.Ability)}|` + `${NL}`;
    seesaaText += `|!レアリティ|${SEESAA.convertRarity(Card.Rarity)}|` + `${NL}`;
    seesaaText += `|!カードセット|${SEESAA.linkCardset(Card.Cardset)}|` + `${NL}`;
    seesaaText += `|!フレーバー~~テキスト|${SEESAA.convertFlavor(Card.Flavor)}|` + `${NL}`;
    seesaaText += `|!イラスト|${Card.Artist}|` + `${NL}`;
   
    // カードデータのフッター
    seesaaText += `// [Version]: ${this.GwentCards.CardData.Version}` + `${NL}`;
    if(Card.Changelog !== undefined) {
      // 将来的に各カードに変更情報を持たせることを考えている
      seesaaText += `// [Changelog]: ${Card.Changelog}` + `${NL}`;
    }
    seesaaText += `// [GCDC:EndCard]` + `${NL}${NL}`;

    return seesaaText;
  }
}

module.exports = GwentCards2Seesaa;
