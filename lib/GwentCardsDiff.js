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

  // リーダーアビリティの場合は Provision が上昇するとバフ扱い
  if(Card.CardType === GWENT[lang]["CardType"][1]) {
    let ProvisionChange = false;
    if(ChangeFlag.Provision !== 0) ProvisionChange   = true;
    if(ChangeFlag.Provision > 0)   Changelog.Summary = GWENT[lang]["Diff"]["Buff"];
    if(ChangeFlag.Provision < 0)   Changelog.Summary = GWENT[lang]["Diff"]["Nerf"];

    if(ChangeFlag.Ability) {
      if(ProvisionChange) {
        Changelog.Summary = GWENT[lang]["Diff"]["Rework"]; // 構築コストもアビリティも変わった
      } else {
        Changelog.Summary = GWENT[lang]["Diff"]["Tweak"]; // アビリティだけが変わった場合
      }
    }

    // その他の変更
    if(Changelog.Summary === "") Changelog.Summary = GWENT[lang]["Diff"]["Other"];
    
    return Changelog;
  }

  // カードの変更
  // 基本3数値の変化量はアーマーの重みを半分にして評価
  // 例えば「戦力が1減って、アーマーが1増えた」場合は -0.5 となるので「弱体化」という評価にする
  // 構築コストは減ると強化
  let NumericalChange = (ChangeFlag.Provision !== 0 || ChangeFlag.Power !== 0 || ChangeFlag.Armor !== 0);
  let NumericalChangeValue = ((ChangeFlag.Provision * (-1)) + ChangeFlag.Power + (ChangeFlag.Armor * 0.5));

  if(NumericalChangeValue > 0) Changelog.Summary = GWENT[lang]["Diff"]["Buff"];
  if(NumericalChangeValue < 0) Changelog.Summary = GWENT[lang]["Diff"]["Nerf"];

  if(ChangeFlag.Ability) {
    if(NumericalChange) {
      Changelog.Summary = GWENT[lang]["Diff"]["Rework"]; // 基本3数値もアビリティも変わった
    } else {
      Changelog.Summary = GWENT[lang]["Diff"]["Tweak"]; // アビリティだけが変わった場合
    }
  }

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