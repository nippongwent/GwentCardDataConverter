const GWENT = require("./GwentConstants"); // ローカライズファイルに記載されていないような基本的な用語対応辞書

/* =========================================================
カードの差分データを作るための関数群
========================================================= */
const SingleCard = (Card, CardDataPrevious, lang) => {

  let Changelog = {
    "Summary": ""
  };

  let ChangeFlag = {
    "Changed"  : false,
    "Provision": 0,
    "Power"    : 0,
    "Armor"    : 0,
    "Ability"  : false
  };

  // 元のバージョンにデータがなかった場合、追加されたカード
  let CardPrevious = CardDataPrevious[lang].Cards.find((v) => v.CardId === Card.CardId);
  if(CardPrevious === undefined) {
    Changelog.Summary = GWENT[lang]["Diff"]["NewCard"];
    return Changelog;
  }

  for(let prop in Card) {
    // プロパティの値が配列だと簡単に比較できないので文字列化して行う
    // "Keywords" は無視する
    if(prop === "Keywords") continue;
    if(prop === "Categories") {
      let current  = Card[prop].join("-");
      let previous = CardPrevious[prop].join("-");
      if(current !== previous) {
        ChangeFlag.Changed = true;
        Changelog[prop] = CardPrevious[prop];
      }
      continue;
    }

    // 一般的なプロパティの比較
    if(Card[prop] !== CardPrevious[prop]) {
      ChangeFlag.Changed = true;
      Changelog[prop] = CardPrevious[prop];
      if(prop === "Provision") ChangeFlag.Provision = Card[prop] - CardPrevious[prop];
      if(prop === "Power")     ChangeFlag.Power     = Card[prop] - CardPrevious[prop];
      if(prop === "Armor")     ChangeFlag.Armor     = Card[prop] - CardPrevious[prop];
      if(prop === "Ability")   ChangeFlag.Ability   = true;
    }
  }

  // 変更なし
  if(ChangeFlag.Changed === false) {
    Changelog.Summary = GWENT[lang]["Diff"]["NoChange"];
    return Changelog;
  }

  let SummaryArray = [];

  // リーダーアビリティの場合は Provision が上昇するとバフ扱い
  if(Card.CardType === GWENT[lang]["CardType"][1]) {
    if(ChangeFlag.Provision > 0) SummaryArray.push(GWENT[lang]["Diff"]["ProvisionBuff"]);
    if(ChangeFlag.Provision < 0) SummaryArray.push(GWENT[lang]["Diff"]["ProvisionNerf"]);
    if(ChangeFlag.Ability)       SummaryArray.push(GWENT[lang]["Diff"]["AbilityChange"]);

    Changelog.Summary = SummaryArray.join(' - ');

    // その他の変更
    if(Changelog.Summary === "") Changelog.Summary = GWENT[lang]["Diff"]["Other"];
    
    return Changelog;
  }

  // カードの変更
  if(ChangeFlag.Provision < 0) SummaryArray.push(GWENT[lang]["Diff"]["ProvisionBuff"]);
  if(ChangeFlag.Provision > 0) SummaryArray.push(GWENT[lang]["Diff"]["ProvisionNerf"]);
  if(ChangeFlag.Power > 0)     SummaryArray.push(GWENT[lang]["Diff"]["PowerBuff"]);
  if(ChangeFlag.Power < 0)     SummaryArray.push(GWENT[lang]["Diff"]["PowerNerf"]);
  if(ChangeFlag.Armor > 0)     SummaryArray.push(GWENT[lang]["Diff"]["ArmorBuff"]);
  if(ChangeFlag.Armor < 0)     SummaryArray.push(GWENT[lang]["Diff"]["ArmorNerf"]);
  if(ChangeFlag.Ability)       SummaryArray.push(GWENT[lang]["Diff"]["AbilityChange"]);

  Changelog.Summary = SummaryArray.join(' - ');

  // その他の変更
  if(Changelog.Summary === "") Changelog.Summary = GWENT[lang]["Diff"]["Other"];
  return Changelog;
};

const Keywords = (CurrentKeywords, PreviousKeywords) => {
  let Changelog = {};

  for(let prop in CurrentKeywords) {
    if(CurrentKeywords[prop] !== PreviousKeywords[prop]) {
      Changelog[prop] = PreviousKeywords[prop];
    }
  }

  return Changelog;
};

module.exports = {SingleCard, Keywords};