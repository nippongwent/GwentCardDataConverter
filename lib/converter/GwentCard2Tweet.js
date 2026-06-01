const fs = require("fs"); // いわゆるI/O処理を行う標準ライブラリ
const path = require("path"); // ファイルパスを扱うための標準ライブラリ
const GWENT = require("../GwentConstants"); // チュートリアルカードを弾くために必要

const NL = "\r\n";

/*
よく考えたら日本語で動けばよいが
lang の部分は残しておく
--------------------------------------------------------*/
class GwentCards2Tweet {
  /*
  コンストラクタではGwentCardsオブジェクトを受け取る。
  一応、引数の多少の確認はしておく
  --------------------------------------------------------*/
  constructor(GwentCards, tutorial = false) {
    if(GwentCards === undefined || GwentCards === null) {
      throw 'Parameter Required: GwentCards2Tweet->constructor()';
    }
    if(GwentCards.constructor.name !== "GwentCards") {
      throw 'The first parameter must be "GwentCards" object: GwentCards2Tweet->constructor()';
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
    const dpath = this.GwentCards.Settings.OutputDir;

    // 保存先ディレクトリの存在確認＆なければ作成
    if(!fs.existsSync(dpath)) fs.mkdirSync(dpath);

    // バージョンごとに管理
    const dpath_v = path.join(
      dpath,
      this.Version
    );
    if(!fs.existsSync(dpath_v)) fs.mkdirSync(dpath_v);

    if(this.GwentCards.CardData[lang] === undefined || this.GwentCards.CardData[lang] === null ) {
      throw `No such language(${lang}) in the data: GwentCards2Tweet->make()`;
    }

    // 必要なファイルを各々作成する
    this.saveTweetJP(dpath_v, lang);
  }

  /*
  変更のあったカードのみを抽出したファイルを作る
  日本語だけなので、saveTweetJP() としている
  カードデータ自体が多言語なので引数で言語を受け取って利用できるようにしているが、
  今のところは日本語だけで動かすことを想定している

  保存先のディレクトリと言語を受け取る
  初期値は 
  dpath = ''
  lang  = 'ja-jp'
  単体で使わず make() で全部作ることを推奨
  保存のファイル名は onlychanged-tweet.utf8.txt に固定してある
  --------------------------------------------------------*/
  saveTweetJP(dpath_v = '', lang = 'ja-jp') {
    const Cards = this.GwentCards.CardData[lang].Cards;

    // 勢力表記用文字列をハードコーディング
    const FactionTitles = {
        "ニュートラル" : "⬜️",
        "モンスター" : "🟥",
        "北方諸国" : "🟦",
        "スコイア＝テル" : "🟩",
        "スケリッジ" : "🟪",
        "ニルフガード" : "⬛️",
        "シンジケート" : "🟧"
    }
    const factionOrder = Object.keys(FactionTitles); // 出力順を兼ねる

    // 変更内容をグループ化するためのオブジェクトを作る
    const grouped = { leader: {}, card: {} };
    const Diff     = GWENT[lang]["Diff"];
    const LEADER   = GWENT[lang]["CardType"][1]; // "リーダーアビリティ"
    const noChange = Diff["NoChange"];

    const leaderDiffOrder = [Diff["ProvisionBuff"], Diff["ProvisionNerf"]];
    const cardDiffOrder   = [Diff["PowerBuff"], Diff["PowerNerf"], Diff["ProvisionBuff"], Diff["ProvisionNerf"]];

    const leaderDiffHeaders = {
      [Diff["ProvisionBuff"]]: "⭕️構築コスト上限・増加⭕️",
      [Diff["ProvisionNerf"]]: "🔻構築コスト上限・減少🔻"
    };
    const cardDiffHeaders = {
      [Diff["PowerBuff"]]:     "⭕️戦力・増加⭕️",
      [Diff["PowerNerf"]]:     "🔻戦力・減少🔻",
      [Diff["ProvisionBuff"]]: "⭕️コスト・減少⭕️",
      [Diff["ProvisionNerf"]]: "🔺コスト・増加🔺"
    };

    // グループ分類を行うループ
    Cards.forEach(Card => {
      if(Card.Changelog.Summary === noChange) return;

      const isLeader = Card.CardType === LEADER;
      const target   = isLeader ? grouped.leader : grouped.card;
      const faction  = Card.Faction;

      const addToGroup = (diffType) => {
        if(!target[faction])           target[faction] = {};
        if(!target[faction][diffType]) target[faction][diffType] = [];
        target[faction][diffType].push(Card);
      };

      if(isLeader) {
        if(Card.Changelog.Provision !== undefined) {
          addToGroup(Card.Provision > Card.Changelog.Provision ? Diff["ProvisionBuff"] : Diff["ProvisionNerf"]);
        }
      } else {
        if(Card.Changelog.Power !== undefined) {
          addToGroup(Card.Power > Card.Changelog.Power ? Diff["PowerBuff"] : Diff["PowerNerf"]);
        }
        if(Card.Changelog.Provision !== undefined) {
          addToGroup(Card.Provision < Card.Changelog.Provision ? Diff["ProvisionBuff"] : Diff["ProvisionNerf"]);
        }
      }
    });

    // 勢力ごとのバフ・ナーフ統計を集計する
    // オプショナルチェーン演算子（?.）とNull合体演算子（??）は便利
    // 本来、密偵カードの戦力増はナーフ扱いにするべき（邪眼のイヴァーは諸説ある）が、
    // ここでは単純に数値の増減だけでバフ・ナーフを判断しているため、戦力増はすべてバフ扱い
    const factionStats = {};
    factionOrder.forEach(faction => {
      factionStats[faction] = {
        buff: (grouped.leader[faction]?.[Diff["ProvisionBuff"]]?.length ?? 0)
            + (grouped.card[faction]?.[Diff["ProvisionBuff"]]?.length ?? 0)
            + (grouped.card[faction]?.[Diff["PowerBuff"]]?.length ?? 0),
        nerf: (grouped.leader[faction]?.[Diff["ProvisionNerf"]]?.length ?? 0)
            + (grouped.card[faction]?.[Diff["ProvisionNerf"]]?.length ?? 0)
            + (grouped.card[faction]?.[Diff["PowerNerf"]]?.length ?? 0)
      };
    });

    // 文章を作成
    // 冒頭を作る
    const version = this.GwentCards.CardData.Version;
    const bcnum   = version.split('.').pop(); // v.bc20260401.30 の "30" の部分を抜き取る
    let output_text = `全カードデータ更新：第${bcnum}回バランス審議会 ${version} #グウェント` + NL;
    const legendLines = factionOrder.map(faction =>
      `${FactionTitles[faction]}${faction}（強：${factionStats[faction].buff}、弱：${factionStats[faction].nerf}）`
    ).join(NL);
    output_text += NL + `※※※変更内容一覧※※※` + NL;
    output_text += `各勢力の色は下記の通り （）内は今回の変更統計` + NL;
    output_text += legendLines + NL + NL;

    // 各変更内容の記述
    // セクションごとに文章をまとめるための関数
    const renderSection = (group, diffOrder, diffHeaders, sectionTitle) => {
      let text = sectionTitle + NL;
      diffOrder.forEach(diffType => {
        text += diffHeaders[diffType] + NL;
        let hasAny = false;
        factionOrder.forEach(faction => {
          if(!group[faction] || !group[faction][diffType]) return;
          hasAny = true;
          group[faction][diffType].forEach(Card => {
            const isPower = diffType === Diff["PowerBuff"] || diffType === Diff["PowerNerf"];
            const before  = isPower ? Card.Changelog.Power : Card.Changelog.Provision;
            const after   = isPower ? Card.Power           : Card.Provision;
            text += `${FactionTitles[faction]}${Card.Name}（${before} → ${after}）` + NL;
          });
        });
        if(!hasAny) text += `該当なし` + NL;
        text += NL;
      });
      return text;
    };

    output_text += renderSection(grouped.leader, leaderDiffOrder, leaderDiffHeaders, "【リーダーアビリティ調整】");
    output_text += renderSection(grouped.card,   cardDiffOrder,   cardDiffHeaders,   "【カード調整】");

    // フッターを作る
    output_text += `※※※全カードデータ（Google Drive）※※※` + NL;
    output_text += `https://drive.google.com/drive/folders/1_tG6WsBZ032GF0FDSgQ68c84VIIcyX3g?usp=sharing` + NL;
    output_text += `この投稿・データはCDPRファンコンテンツガイドラインに従って作成された非公式のファン作品であり、CD PROJEKT REDによって承認されたものではありません。` + NL;

    // 保存処理
    const fpath = path.join(
      dpath_v,
      "onlychanged-tweet.utf8.txt"
    );

    try {
      fs.writeFileSync(fpath, output_text);
    } catch(e) {
      console.log(e);
    }
  }
}

module.exports = GwentCards2Tweet;
