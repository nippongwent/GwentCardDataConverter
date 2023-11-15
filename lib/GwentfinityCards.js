const fs = require("fs"); // いわゆるI/O処理を行う標準ライブラリ
const path = require("path"); // ファイルパスを扱うための標準ライブラリ
const axios = require('axios'); // HTTP通信を行うための追加ライブラリ（要npmインストール）
const GWENT = require("./GwentConstants"); // ローカライズファイルに記載されていないような基本的な用語対応辞書
const GwentCardsDiff = require("./GwentCardsDiff"); // カードデータの変更点を抽出する自作関数

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
    this.loadGwentCards();
    this.loadPatchData();

    // カードデータを更新し、JSONを上書き保存する
    this.patchJSON();
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
  これから作成するデータの元となるGwentCards.jsonを読み込む
  ------------------------------------------------------- */
  loadGwentCards() {
    if(!this.Version.match(/^v\.bc/i)) {
      throw new Error(`Invalid version name: ${this.Version}`);
    }
    let fpath = path.join(
      "./",
      this.Settings.DataDir,
      this.Version,
      "GwentCards.json"
    );
    this.CardData = JSON.parse(fs.readFileSync(fpath, "utf8"));
  }

  /*
  更新用データを2種類を読み込む
  ------------------------------------------------------- */
  loadPatchData() {
    if(!this.Version.match(/^v\.bc/i)) {
      throw new Error(`Invalid version name: ${this.Version}`);
    }
    let fpath = path.join(
      "./",
      this.Settings.DataDir,
      this.Version,
      "LeadersPatch.json"
    );
    this.LeadersPatch = JSON.parse(fs.readFileSync(fpath, "utf8"));

    fpath = path.join(
      "./",
      this.Settings.DataDir,
      this.Version,
      "CardsPatch.json"
    );
    this.CardsPatch = JSON.parse(fs.readFileSync(fpath, "utf8"));
  }

  /*
  全カードデータに最新情報を適用したJSONを構築する
  ------------------------------------------------------- */
  patchJSON() {
    this.CardData.Version    = this.Version;
    this.CardData.LastUpdate = this.LastUpdate;
    if(this.Settings.Changelog === true) {
      this.CardData.PreviousVersion = this.PreviousVersion;
    }

    let Langs = Object.keys(this.Settings.LocalizePath);
    Langs.forEach(lang => {
      this.CardData[lang].Cards.forEach((Card, index) => {
        let patch_data;
        // 戦力と構築コストを更新する
        // リーダーアビリティとそれ以外で異なる
        if(Card.CardType === GWENT[lang]["CardType"][1]) {
          patch_data = this.LeadersPatch.find(e => e['_id'] == Card.CardId);
          if(typeof(patch_data) !== "undefined") {
            this.CardData[lang].Cards[index].Provision = patch_data["_source"]["provisions_cost"];
          }
        } else {
          patch_data = this.CardsPatch.find(e => e['_id'] == Card.CardId);
          if(typeof(patch_data) !== "undefined") {
            this.CardData[lang].Cards[index].Provision = patch_data["_source"]["provisions_cost"];
            this.CardData[lang].Cards[index].Power     = patch_data["_source"]["power"];
          }
        }

        if(this.Settings.Changelog === true) {
          // 変更点を正しく抽出するために、Changelog プロパティを削除しておく
          delete this.CardData[lang].Cards[index].Changelog;
          this.CardData[lang].Cards[index].Changelog = GwentCardsDiff.SingleCard(
            this.CardData[lang].Cards[index],
            this.CardDataPrevious,
            lang
          );
        }

      });
    });
  }

  /*
  構築済みの全カードデータをJSONとして返す
  ------------------------------------------------------- */
  getJSON() {
    return this.CardData;
  }

  /*
  CardData を JSON.stringfy() し、
  「DataDir/各Version/GwentCards.json」として上書き保存する

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
