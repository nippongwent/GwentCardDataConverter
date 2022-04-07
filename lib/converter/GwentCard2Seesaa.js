const fs = require("fs"); // いわゆるI/O処理を行う標準ライブラリ
const path = require("path"); // ファイルパスを扱うための標準ライブラリ
const GWENT = require("../GwentConstants"); // チュートリアルカードを弾くために必要
const SEESAA = require("./SeesaaConvertJP"); // Seesaa用の変換関数

const NL = "\r\n";
const cautionary_statement = "// An unofficial fan work under the fan content guidelines: https://cdprojektred.com/en/fan-content" + NL;

/*
よく考えたら日本語で動けばよいが
lang の部分は残しておく
--------------------------------------------------------*/
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
    if(!fs.existsSync(dpath)) fs.mkdirSync(dpath);

    // バージョンごとに管理
    let dpath_v = path.join(
      dpath,
      this.Version
    );
    if(!fs.existsSync(dpath_v)) fs.mkdirSync(dpath_v);

    // バージョン配下に faction と cardset を入れる
    let dpath_v_f = path.join(
      dpath_v,
      "faction"
    );
    if(!fs.existsSync(dpath_v_f)) fs.mkdirSync(dpath_v_f);

    let dpath_v_c = path.join(
      dpath_v,
      "cardset"
    );
    if(!fs.existsSync(dpath_v_c)) fs.mkdirSync(dpath_v_c);

    if(this.GwentCards.CardData[lang] === undefined || this.GwentCards.CardData[lang] === null ) {
      throw `No such language(${lang}) in the data: GwentCards2Seesaa->make()`;
    }

    // 必要なファイルを各々作成する
    this.saveMain(dpath_v, lang);
    if(this.GwentCards.PreviousVersion !== undefined && this.GwentCards.PreviousVersion != "") {
      this.saveChanged(dpath_v, lang);
    }
    this.saveFaction(dpath_v_f, lang);
    // 当面はいらない
    // this.saveFactionUnit(dpath_v_f, lang);
    // this.saveFactionNonUnit(dpath_v_f, lang);
    this.saveCardset(dpath_v_c, lang);
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
  変更のあったカードのみを抽出したファイルを作る

  保存先のディレクトリと言語を受け取る
  初期値は 
  dpath = ''
  lang  = 'ja-jp'
  単体で使わず make() で全部作ることを推奨
  保存のファイル名は onlychanged-seesaawiki.utf8.txt に固定してある
  --------------------------------------------------------*/
  saveChanged(dpath_v = '', lang = 'ja-jp') {
    let Cards = this.GwentCards.CardData[lang].Cards;
    let output_text  = cautionary_statement;
        output_text += `// Only Changed Cards: `
        output_text += `${this.GwentCards.CardData.PreviousVersion} ->  ${this.GwentCards.CardData.Version}${NL}`;
        output_text += NL;

    // 各データの処理
    Cards.forEach(Card => {
      // 変更点の有無は Summery の文章で判断
      if(Card.Changelog.Summary === GWENT[lang]["Diff"]["NoChange"]) return;
      output_text += this.seesaaCardFormat(Card);
    });

    let fpath = path.join(
      dpath_v,
      "onlychanged-seesaawiki.utf8.txt"
    );

    try {
      fs.writeFileSync(fpath, output_text);
    } catch(e) {
      console.log(e);
    }
  }

  /*
  各勢力のカード一覧を作成する関数

  保存先のディレクトリと言語を受け取る
  初期値は 
  dpath = ''
  lang  = 'ja-jp'
  単体で使わず make() で全部作ることを推奨
  保存のファイル名は {勢力名}.utf8.txt に固定してある
  --------------------------------------------------------*/
  saveFaction(dpath_v_f = '', lang = 'ja-jp') {
    let Cards = this.GwentCards.CardData[lang].Cards;

    let Factions2Save = {
      "NEU": "ニュートラル",
      "MO" : "モンスター",
      "NG" : "ニルフガード",
      "NR" : "北方諸国",
      "ST" : "スコイア＝テル",
      "SK" : "スケリッジ",
      "SY" : "シンジケート"
    };

    // カードデータをソートしておく
    const TYPE_ORDER_PRE   = ["ストラタジェム","リーダーアビリティ"];
    const TYPE_ORDER       = ["ユニット","スペシャル","アーティファクト"];
    const RARITY_ORDER     = ["レジェンダリー","エピック","レア","コモン"];
    Cards.sort(function(a,b){
      // 上ほど優先度が高い
      // カードタイプ降順（リーダー、ストラタジェム以外を下に持っていく）
      if(TYPE_ORDER_PRE.indexOf(a["CardType"]) > TYPE_ORDER_PRE.indexOf(b["CardType"])) return -1;
      if(TYPE_ORDER_PRE.indexOf(a["CardType"]) < TYPE_ORDER_PRE.indexOf(b["CardType"])) return 1;

      // 構築コスト降順
      if(a["Provision"] > b["Provision"]) return -1;
      if(a["Provision"] < b["Provision"]) return 1;

      // カードタイプ降順（アーティファクト、スペシャル、ユニットの順にする）
      if(TYPE_ORDER.indexOf(a["CardType"]) > TYPE_ORDER.indexOf(b["CardType"])) return -1;
      if(TYPE_ORDER.indexOf(a["CardType"]) < TYPE_ORDER.indexOf(b["CardType"])) return 1;

      // 戦力降順
      if(a["Power"] > b["Power"]) return -1;
      if(a["Power"] < b["Power"]) return 1;

      // レアリティ昇順
      if(RARITY_ORDER.indexOf(a["Rarity"]) > RARITY_ORDER.indexOf(b["Rarity"])) return 1;
      if(RARITY_ORDER.indexOf(a["Rarity"]) < RARITY_ORDER.indexOf(b["Rarity"])) return -1;

      return 0;
    });

    // それぞれの勢力を保存していく
    for(let faction in Factions2Save) {
      let output_text  = `// [GCDC:StartFaction] - 編集者へ：StartからEndまでコメント部分も一緒で投稿してください` + `${NL}`;
      output_text     += cautionary_statement;
      output_text     += `// ${this.GwentCards.CardData.Version}` + `${NL}`;
      output_text     += `{|class="sort filter"` + `${NL}`;
      output_text     += `|center:|left:|center:|center:|left:|c` + `${NL}`;
      output_text     += `|~種~~類|center:カード名|戦~~力|コ~~ス~~ト|center:カテゴリー|` + `${NL}`;

      Cards.forEach(Card => {
        // チュートリアルカードを無視するかどうか
        // デフォルトでは無視する
        // "CardId: 202892" はチュートリアルだがトークン扱いなので個別に弾く
        if(this.Tutorial === false) {
          if(Card.Cardset === GWENT[lang]["Cardset"][2]) return;
          if(Card.CardId  === "202892") return;
        }

        // 必要ないものを弾く
        if(Card.Faction !== Factions2Save[faction] && Card.Faction2 !== Factions2Save[faction]) return;
        if(Card.CardType === "リーダーアビリティ") return;
        if(Card.Cardset === "トークン" && Card.CardType !== "ストラタジェム") return;
  
        // どのカードのデータを作成するかを決めたら
        // this.seesaaTableFormat() で個々のカードを変換する
        output_text += this.seesaaTableFormat(Card,1);
      });
      output_text += `|}` + `${NL}`;
      output_text += `// [GCDC:EndFaction]` + `${NL}${NL}`;

      let fpath = path.join(
        dpath_v_f,
        `${faction}.utf8.txt`
      );
  
      try {
        fs.writeFileSync(fpath, output_text);
      } catch(e) {
        console.log(e);
      }
    }
  }

  /*
  各勢力の戦力降順ユニット一覧を作成する関数

  保存先のディレクトリと言語を受け取る
  初期値は 
  dpath = ''
  lang  = 'ja-jp'
  単体で使わず make() で全部作ることを推奨
  保存のファイル名は {勢力名}_Unit.utf8.txt に固定してある
  --------------------------------------------------------*/
  saveFactionUnit(dpath_v_f = '', lang = 'ja-jp') {
    let Cards = this.GwentCards.CardData[lang].Cards;

    let Factions2Save = {
      "NEU": "ニュートラル",
      "MO" : "モンスター",
      "NG" : "ニルフガード",
      "NR" : "北方諸国",
      "ST" : "スコイア＝テル",
      "SK" : "スケリッジ",
      "SY" : "シンジケート"
    };

    // カードデータをソートしておく
    const TYPE_ORDER_PRE   = ["ストラタジェム","リーダーアビリティ"];
    const TYPE_ORDER       = ["ユニット","スペシャル","アーティファクト"];
    const RARITY_ORDER     = ["レジェンダリー","エピック","レア","コモン"];
    Cards.sort(function(a,b){
      // 上ほど優先度が高い
      // カードタイプ降順（リーダー、ストラタジェム以外を下に持っていく、今回はいらない）
      // if(TYPE_ORDER_PRE.indexOf(a["CardType"]) > TYPE_ORDER_PRE.indexOf(b["CardType"])) return -1;
      // if(TYPE_ORDER_PRE.indexOf(a["CardType"]) < TYPE_ORDER_PRE.indexOf(b["CardType"])) return 1;

      // 戦力降順（最優先する）
      if(a["Power"] > b["Power"]) return -1;
      if(a["Power"] < b["Power"]) return 1;

      // 構築コスト降順
      if(a["Provision"] > b["Provision"]) return -1;
      if(a["Provision"] < b["Provision"]) return 1;

      // カードタイプ降順（アーティファクト、スペシャル、ユニットの順にする、必要ない）
      // if(TYPE_ORDER.indexOf(a["CardType"]) > TYPE_ORDER.indexOf(b["CardType"])) return -1;
      // if(TYPE_ORDER.indexOf(a["CardType"]) < TYPE_ORDER.indexOf(b["CardType"])) return 1;

      // レアリティ昇順
      if(RARITY_ORDER.indexOf(a["Rarity"]) > RARITY_ORDER.indexOf(b["Rarity"])) return 1;
      if(RARITY_ORDER.indexOf(a["Rarity"]) < RARITY_ORDER.indexOf(b["Rarity"])) return -1;

      return 0;
    });

    // それぞれの勢力のユニットを保存していく
    for(let faction in Factions2Save) {
      let output_text  = `// [GCDC:StartFaction] - 編集者へ：StartからEndまでコメント部分も一緒で投稿してください` + `${NL}`;
      output_text     += cautionary_statement;
      output_text     += `// ${this.GwentCards.CardData.Version}` + `${NL}`;
      output_text     += `*** 戦力値別ユニット一覧` + `${NL}`;
      output_text     += `{|class="sort filter"` + `${NL}`;
      output_text     += `|center:|left:|center:|center:|left:|c` + `${NL}`;
      output_text     += `|~種~~類|center:カード名|戦~~力|コ~~ス~~ト|center:カテゴリー|` + `${NL}`;

      Cards.forEach(Card => {
        // チュートリアルカードを無視するかどうか
        // デフォルトでは無視する
        // "CardId: 202892" はチュートリアルだがトークン扱いなので個別に弾く
        if(this.Tutorial === false) {
          if(Card.Cardset === GWENT[lang]["Cardset"][2]) return;
          if(Card.CardId  === "202892") return;
        }

        // 必要ないものを弾く
        if(Card.Faction !== Factions2Save[faction] && Card.Faction2 !== Factions2Save[faction]) return;
        if(Card.CardType !== "ユニット") return;
        if(Card.Cardset === "トークン" && Card.CardType !== "ストラタジェム") return;
  
        // どのカードのデータを作成するかを決めたら
        // this.seesaaTableFormat() で個々のカードを変換する
        output_text += this.seesaaTableFormat(Card,1);
      });
      output_text += `|}` + `${NL}`;
      output_text += `// [GCDC:EndFaction]` + `${NL}${NL}`;

      let fpath = path.join(
        dpath_v_f,
        `${faction}_Unit.utf8.txt`
      );
  
      try {
        fs.writeFileSync(fpath, output_text);
      } catch(e) {
        console.log(e);
      }
    }
  }

  /*
  各勢力のコスト降順非ユニット一覧を作成する関数

  保存先のディレクトリと言語を受け取る
  初期値は 
  dpath = ''
  lang  = 'ja-jp'
  単体で使わず make() で全部作ることを推奨
  保存のファイル名は {勢力名}_NonUnit.utf8.txt に固定してある
  --------------------------------------------------------*/
  saveFactionNonUnit(dpath_v_f = '', lang = 'ja-jp') {
    let Cards = this.GwentCards.CardData[lang].Cards;

    let Factions2Save = {
      "NEU": "ニュートラル",
      "MO" : "モンスター",
      "NG" : "ニルフガード",
      "NR" : "北方諸国",
      "ST" : "スコイア＝テル",
      "SK" : "スケリッジ",
      "SY" : "シンジケート"
    };

    // カードデータをソートしておく
    const TYPE_ORDER_PRE   = ["ストラタジェム","リーダーアビリティ"];
    const TYPE_ORDER       = ["ユニット","スペシャル","アーティファクト"];
    const RARITY_ORDER     = ["レジェンダリー","エピック","レア","コモン"];
    Cards.sort(function(a,b){
      // 上ほど優先度が高い
      // カードタイプ降順（リーダー、ストラタジェム以外を下に持っていく、今回はいらない）
      // if(TYPE_ORDER_PRE.indexOf(a["CardType"]) > TYPE_ORDER_PRE.indexOf(b["CardType"])) return -1;
      // if(TYPE_ORDER_PRE.indexOf(a["CardType"]) < TYPE_ORDER_PRE.indexOf(b["CardType"])) return 1;

      // 戦力降順（最優先する）必要ない
      // if(a["Power"] > b["Power"]) return -1;
      // if(a["Power"] < b["Power"]) return 1;

      // 構築コスト降順
      if(a["Provision"] > b["Provision"]) return -1;
      if(a["Provision"] < b["Provision"]) return 1;

      // カードタイプ降順（アーティファクト、スペシャル、ユニットの順にする）
      if(TYPE_ORDER.indexOf(a["CardType"]) > TYPE_ORDER.indexOf(b["CardType"])) return -1;
      if(TYPE_ORDER.indexOf(a["CardType"]) < TYPE_ORDER.indexOf(b["CardType"])) return 1;

      // レアリティ昇順
      if(RARITY_ORDER.indexOf(a["Rarity"]) > RARITY_ORDER.indexOf(b["Rarity"])) return 1;
      if(RARITY_ORDER.indexOf(a["Rarity"]) < RARITY_ORDER.indexOf(b["Rarity"])) return -1;

      return 0;
    });

    // それぞれの勢力の非ユニットを保存していく
    for(let faction in Factions2Save) {
      let output_text  = `// [GCDC:StartFaction] - 編集者へ：StartからEndまでコメント部分も一緒で投稿してください` + `${NL}`;
      output_text     += cautionary_statement;
      output_text     += `// ${this.GwentCards.CardData.Version}` + `${NL}`;
      output_text     += `*** コスト別アーティファクト/スペシャル一覧` + `${NL}`;
      output_text     += `{|class="sort filter"` + `${NL}`;
      output_text     += `|center:|left:|center:|left:|c` + `${NL}`;
      output_text     += `|~種類|center:カード名|コスト|center:カテゴリー|` + `${NL}`;

      Cards.forEach(Card => {
        // チュートリアルカードを無視するかどうか
        // デフォルトでは無視する
        // "CardId: 202892" はチュートリアルだがトークン扱いなので個別に弾く
        if(this.Tutorial === false) {
          if(Card.Cardset === GWENT[lang]["Cardset"][2]) return;
          if(Card.CardId  === "202892") return;
        }

        // 必要ないものを弾く
        if(Card.Faction !== Factions2Save[faction] && Card.Faction2 !== Factions2Save[faction]) return;
        if(Card.CardType !== "アーティファクト" && Card.CardType !== "スペシャル") return;
        if(Card.Cardset === "トークン" && Card.CardType !== "ストラタジェム") return;
  
        // どのカードのデータを作成するかを決めたら
        // this.seesaaTableFormat() で個々のカードを変換する
        output_text += this.seesaaTableFormat(Card,2);
      });
      output_text += `|}` + `${NL}`;
      output_text += `// [GCDC:EndFaction]` + `${NL}${NL}`;

      let fpath = path.join(
        dpath_v_f,
        `${faction}_NonUnit.utf8.txt`
      );
  
      try {
        fs.writeFileSync(fpath, output_text);
      } catch(e) {
        console.log(e);
      }
    }
  }

  /*
  各拡張セットのカード一覧を作成する関数

  保存先のディレクトリと言語を受け取る
  初期値は 
  dpath = ''
  lang  = 'ja-jp'
  単体で使わず make() で全部作ることを推奨
  保存のファイル名は {拡張名}.utf8.txt に固定してある
  --------------------------------------------------------*/
  saveCardset(dpath_v_c = '', lang = 'ja-jp') {
    let Cards = this.GwentCards.CardData[lang].Cards;

    let Cardset2Save = {
      "Starter"             : "スターター",
      "Baseset"             : "基本セット",
      "Thronebreaker"       : "奪われし玉座",
      "CrimsonCurse"        : "紅き血の呪縛",
      "Novigrad"            : "ノヴィグラド",
      "IronJudgement"       : "鉄の裁定",
      "MerchantOfOfir"      : "オフィルの商人",
      "MasterMirror"        : "鏡の達人",
      "WayOfTheWitcher"     : "ウィッチャーの流儀",
      "PriceOfPower"        : "力の代償",
      "YearOfTheCursedToad" : "呪われたカエル年",
    };

    // カードデータをソートしておく
    const FACTION_ORDER    = ["ニュートラル","モンスター","ニルフガード","北方諸国","スコイア＝テル","スケリッジ","シンジケート"];
    const TYPE_ORDER_PRE   = ["ストラタジェム","リーダーアビリティ"];
    const TYPE_ORDER       = ["ユニット","スペシャル","アーティファクト"];
    const RARITY_ORDER     = ["レジェンダリー","エピック","レア","コモン"];
    Cards.sort(function(a,b){

      // カードタイプ降順（リーダー、ストラタジェム以外を下に持っていく）
      if(TYPE_ORDER_PRE.indexOf(a["CardType"]) > TYPE_ORDER_PRE.indexOf(b["CardType"])) return -1;
      if(TYPE_ORDER_PRE.indexOf(a["CardType"]) < TYPE_ORDER_PRE.indexOf(b["CardType"])) return 1;

      // 構築コスト降順
      if(a["Provision"] > b["Provision"]) return -1;
      if(a["Provision"] < b["Provision"]) return 1;

      // カードタイプ降順（アーティファクト、スペシャル、ユニットの順にする）
      if(TYPE_ORDER.indexOf(a["CardType"]) > TYPE_ORDER.indexOf(b["CardType"])) return -1;
      if(TYPE_ORDER.indexOf(a["CardType"]) < TYPE_ORDER.indexOf(b["CardType"])) return 1;

      // 戦力降順
      if(a["Power"] > b["Power"]) return -1;
      if(a["Power"] < b["Power"]) return 1;

      // レアリティ昇順
      if(RARITY_ORDER.indexOf(a["Rarity"]) > RARITY_ORDER.indexOf(b["Rarity"])) return 1;
      if(RARITY_ORDER.indexOf(a["Rarity"]) < RARITY_ORDER.indexOf(b["Rarity"])) return -1;

      return 0;
    });

    // それぞれのカードセットを保存していく
    for(let cardset in Cardset2Save) {
      let output_text  = `// [GCDC:StartCardset] - 編集者へ：StartからEndまでコメント部分も一緒で投稿してください` + `${NL}`;
      output_text     += cautionary_statement;
      output_text     += `// ${this.GwentCards.CardData.Version}` + `${NL}`;

      // 勢力別にループさせる
      FACTION_ORDER.forEach( faction => {
        if(cardset==="Novigrad" && faction!=="シンジケート") return;

        let faction_count = 0;
        let faction_text = `** ${faction}` + `${NL}`;
        faction_text += `|center:|left:|center:|center:|left:|c` + `${NL}`;
        faction_text += `|~種類|center:カード名|戦力|コスト|center:カテゴリー|` + `${NL}`;

        Cards.forEach(Card => {
          // チュートリアルカードを無視するかどうか
          // デフォルトでは無視する
          // "CardId: 202892" はチュートリアルだがトークン扱いなので個別に弾く
          if(this.Tutorial === false) {
            if(Card.Cardset === GWENT[lang]["Cardset"][2]) return;
            if(Card.CardId  === "202892") return;
          }
  
          // 必要ないものを弾く
          if(Card.Cardset !== Cardset2Save[cardset]) return;
          if(Card.Faction !== faction) return;
          if(Card.CardType === "リーダーアビリティ") return;
          if(Card.Cardset === "トークン" && Card.CardType !== "ストラタジェム") return;
    
          // どのカードのデータを作成するかを決めたら
          // this.seesaaTableFormat() で個々のカードを変換する
          faction_text += this.seesaaTableFormat(Card,1);
          faction_count += 1;
        });

        if(faction_count === 0) {
          output_text += `** ${faction}` + `${NL}`;
          output_text += `&color(#686868){（「${Cardset2Save[cardset]}」に含まれる${faction}のカードは存在しない）}` + `${NL}${NL}`;
        } else {
          output_text += faction_text + `${NL}`;
        }
      })

      output_text += `// [GCDC:EndCardset]` + `${NL}${NL}`;

      let fpath = path.join(
        dpath_v_c,
        `${cardset}.utf8.txt`
      );
  
      try {
        fs.writeFileSync(fpath, output_text);
      } catch(e) {
        console.log(e);
      }
    }
  }

  /*
  1枚のカードデータを seesaa 用のフォーマットにして
  テキストデータを返す
  --------------------------------------------------------*/
  seesaaCardFormat(Card, lang = 'ja-jp') {
    let seesaa_text = "";

    // カードデータのヘッダー
    seesaa_text  = `// [GCDC:StartCard] - 編集者へ：StartからEndまでコメント部分も一緒で投稿してください` + `${NL}`;
    seesaa_text += `// [CardId]: ${Card.CardId}, [DebugName]: ${Card.DebugName}` + `${NL}`;
    seesaa_text += `|w(100):center:bgcolor(#333333):color(#f3f3fe)|left:|c` + `${NL}`;

    // カードデータの本体
    seesaa_text += `|!カード名|${Card.Name}|` + `${NL}`;
    // 英語カード名は DebugName で代用できる（一部のトークンは注意）
    seesaa_text += `|!英語カード名|${Card.DebugName}|` + `${NL}`;
    seesaa_text += `|!勢力|${SEESAA.linkFaction(Card.Faction)}|` + `${NL}`;
    seesaa_text += `|!カードタイプ|${Card.CardType}|` + `${NL}`;
    seesaa_text += `|!カテゴリ|${SEESAA.linkCategory(Card.Categories.join(', '))}|` + `${NL}`;
    seesaa_text += `|!構築コスト|${Card.Provision}|` + `${NL}`;
    seesaa_text += `|!戦力|${Card.Power}|` + `${NL}`;
    seesaa_text += `|!アーマー|${Card.Armor}|` + `${NL}`;
    seesaa_text += `|!アビリティ|${SEESAA.convertAbility(Card.Ability)}|` + `${NL}`;
    seesaa_text += `|!レアリティ|${SEESAA.convertRarity(Card.Rarity)}|` + `${NL}`;
    seesaa_text += `|!カードセット|${SEESAA.linkCardset(Card.Cardset)}|` + `${NL}`;
    seesaa_text += `|!フレーバー~~テキスト|${SEESAA.convertFlavor(Card.Flavor)}|` + `${NL}`;
    seesaa_text += `|!イラスト|${Card.Artist}|` + `${NL}`;
   
    // カードデータのフッター
    seesaa_text += `// [Version]: ${this.GwentCards.CardData.Version}` + `${NL}`;
    if(Card.Changelog !== undefined) {
      seesaa_text += `// ------------------------------` + `${NL}`;;
      seesaa_text += `// [${GWENT[lang]["BasicTerm"]["Changelog"]}]: ${Card.Changelog.Summary}` + `${NL}`;
      for(let prop in Card.Changelog) {
        if(prop === "Summary") continue;
        if(prop === "Ability" || prop === "Flavor") {
          seesaa_text += `// [${GWENT[lang]["BasicTerm"][prop]} - ${GWENT[lang]["BasicTerm"]["Previous"]}]:` + `${NL}`;
          seesaa_text += `// ${String(Card.Changelog[prop]).replace(/\\n/g, `${NL}// `)}` + `${NL}`;
          continue;
        }

        // 通常のプロパティ
        seesaa_text += `// [${GWENT[lang]["BasicTerm"][prop]}]: ${Card.Changelog[prop]} -> ${Card[prop]}` + `${NL}`;
      }
      seesaa_text += `// [${GWENT[lang]["BasicTerm"]["PreviousVersion"]}]: ${this.GwentCards.CardData.PreviousVersion}` + `${NL}`;
      seesaa_text += `// ------------------------------` + `${NL}`;
    }
    seesaa_text += `// [GCDC:EndCard]` + `${NL}${NL}`;

    return seesaa_text;
  }

  /*
  特定のカード一覧のテキストを返す関数
  --------------------------------------------------------*/
  seesaaTableFormat(Card, option = 0) {
    let seesaa_text = "";

    // 1列目：種類
    seesaa_text += `|`;
    if(Card.Rarity==="レジェンダリー") seesaa_text += SEESAA.CONSTANTS["BGColorLegendary"];
    if(Card.Rarity==="エピック")       seesaa_text += SEESAA.CONSTANTS["BGColorEpic"];
    if(Card.Rarity==="レア")           seesaa_text += SEESAA.CONSTANTS["BGColorRare"];
    if(Card.Rarity==="コモン")         seesaa_text += SEESAA.CONSTANTS["BGColorCommon"];

    seesaa_text += `:`;
    if(Card.CardType==="ストラタジェム")   seesaa_text += SEESAA.CONSTANTS["IconStratagem"];
    if(Card.CardType==="アーティファクト") seesaa_text += SEESAA.CONSTANTS["IconArtifact"];
    if(Card.CardType==="スペシャル")       seesaa_text += SEESAA.CONSTANTS["IconSpecial"];
    if(Card.CardType==="ユニット")         seesaa_text += SEESAA.CONSTANTS["IconUnit"];

    // 2列目：カード名
    seesaa_text += `|`;
    seesaa_text += `[[${Card.Name}]]`;

    if(option === 1) {
      // 戦力とコストを別列で表記
      seesaa_text += `|`;
      if(Card.Power=="0") {
        seesaa_text += `-`;
      } else {
        seesaa_text += `${Card.Power}`;
      }
      seesaa_text += `|`;
      seesaa_text += `${Card.Provision}`;
    } else if(option === 2) {
      // コストのみ表記
      seesaa_text += `|`;
      seesaa_text += `${Card.Provision}`;
    } else {
      // デフォルト
      // 3列目戦力/コスト表記
      seesaa_text += `|`;
      if(Card.Power=="0") {
        seesaa_text += `-/${Card.Provision}`;
      } else {
        seesaa_text += `${Card.Power}/${Card.Provision}`;
      }
    }

    // 4列目：カテゴリー
    seesaa_text += `|`;
    seesaa_text += SEESAA.linkCategory(Card.Categories.join(', '));

    // 行閉じる
    seesaa_text += `|` + `${NL}`;

    return seesaa_text;
  }
}

module.exports = GwentCards2Seesaa;
