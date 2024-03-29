const fs = require("fs"); // いわゆるI/O処理を行う標準ライブラリ
const path = require("path"); // ファイルパスを扱うための標準ライブラリ
const LDic = require("./GwentLocalizeDictionary"); // ローカライズの対応辞書のようなものを作成する自作関数
const GWENT = require("./GwentConstants"); // ローカライズファイルに記載されていないような基本的な用語対応辞書
const GwentCardsDiff = require("./GwentCardsDiff"); // カードデータの変更点を抽出する自作関数
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
  コンストラクタではバージョンと設定ファイルのパスを受け取る
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

    // カードデータを記録した1つのJSONを作り、保存する
    this.makeJSON();
    this.saveJSON(this.Settings.JSONSpacer);
  }

  /*
  設定ファイルを読み込み、メンバ変数に代入
  ------------------------------------------------------- */
  loadSettings() {
    // 設定ファイルが指定されていないならデフォルト設定を入れておく
    if(this.SettingsPath == "" || this.SettingsPath === undefined) {
      this.SettingsPath = path.join("settings.json");
    }
    this.Settings = JSON.parse(fs.readFileSync(this.SettingsPath, "utf8"));

    // バージョンが指定されていなかったら
    // 設定ファイルから最新バージョンを設定する
    if(this.Version == "" || this.Version === undefined) {
      this.setNewestVersion();
    }
    if(this.Settings.Changelog === true) {
      this.setPreviousVersion();
    }

    // バージョンの更新日を代入
    // settings.json で設定していない場合はエラーにせずに undefined になる
    if(this.Settings.Dataset[this.Version] !== undefined) {
      this.LastUpdate = this.Settings.Dataset[this.Version]["LastUpdate"];
    }

    // DataDir と OutputDir が設定されていることを確認
    if(this.Settings.DataDir === undefined) {
      console.log(`[CAUTION]: DataDir required. Please check settings.json`);
    }
    if(this.Settings.OutputDir === undefined) {
      console.log(`[CAUTION]: OutputDir required. Please check settings.json`);
    }
  }

  /*
  this.Version に設定ファイルに記載されている最新バージョンを代入
  ------------------------------------------------------- */
  setNewestVersion() {
    let versions = Object.keys(this.Settings.Dataset);
    let newest   = versions.slice(-1)[0];
    this.Version = newest;
  }

  /*
  this.Version の一つ前のバージョンを this.PreviousVersion に代入
  ------------------------------------------------------- */
  setPreviousVersion() {
    let versions = Object.keys(this.Settings.Dataset);
    let index    = versions.indexOf(this.Version);
    if(index < 1) {
      // 前バージョンがみつからなかったときの処理
      console.log(`[CAUTION]: Can't find PreviousVersion of ${this.Version}`);
      this.Settings.Changelog = false;
    } else {
      this.PreviousVersion = versions[(index-1)];

      let fpath = path.join(
        "./",
        this.Settings.DataDir,
        this.PreviousVersion,
        "GwentCards.json"
      );
      this.CardDataPrevious = JSON.parse(fs.readFileSync(fpath, "utf8"));
    }
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
    // パース後の「Templates.Template」プロパティを入れる理由は
    // xmlファイルをfast-xml-parserでパースしたデータを元に決めた
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
      if(GWENT[lang] === undefined) {
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
    if(this.Settings.Changelog === true) {
      this.CardData.PreviousVersion = this.PreviousVersion;
    }

    let Langs = Object.keys(this.Settings.LocalizePath);
    Langs.forEach(lang => {
      this.CardData[lang] = {};
      this.CardData[lang] = {};
      this.CardData[lang].Factions = [];
      this.CardData[lang].Cards    = [];
      this.CardData[lang].Keywords = {};
      this.CardData[lang].Categories = [];

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
          (card_id == 202698) || (card_id == 202699) ||
          (card_id == 203186)
        ) {
          return;
        }

        // ジャーニーを表示するためのデータオンリーカード
        if(
          (card_id == 203133) || (card_id == 203134) || (card_id == 203135) || (card_id == 203136) || 
          (card_id == 203137) || (card_id == 203138) || (card_id == 203139) || (card_id == 203140)
        ) {
          return;
        }

        let Card = {
          "CardId"      : Template["@_Id"],
          "DebugName"   : Template["@_DebugName"],
          "NameGlobal"  : GWENT['en-us'].Dictionary[(Template["@_Id"]+"_name")],
          "Collectable" : (Template["@_Availability"]==0 ? false : true),
          "Faction"     : GWENT[lang]["Faction"][Template.FactionId],
          "Faction2"    : GWENT[lang]["Faction"][Template.SecondaryFactionId],
          "CardType"    : GWENT[lang]["CardType"][Template.Type],
          "Rarity"      : GWENT[lang]["Rarity"][Template.Rarity],
          "Border"      : GWENT[lang]["Border"][Template.Tier],
          "Cardset"     : GWENT[lang]["Cardset"][Template["@_Availability"]],
          "Name"        : GWENT[lang].Dictionary[(Template["@_Id"]+"_name")],
          "Categories"  : this.solveCategories(Template, lang),
          "Provision"   : Template.Provision,
          "Power"       : Template.Power,
          "Armor"       : Template.Armor,
          "Ability"     : this.solveAbility(Template, lang),
          "Keywords"    : this.solveKeywords(Template, lang),
          "Flavor"      : GWENT[lang].Dictionary[(Template["@_Id"]+"_fluff")],
          "Artist"      : this.solveArtist(Template, lang)
        };
        if(this.Settings.Changelog === true) {
          Card.Changelog = GwentCardsDiff.SingleCard(
            Card,
            this.CardDataPrevious,
            lang
          );
        }
        this.CardData[lang].Cards.push(Card);

        // debug
        // console.log(card);
        // if(Template["@_Id"]=="203057") console.log(Card);
        // if(Template["@_Id"]=="203051") console.log(Card);
        // if(Template["@_Id"]=="203095") console.log(Card);
      });

      // キーワードの変更を確認
      if(this.Settings.Changelog === true) {
        this.CardData[lang].KeywordChanged = GwentCardsDiff.Keywords(
          this.CardData[lang].Keywords,
          this.CardDataPrevious[lang].Keywords,
        );
      }
    });
  }

  /*
  カテゴリーデータを解決して配列で返す

  ゲームの内部データでは
  第1カテゴリと第2カテゴリ以下は
  別物として扱われている
  そうではあるが、ゲームの表記に合わせるために
  すべてのカテゴリを1つの配列にまとめる
  第1カテゴリは配列の先頭とする

  なおカテゴリーはビットフラグで表現されており
  表示させるまでの操作は非直感的
  BigInt を使う必要があるのもここの操作
  ------------------------------------------------------- */
  solveCategories(CardTemplate, lang) {
    let primary_categories = [];
    let secondary_categories = [];
    let categories = [];
    let data = [];

    // 第1カテゴリ（命名法をみるに1つしか設定されない予定っぽい）
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

    // 第2カテゴリ以下
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

    categories = primary_categories.concat(secondary_categories);
    categories.forEach(ele => {
      // 全登録カテゴリをリスト化する
      // null が存在するが、中間データとしてはこのままにしておく
      if(!this.CardData[lang].Categories.includes(ele)) this.CardData[lang].Categories.push(ele);
    });
    return categories;
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
    if(ability_text_raw === undefined) {
      // debug
      // console.log(CardTemplate["@_Id"]);
      // console.log(CardTemplate.DebugName);
      return "";
    }
    let ability_text_no_tag = ability_text_raw.replace(/(<([^>]+)>)/gi, '');

    // カード固有のアビリティ変数を Abilities.xml から探して配列化する
    // アビリティ変数は以下の2つの場所に保管されている
    // Abilities.Ability.TemporaryVariables
    // Abilities.Ability.PersistentVariables
    // また、カードの基本変数は Template.Provision などと表記されているので
    // まずはこれから作っておく
    let AbilityVariables = {
      "Template.Provision": CardTemplate.Provision,
      "Template.Power"    : CardTemplate.Power,
      "Template.Armor"    : CardTemplate.Armor
    };
    let InjectedAbilityVariables = { };
    let Ability = this.Abilities.find((e) => e["@_Id"] === (CardTemplate["@_Id"]));
    if(Ability === null) {
      throw `Can't find Ability in Abilities.xml.\nCardId:${CardTemplate["@_Id"]}, DebugName:${CardTemplate["@_DebugName"]}`;
    }

    // TemporaryVariables：ダメージ量など通常の数値を設定している
    if(Ability.TemporaryVariables !== undefined) {
      for(let key in Ability.TemporaryVariables) {
        if(Ability.TemporaryVariables[key]["@_Type"] === "IntVar") {
          AbilityVariables[Ability.TemporaryVariables[key]["@_Name"]] = Ability.TemporaryVariables[key]["@_V"];
        }
        if(Ability.TemporaryVariables[key]["@_Type"] === "InjectableAbilityVar") {
          InjectedAbilityVariables[Ability.TemporaryVariables[key]["@_Name"]] = Ability.TemporaryVariables[key]["@_V"];
        }
      }
    }

    // PersistentVariables：忍耐などで恒久的に変わってしまう数値を設定している
    // TemporaryVariablesと同じ変数名だと上書きされるが
    // カードデータの表記では区別されていないので、名前の衝突は大丈夫なんだろう……
    // PersistentVariables 内に InjectableAbilityVar はないという前提（v.10.7）
    if(Ability.PersistentVariables !== undefined) {
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
      // Damage, Damage2 のように変数名がいくつかあるので
      // 単純に文字列を数値に置き換えると変なことになる
      // 変数名に使われない文字列で囲まれている
      for(let key in AbilityVariables) {
        RE = new RegExp(String.raw`(?<=[^0-9a-zA-Z_¥.]+)(${key})(?=[^0-9a-zA-Z_¥.]+)`, "ig");
        formula_text = formula_text.replace(RE, AbilityVariables[key]);
      }

      // 次に注入アビリティを解決する
      // 複数ある場合のことを考えていなかったが、そのうち対応する
      var InjectableAbility = "";
      if(formula_text.match(/InjectableAbility/)) {
        InjectableAbility = this.solveInjectableAbility(CardTemplate, InjectedAbilityVariables["InjectableAbility"], lang);
      }

      // 次に{tainted}アビリティを解決する
      // InjectableAbilityの一種である
      if(CardTemplate["@_Id"] == 200530) {
        var tainted = "";
        if(formula_text.match(/tainted/)) {
          tainted = this.solveInjectableAbility(CardTemplate, InjectedAbilityVariables["tainted"], lang);
        }
      }

      // 次に{ale}アビリティを解決する
      // InjectableAbilityの一種である
      if(CardTemplate["@_Id"] == 200532) {
        var ale = "";
        if(formula_text.match(/ale/)) {
          ale = this.solveInjectableAbility(CardTemplate, InjectedAbilityVariables["ale"], lang);
        }
      }

      // すでに数値に変換されているので { } を除いてから評価する
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
  注入アビリティテキストを解決する

  アビリティと同様
  "このユニットは<keyword=shield>シールド</keyword>を失うたび、{Boost}ブーストを得る。"
  というような形でダメージ量などの数式が{ }に囲まれて記載されている
  つまり、入れ子状態になっているのでアビリティと同じように解決する
  ------------------------------------------------------- */
  solveInjectableAbility(CardTemplate, InjectableAbilityId, lang) {
    let injected_ability_text_raw = GWENT[lang].Dictionary[(InjectableAbilityId+"_tooltip_ia")];
    let injected_ability_text_no_tag = injected_ability_text_raw.replace(/(<([^>]+)>)/gi, '');
    if(injected_ability_text_no_tag === undefined) return "";

    let InjectableAbilityVariables = {
      "Template.Provision": CardTemplate.Provision,
      "Template.Power"    : CardTemplate.Power,
      "Template.Armor"    : CardTemplate.Armor
    };
    let InjectableAbility = this.Abilities.find((e) => (e["@_Type"] === "InjectableAbility" && e["@_Id"] === InjectableAbilityId));
    if(InjectableAbility === null) {
      throw `Can't find InjectableAbility in Abilities.xml.\nCardId:${CardTemplate["@_Id"]}, DebugName:${CardTemplate["@_DebugName"]}, InjectableAbilityId:${InjectableAbilityId}`;
    }

    // TemporaryVariables：ダメージ量など通常の数値を設定している
    if(InjectableAbility.TemporaryVariables !== undefined) {
      for(let key in InjectableAbility.TemporaryVariables) {
        if(InjectableAbility.TemporaryVariables[key]["@_Type"] === "IntVar") {
          InjectableAbilityVariables[InjectableAbility.TemporaryVariables[key]["@_Name"]] = InjectableAbility.TemporaryVariables[key]["@_V"];
        }
      }
    }

    // PersistentVariables：忍耐などで恒久的に変わってしまう数値を設定している
    // 今のところ 注入アビリティに PersistentVariables を使うアビリティはないようだ
    if(InjectableAbility.PersistentVariables !== undefined) {
      for(let key in InjectableAbility.PersistentVariables) {
        if(InjectableAbility.PersistentVariables[key]["@_Type"] === "IntVar") {
          InjectableAbilityVariables[InjectableAbility.PersistentVariables[key]["@_Name"]] = InjectableAbility.PersistentVariables[key]["@_V"];
        }
      }
    }

    let RE = /{.+?}/g;
    // この時点で数式がないなら injected_ability_text_no_tag を返す
    if(!RE.test(injected_ability_text_no_tag)) return injected_ability_text_no_tag;
    let InjectableFormulas = injected_ability_text_no_tag.match(RE);

    let InjectableAbilityFormulas = [];
    InjectableFormulas.forEach(formula => {
      let InjectableAbilityFormula = {
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
      // Damage, Damage2 のように変数名がいくつかあるので
      // 単純に文字列を数値に置き換えると変なことになる
      // 変数名に使われない文字列で囲まれている
      for(let key in InjectableAbilityVariables) {
        RE = new RegExp(String.raw`(?<=[^0-9a-zA-Z_¥.]+)(${key})(?=[^0-9a-zA-Z_¥.]+)`, "ig");
        formula_text = formula_text.replace(RE, InjectableAbilityVariables[key]);
      }

      // すでに数値に変換されているので { } を除いてから評価する
      formula_text = formula_text.replace(/({|})/g, "");
      InjectableAbilityFormula.Evaluate = eval(formula_text);
      InjectableAbilityFormulas.push(InjectableAbilityFormula);
    });

    // 最後に数式を評価値に変換する
    // { } 内には四則演算記号があるのでエスケープが必要
    InjectableAbilityFormulas.forEach(ele => {
      let txt = ele.Text.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
      RE = new RegExp(String.raw`${txt}`, "ig");
      injected_ability_text_no_tag = injected_ability_text_no_tag.replace(RE, ele.Evaluate);
    });
    
    return injected_ability_text_no_tag;
  }

  /*
  アビリティテキストのキーワードの配列を作る

  "<keyword=initiative>初動</keyword>"
  というような形でキーワードが書かれている
  
  関数としてはカードひとつひとつには
  キーワードの配列（連想配列のキーとなる）を返し
  その裏で全カードデータ（this.CardData[lang].Keywords）に
  キーワードの詳細を入力する
  ------------------------------------------------------- */
  solveKeywords(CardTemplate, lang) {
    let KeywordArray = [];
    let RE = new RegExp(String.raw`(?<=\<keyword\=).*?(?=\>)`, "ig");

    // まずアビリティテキストを取得する
    // 今度はこのタグの中身を抽出する
    let ability_text_raw = GWENT[lang].Dictionary[(CardTemplate["@_Id"]+"_tooltip")];
    if(RE.test(ability_text_raw)) {
      ability_text_raw.match(RE).forEach(ele => {
        // 先頭が大文字なのか小文字なのか定まっていないので
        // ローカライズファイルの形式である小文字に合わせる
        // 今後 replace のエラーがでた場合は
        // ローカライズファイルの形式を疑うこと
        // 先頭は大文字に揃える形で統一する
        let ele_query    = ele.toLowerCase();
        let ele_nomalize = (ele.charAt(0).toUpperCase() + ele.slice(1).toLowerCase());
        let txt = GWENT[lang].Dictionary["keyword_"+ele_query];
        txt = txt.replace(/(<([^>]+)>)/gi, ''); // キーワード説明文にタグがあるので外す
      
        // KeywordArray にはキーとなる配列だけ（重複を除いた）
        // 個々のキーワードは hasOwnProperty で調べてもいいが、上書きで OK
        if(!KeywordArray.includes(ele_nomalize)) KeywordArray.push(ele_nomalize);
        this.CardData[lang].Keywords[(ele.charAt(0).toUpperCase() + ele.slice(1).toLowerCase())] = txt;
      });
    };

    // 注入アビリティがある場合、そのキーワードも抜き取る
    // 注入アビリティは1つだけという想定
    let Ability = this.Abilities.find((e) => e["@_Id"] === (CardTemplate["@_Id"]));
    let InjectableAbilityId;
    if(Ability.TemporaryVariables !== undefined) {
      for(let key in Ability.TemporaryVariables) {
        if(Ability.TemporaryVariables[key]["@_Type"] === "InjectableAbilityVar") {
          InjectableAbilityId = Ability.TemporaryVariables[key]["@_V"];
        }
      }
    }

    if(InjectableAbilityId !== undefined) {
      let injected_ability_text_raw = GWENT[lang].Dictionary[(InjectableAbilityId+"_tooltip_ia")];
      if(RE.test(injected_ability_text_raw)) {
        injected_ability_text_raw.match(RE).forEach(ele => {
          let ele_query    = ele.toLowerCase();
          let ele_nomalize = (ele.charAt(0).toUpperCase() + ele.slice(1).toLowerCase());
          let txt = GWENT[lang].Dictionary["keyword_"+ele_query];
          txt = txt.replace(/(<([^>]+)>)/gi, '');

          if(!KeywordArray.includes(ele_nomalize)) KeywordArray.push(ele_nomalize);
          this.CardData[lang].Keywords[(ele.charAt(0).toUpperCase() + ele.slice(1).toLowerCase())] = txt;
        });
      };
    }
    
    return KeywordArray;
  }

  /*
  アーティスト名を解決する

  全言語一緒なので lang は必要ない
  ------------------------------------------------------- */
  solveArtist(CardElement) {
    let ArtId = CardElement["@_ArtId"];
    let ArtDefinition = this.ArtDefinitions.find((e) => e["@_ArtId"] === ArtId);

    if(ArtDefinition === null) return "";
    if(ArtDefinition["@_ArtistName"] === undefined) return "";

    return ArtDefinition["@_ArtistName"];
  }

  /*
  SemanticTags で設定されているデータを解決して配列で返す

  データの内容は現在解析中。
  今の所、1～192までの数字をアンダースコアで囲った文字列
  の入った配列を返す。
  ------------------------------------------------------- */
  solveSemanticTags(CardTemplate, lang) {
    let semantic_tags = [];
    let data = [];

    // カテゴリデータと同じ形状をしている
    data[0] = BigInt(CardTemplate.SemanticTags.e0["@_V"]);
    data[1] = BigInt(CardTemplate.SemanticTags.e1["@_V"]);
    data[2] = BigInt(CardTemplate.SemanticTags.e2["@_V"]);
    for(let i=0;i<=2;i++) {
      for(let j=1;j<=64;j++) {
        if(data[i].shiftRight(j).and(1).isZero()!==true) {
          semantic_tags.push(`_${i*64+j}_`);
        }
      }
    }

    return semantic_tags;
  }

  /*
  構築済みの全カードデータをJSONとして返す
  ------------------------------------------------------- */
  getJSON() {
    return this.CardData;
  }

  /*
  CardData を JSON.stringfy() し、
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
