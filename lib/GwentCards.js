const fs = require("fs"); // いわゆるI/O処理を行う標準ライブラリ
const path = require("path"); // ファイルパスを扱うための標準ライブラリ
const LDic = require("./GwentLocalizeDictionary"); // ローカライズの対応辞書のようなものを作成する自作関数
const GWENT = require("./GwentConstants"); // ローカライズファイルに記載されていないような基本的な用語対応辞書
const BigInt = require("big-integer"); // Javascriptで64ビット整数を扱うための追加ライブラリ（要npmインストール）
const {XMLParser} = require("fast-xml-parser"); // XMLデータをJSONに変換してくれる追加ライブラリ（要npmインストール）

// fast-xml-parser用のオプション
// グウェントの重要なデータは属性値で書かれていることが多いので
// 属性値を「@_」を頭につけてパースするように指示する
// デフォルトだと属性値を全部無視してしまう
const XMLOPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix : "@_"
};
const parser = new XMLParser(XMLOPTIONS);

/* =========================================================
GwentCardsクラスは指定したバージョンのデータがあれば
そのバージョンのカードデータを構築する

var gwentcards    = new GwentCards("v.9.6.0");
var cardlist_json = gwentcards.getJSON();

といった形で利用する

データのディレクトリ構造に依存するので
「DataDir/各Version/各ファイル」となるように注意
settings.json も参照してもらいたい

デフォルトでは「data/各Version/各ファイル」としている
========================================================= */
class GwentCards {

  /*
  コンストラクタではバージョンと設定ファイルのパスを受け取る。
  その後、初期化関数を呼び出す
  --------------------------------------------------------*/
  constructor(Version, SettingsPath) {
    this.Version = Version;
    this.SettingsPath = SettingsPath;
    this.init();
  }

  /*
  初期化では設定ファイルとその他必要なファイルを読み込む
  そしてカードデータを生成する
  ------------------------------------------------------- */
  init() {
    // 必要なファイルを読み込む
    this.loadSettings();
    this.loadTemplates();
    this.loadAbilities();
    this.loadBlackboards();
    this.loadArtDefinitions();
    this.loadLoacalize();

    // カードデータを記録した1つのJSONを作る
    this.makeJSON();
  }

  /*
  設定ファイルを読み込み、メンバ変数に代入
  ------------------------------------------------------- */
  loadSettings() {
    // 設定ファイルが指定されていないならデフォルト設定を入れておく
    if(this.SettingsPath == "" || typeof(this.SettingsPath) === "undefined") {
      this.SettingsPath = path.join("settings.json");
    }
    this.Settings = JSON.parse(fs.readFileSync(this.SettingsPath, "utf8"));

    // バージョンが指定されていなかったら
    // 設定ファイルから最新バージョンを設定する
    if(this.Version=="" || typeof(this.Version)==="undefined") {
      this.setNewestVersion();
    }

    // バージョンの更新日を代入
    // settings.json で設定していない場合はエラーにせずに undefined になる
    if(typeof(this.Settings.Dataset[this.Version])!=="undefined") {
      this.LastUpdate = this.Settings.Dataset[this.Version]["LastUpdate"];
    }
  }

  /*
  version に設定ファイルに記載されている最新バージョンを代入
  ------------------------------------------------------- */
  setNewestVersion() {
    let versions = Object.keys(this.Settings.Dataset);
    let newest   = versions.slice(-1)[0];
    this.Version = newest;
  }

  /*
  Template.xml を読み込み、メンバ変数に代入

  このファイルにはカードの基本情報が記述されている
  アビリティ内容などは直接記述されておらず
  それを参照するためのIDのみが記録されている
  ------------------------------------------------------- */
  loadTemplates() {
    let fpath = path.join(
      "./",
      this.Settings.DataDir,
      this.Version,
      this.Settings.FilePath.Templates
    );
    // パース後の「Templates.Template」プロパティを入れる理由はxmlファイルを
    // fast-xml-parser でパースしたデータを元に決めた
    this.Templates = parser.parse(fs.readFileSync(fpath, "utf8")).Templates.Template;
  }

  /*
  Abilities.xml を読み込み、メンバ変数に代入

  このファイルはカードのアビリティテキストに
  変数で記述されている値の初期値を持っている
  このファイルが一番大きく、パースにも時間がかかる
  ------------------------------------------------------- */
  loadAbilities() {
    let fpath = path.join(
      "./",
      this.Settings.DataDir,
      this.Version,
      this.Settings.FilePath.Abilities
    );
    this.Abilities = parser.parse(fs.readFileSync(fpath, "utf8")).Abilities.Ability;
  }

  /*
  Blackbords.xml を読み込み、メンバ変数に代入
  
  「試合中に妖婆をプレイした枚数」のように
  複数のカードにまたがって変化する値を
  反映させるための変数群が設定されている

  基本的に全部ゼロなので読み込まなくても対処できるが
  将来を見越して読み込んでおく

  このデータは扱いがめんどくさく
  あとあとの楽のために
  この段階で Type="IntVar" の変数の連想配列を作っておく
  ------------------------------------------------------- */
  loadBlackboards() {
    let fpath = path.join(
      "./",
      this.Settings.DataDir,
      this.Version,
      this.Settings.FilePath.Blackboards
    );
    this.Blackboards = parser.parse(fs.readFileSync(fpath, "utf8")).BlackboardsCollection.Blackboard;

    let BBVariables = {};
    this.Blackboards.forEach(Blackboard => {
      for(let key in Blackboard.Variables) {
        if(Blackboard.Variables[key]["@_Type"] === "IntVar") {
          BBVariables["B.P."+Blackboard.Variables[key]["@_Name"]] = Blackboard.Variables[key]["@_V"];
        }
      }
    });
    this.BBVariables = BBVariables;
  }

  /*
  ArtDefinisions.xml を読み込み、メンバ変数に代入
  このファイルはカード絵やアバターの基本情報を記述している
  ------------------------------------------------------- */
  loadArtDefinitions() {
    let fpath = path.join(
      "./",
      this.Settings.DataDir,
      this.Version,
      this.Settings.FilePath.ArtDefinitions
    );
    this.ArtDefinitions = parser.parse(fs.readFileSync(fpath, "utf8")).ArtDefinitions.ArtDefinition;
  }

  /*
  設定ファイルを元にローカライズファイルを読み込み、
  GWENTオブジェクトの各言語ローカライズ部分にデータを追加する
  ------------------------------------------------------- */
  loadLoacalize() {
    let langs  = Object.keys(this.Settings.LocalizePath);
    langs.forEach(lang => {
      let fpath = path.join(
        "./",
        this.Settings.DataDir,
        this.Version,
        this.Settings.LocalizePath[lang]
      );

      // この直後で行う操作で GWENT[lang] が
      // undefined だったときにエラーとなる
      // エラー文を見てもわかりにくいのでわかりやすくする
      if(typeof(GWENT[lang]) === "undefined") {
        throw `${lang} is undefined in GwentConstants.js`;
      }
      GWENT[lang].Dictionary = {};
      
      // この Object.assign() マジ便利
      Object.assign(GWENT[lang].Dictionary, LDic(fpath));
    });
  }

  /*
  全カードデータを記録したJSONを構築する
  ------------------------------------------------------- */
  makeJSON() {
    // 構造全体の初期化
    this.CardData = {};
    this.CardData.Version    = this.Version;
    this.CardData.LastUpdate = this.LastUpdate;

    let langs = Object.keys(this.Settings.LocalizePath);
    langs.forEach(lang => {
      this.CardData[lang] = {};
      this.CardData[lang] = {};
      this.CardData[lang].Factions = [];
      this.CardData[lang].Cards    = [];

      this.Templates.forEach( Template => {
        let card_id = parseInt(Template["@_Id"]);
        // card_id が100番台のものはカードではなく勢力そのものである
        // 関連する文章はベータ版で使われたもの
        // そのためシンジケートの"Flavor"は存在せず
        // 「Ignore」と表示される
        // それだと気持ち悪いので「Name」だけはちゃんと表示させるようにした
        if((card_id >= 100) && (card_id <= 200)) {
          let faction = {
            "Name"  : GWENT[lang]["Faction"][Template.FactionId],
            "Flavor": GWENT[lang].Dictionary[(Template["@_Id"]+"_fluff")]
          }
          this.CardData[lang].Factions.push(faction);
          return;
        }

        // とくに意味のない未使用データなので無視する
        if(
          (card_id == 202570) || (card_id == 202571) || 
          (card_id == 202698) || (card_id == 202699)
        ) {
          return;
        }

        let card = {
          "CardId"     : Template["@_Id"],
          "DebugName"  : Template["@_DebugName"],
          "Collectable": (Template["@_Availability"]==0 ? false : true),
          "Faction"    : GWENT[lang]["Faction"][Template.FactionId],
          "Faction2"   : GWENT[lang]["Faction"][Template.SecondaryFactionId],
          "CardType"   : GWENT[lang]["CardType"][Template.Type],
          "Rarity"     : GWENT[lang]["Rarity"][Template.Rarity],
          "Border"     : GWENT[lang]["Border"][Template.Tier],
          "Cardset"    : GWENT[lang]["Cardset"][Template["@_Availability"]],
          "Name"       : GWENT[lang].Dictionary[(Template["@_Id"]+"_name")],
          "Categories" : this.solveCategories(Template, lang),
          "Provision"  : Template.Provision,
          "Power"      : Template.Power,
          "Armor"      : Template.Armor,
          "Ability"    : this.solveAbility(Template, lang),
          "Keywords"   : this.solveKeywords(Template, lang),
          "Flavor"     : GWENT[lang].Dictionary[(Template["@_Id"]+"_fluff")],
          "Artist"     : this.solveArtist(Template, lang),
        };
        this.CardData[lang].Cards.push(card);

        // debug
        // console.log(card);
        // if(Template["@_Id"]=="203057") console.log(card);
        // if(Template["@_Id"]=="203051") console.log(card);
        // if(Template["@_Id"]=="203095") console.log(card);
      });
    });
  }

  /*
  カテゴリーデータを解決して配列で返す

  ゲームの内部データでは
  第1カテゴリーと第2カテテゴリー以下は
  別物として扱われている
  そうではあるが、ゲームの表記に合わせるために
  すべてのカテゴリを1つの配列にまとめる
  第1カテゴリは配列の先頭とする

  なおカテゴリーはビットフラグで表現されており
  表示させるまでの操作は非直観的
  BigInt を使う必要があるのもここの操作
  ------------------------------------------------------- */
  solveCategories(CardTemplate, lang) {
    let primary_categories = [];
    let secondary_categories = [];
    let data = [];

    // 第1カテゴリー（命名法をみるに1つしか設定されない予定っぽい）
    data[0] = BigInt(CardTemplate.PrimaryCategory.e0["@_V"]);
    data[1] = BigInt(CardTemplate.PrimaryCategory.e1["@_V"]);
    data[2] = BigInt(CardTemplate.PrimaryCategory.e2["@_V"]);
    for(let i=0;i<=2;i++) {
      for(let j=1;j<=64;j++) {
        if(data[i].shiftRight(j).and(1).isZero()!==true) {
          primary_categories.push(GWENT[lang].Dictionary["card_category_"+(i*64+j)]);
        }
      }
    }

    // 第2カテゴリー以下
    data[0] = BigInt(CardTemplate.Categories.e0["@_V"]);
    data[1] = BigInt(CardTemplate.Categories.e1["@_V"]);
    data[2] = BigInt(CardTemplate.Categories.e2["@_V"]);
    for(let i=0;i<=2;i++) {
      for(let j=1;j<=64;j++) {
        if(data[i].shiftRight(j).and(1).isZero()!==true) {
          secondary_categories.push(GWENT[lang].Dictionary["card_category_"+(i*64+j)]);
        }
      }
    }

    return primary_categories.concat(secondary_categories);
  }

  /*
  アビリティテキストを解決する

  "何れかの敵陣列にある全てのユニットに{Damage}ずつダメージを与える。"
  というような形でダメージ量などの数式が{ }に囲まれて記載されている

  そこで各カードの変数を配列化して、総当たりで変換後に評価する
  本来であれば{ }内の数式を構文解析すべきだが
  変数の数が数えられるぐらいしかないので楽なほうを選んだ
  ------------------------------------------------------- */
  solveAbility(CardTemplate, lang) {

    // まずアビリティテキストを取得する
    // タグ付きなので変換しておく
    let ability_text_raw = GWENT[lang].Dictionary[(CardTemplate["@_Id"]+"_tooltip")];
    if(typeof(ability_text_raw)==="undefined") {
      // debug
      // console.log(CardTemplate["@_Id"]);
      // console.log(CardTemplate.DebugName);
      return "";
    }
    let ability_text_no_tag = ability_text_raw.replace(/(<([^>]+)>)/gi, '');

    // カード固有のアビリティ変数を Abilities.xml から探して配列化する
    // アビリティ変数は Abilities.Ability.TemporaryVariables にある
    // カードの基本変数は Template.Provision などと表記されているので作っておく
    let AbilityVariables = {
      "Template.Provision": CardTemplate.Provision,
      "Template.Power"    : CardTemplate.Power,
      "Template.Armor"    : CardTemplate.Armor
    };
    let Ability = this.Abilities.find((e) => e["@_Id"] === (CardTemplate["@_Id"]));
    // TemporaryVariables：普通のダメージ量など設定
    if(typeof(Ability.TemporaryVariables)!=="undefined") {
      for(let key in Ability.TemporaryVariables) {
        if(Ability.TemporaryVariables[key]["@_Type"] === "IntVar") {
          AbilityVariables[Ability.TemporaryVariables[key]["@_Name"]] = Ability.TemporaryVariables[key]["@_V"];
        }
      }
    }
    // PersistentVariables：忍耐などで恒久的に変わってしまう数値
    // TemporaryVariablesと同じ変数名だと上書きされるが
    // カードデータの表記では区別されていないので大丈夫なんだろう……
    if(typeof(Ability.PersistentVariables)!=="undefined") {
      for(let key in Ability.PersistentVariables) {
        if(Ability.PersistentVariables[key]["@_Type"] === "IntVar") {
          AbilityVariables[Ability.PersistentVariables[key]["@_Name"]] = Ability.PersistentVariables[key]["@_V"];
        }
      }
    }

    // AbilityFormulaオブジェクトという変換表を作る
    // ようはアビリティテキスト内の{ }数式を配列にして数値に変換する
    let RE = /{.+?}/g;
    // この時点で数式がないなら ability_text_no_tag を返す
    if(!RE.test(ability_text_no_tag)) return ability_text_no_tag;
    let Formulas = ability_text_no_tag.match(RE);

    let AbilityFormulas = [];
    Formulas.forEach(formula => {
      let AbilityFormula = {
        "Text"    : formula,
        "Evaluate": ""
      };
      let formula_text = formula;

      // Blackboard変数を持っていれば先に変換しておく
      for(let key in this.BBVariables) {
        RE = new RegExp(String.raw`(?<=[^0-9a-zA-Z_¥.]+)(${key})(?=[^0-9a-zA-Z_¥.]+)`, "ig");
        formula_text = formula_text.replace(RE, this.BBVariables[key]);
      }

      // 次にカード固有の変数を変換する
      // Damege, Damage2 のように変数名がいくつかあるので
      // 単純に文字列を数値に置き換えると変なことになる
      // 変数名に使われない文字列で囲まれている
      for(let key in AbilityVariables) {
        RE = new RegExp(String.raw`(?<=[^0-9a-zA-Z_¥.]+)(${key})(?=[^0-9a-zA-Z_¥.]+)`, "ig");
        formula_text = formula_text.replace(RE, AbilityVariables[key]);
      }

      // すでに数値に変換されているので { } を除いて評価する
      formula_text = formula_text.replace(/({|})/g, "");
      AbilityFormula.Evaluate = eval(formula_text);
      AbilityFormulas.push(AbilityFormula);
    });

    // 最後に数式を評価値に変換する
    // { } 内には四則演算記号があるのでエスケープが必要
    AbilityFormulas.forEach(ele => {
      let txt = ele.Text.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
      RE = new RegExp(String.raw`${txt}`, "ig");
      ability_text_no_tag = ability_text_no_tag.replace(RE, ele.Evaluate);
    });
    
    return ability_text_no_tag;
  }

  /*
  アビリティテキストのキーワードの配列を作る

  "<keyword=initiative>初動</keyword>"
  というような形でキーワードが書かれている
  ------------------------------------------------------- */
  solveKeywords(CardTemplate, lang) {
    let Keywords = {};
    // まずアビリティテキストを取得する
    // 今度はこのタグの中身を抽出する
    let ability_text_raw = GWENT[lang].Dictionary[(CardTemplate["@_Id"]+"_tooltip")];
    let RE = new RegExp(String.raw`(?<=\<keyword\=).*?(?=\>)`, "ig");
    if(!RE.test(ability_text_raw)) return Keywords;
    ability_text_raw.match(RE).forEach(ele => {
      // 先頭が大文字なのか小文字なのか定まっていないので
      // ローカライズファイルの形式である小文字に合わせる
      // 今後 replace のエラーがでた場合は
      // ローカライズファイルの形式を疑うこと
      ele = ele.toLowerCase();
      let txt = GWENT[lang].Dictionary["keyword_"+ele];
      txt = txt.replace(/(<([^>]+)>)/gi, ''); // キーワード説明文にがあるので外す
      
      // 先頭は大文字に揃える
      Keywords[(ele.charAt(0).toUpperCase() + ele.slice(1).toLowerCase())] = txt;
    });
    return Keywords;
  }

  /*
  アーティスト名を解決する

  全言語一緒なので lang は必要ない
  ------------------------------------------------------- */
  solveArtist(CardElement, lang) {
    let ArtId = CardElement["@_ArtId"];
    let ArtDefinition = this.ArtDefinitions.find((e) => e["@_ArtId"] === ArtId);
    return ArtDefinition["@_ArtistName"];
  }

  /*
  これを唯一のパブリック関数にするつもり
  構築済みの全カードデータをJSONとして返す
  ------------------------------------------------------- */
  getJSON() {
    return this.CardData;
  }

  /*
  自身を JSON.stringfy() し、
  「DataDir/各Version/GwentCards.json」として保存する
  中間ファイルを残しておきたいときに使う

  可読性を上げたい場合は saveJSON(2) ぐらいが良いと思う
  ------------------------------------------------------- */
  saveJSON(spacer = 0) {
    let fpath = path.join(
      "./",
      this.Settings.DataDir,
      this.Version,
      "GwentCards.json"
    );
    try {
      fs.writeFileSync(fpath, JSON.stringify(this.CardData, null, spacer));
    } catch(e) {
      console.log(e);
    }
  }
};

module.exports = GwentCards;
