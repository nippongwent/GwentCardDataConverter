/* ---------------------------------------------------------
Seesaa用のフォーマット関数
--------------------------------------------------------- */

/* ---------------------------------------------------------
勢力をリンクする
--------------------------------------------------------- */
module.exports.linkFaction = (txt) => {
  if(txt === undefined || txt === null) {
    return "";
  }
  if(txt==="ニュートラル")   txt = "[[ニュートラル>カード一覧（ニュートラル）]]";
  if(txt==="モンスター")     txt = "[[モンスター>カード一覧（モンスター）]]";
  if(txt==="ニルフガード")   txt = "[[ニルフガード>カード一覧（ニルフガード）]]";
  if(txt==="北方諸国")       txt = "[[北方諸国>カード一覧（北方諸国）]]";
  if(txt==="スコイア＝テル") txt = "[[スコイア＝テル>カード一覧（スコイア＝テル）]]";
  if(txt==="スケリッジ")     txt = "[[スケリッジ>カード一覧（スケリッジ）]]";
  if(txt==="シンジケート>")  txt = "[[シンジケート>カード一覧（シンジケート）]]";

  return txt;
}

/* ---------------------------------------------------------
拡張セットをリンクする
--------------------------------------------------------- */
module.exports.linkCardset = (txt) => {
  if(txt === undefined || txt === null) {
    return "";
  }

  if(txt==="トークン")           txt = "[[トークン]]";
  if(txt==="スターター")         txt = "[[スターターセット]]";
  if(txt==="基本セット")         txt = "[[基本セット]]";
  if(txt==="奪われし玉座")       txt = "[[奪われし玉座]]";
  if(txt==="紅き血の呪縛")       txt = "[[紅き血の呪縛>紅き血の呪縛（拡張セット）]]";
  if(txt==="ノヴィグラド")       txt = "[[ノヴィグラド]]";
  if(txt==="鉄の裁定")           txt = "[[鉄の裁定]]";
  if(txt==="オフィルの商人")     txt = "[[オフィルの商人>オフィルの商人（拡張セット）]]";
  if(txt==="鏡の達人")           txt = "[[鏡の達人>鏡の達人（拡張セット）]]";
  if(txt==="ウィッチャーの流儀") txt = "[[ウィッチャーの流儀]]";
  if(txt==="力の代償")           txt = "[[力の代償]]";

  return txt;
}


/* ---------------------------------------------------------
Seesaa向けに用語の変更
--------------------------------------------------------- */
module.exports.convertRarity = (txt) => {
  if(txt === undefined || txt === null) {
    return "";
  }

  if(txt==="レジェンダリー") txt = "金";
  if(txt==="エピック")       txt = "紫";
  if(txt==="レア")           txt = "青";
  if(txt==="コモン")         txt = "白";

  return txt;
}

/* ---------------------------------------------------------
カテゴリをリンクする
--------------------------------------------------------- */
module.exports.linkCategory = (txt) => {
  if(txt === undefined || txt === null) {
    return "";
  }

  txt = txt.replace(/(野獣)/g, '[[$1]]');
  txt = txt.replace(/(悪魔)/g, '[[$1]]');
  txt = txt.replace(/(遺存種)/g, '[[$1]]');
  txt = txt.replace(/(ウィッチハンター)/g, '[[ウィッチハンター>ウィッチハンター（カテゴリ）]]');
  txt = txt.replace(/(ウィッチャー)/g, '[[$1]]');
  txt = txt.replace(/(エルフ)/g, '[[$1]]');
  txt = txt.replace(/(オーガ種)/g, '[[$1]]');
  txt = txt.replace(/(オーガニック)/g, '[[$1]]');
  txt = txt.replace(/(海賊)/g, '[[$1]]');
  txt = txt.replace(/(騎士)/g, '[[$1]]');
  txt = txt.replace(/(貴族)/g, '[[$1]]');
  txt = txt.replace(/(吸血鬼)/g, '[[$1]]');
  txt = txt.replace(/(急襲)/g, '[[$1]]');
  txt = txt.replace(/(狂戦士)/g, '[[$1]]');
  txt = txt.replace(/(軍事)/g, '[[$1]]');
  txt = txt.replace(/(昆虫種)/g, '[[$1]]');
  txt = txt.replace(/(ゴーレム)/g, '[[$1]]');
  txt = txt.replace(/(サラマンドラ)/g, '[[$1]]');
  txt = txt.replace(/(屍食)/g, '[[$1]]');
  txt = txt.replace(/(自然)/g, '[[$1]]');
  txt = txt.replace(/(シナリオ)/g, '[[$1]]');
  txt = txt.replace(/(植物)/g, '[[$1]]');
  txt = txt.replace(/(死霊)/g, '[[$1]]');
  txt = txt.replace(/(呪縛)/g, '[[$1]]');
  txt = txt.replace(/(呪文)/g, '[[$1]]');
  txt = txt.replace(/(聖職者)/g, '[[$1]]');
  txt = txt.replace(/(戦士)/g, '[[$1]]');
  txt = txt.replace(/(戦術)/g, '[[$1]]');
  txt = txt.replace(/(諜報員)/g, '[[$1]]');
  txt = txt.replace(/(盗賊)/g, '[[$1]]');
  txt = txt.replace(/(トレント)/g, '[[$1]]');
  txt = txt.replace(/(トークン)/g, '[[$1]]');
  txt = txt.replace(/(道化同盟)/g, '[[$1]]');
  txt = txt.replace(/(ドラゴン)/g, '[[$1]]');
  txt = txt.replace(/(ドリアード)/g, '[[$1]]');
  txt = txt.replace(/(ドルイド)/g, '[[$1]]');
  txt = txt.replace(/(ドワーフ)/g, '[[$1]]');
  txt = txt.replace(/(人間)/g, '[[$1]]');
  txt = txt.replace(/(ノーム)/g, '[[$1]]');
  txt = txt.replace(/(犯罪)/g, '[[$1]]');
  txt = txt.replace(/(ハーフリング)/g, '[[$1]]');
  txt = txt.replace(/(爆弾)/g, '[[$1]]');
  txt = txt.replace(/(引き潮団)/g, '[[$1]]');
  txt = txt.replace(/(船)/g, '[[$1]]');
  txt = txt.replace(/(兵器)/g, '[[$1]]');
  txt = txt.replace(/(攻城\[\[兵器\]\])/g, '[[攻城兵器]]'); // 二重変換戻し
  txt = txt.replace(/(兵士)/g, '[[$1]]');
  txt = txt.replace(/(変異体)/g, '[[変異体>変異体（カテゴリ）]]');
  txt = txt.replace(/(炎誓い)/g, '[[$1]]');
  txt = txt.replace(/(魔術師)/g, '[[$1]]');
  txt = txt.replace(/(盲目結社)/g, '[[$1]]');
  txt = txt.replace(/(妖婆)/g, '[[$1]]');
  txt = txt.replace(/(錬金術)/g, '[[$1]]');
  txt = txt.replace(/(ロケーション)/g, '[[$1]]');
  txt = txt.replace(/(ワイルドハント)/g, '[[$1]]');
  txt = txt.replace(/(罠)/g, '[[$1]]');
  txt = txt.replace(/(割れ銭組)/g, '[[$1]]');
  txt = txt.replace(/(狂信者)/g, '[[$1]]');

  return txt;
}

// アビリティ（改行をWiki記法で処理）
module.exports.convertAbility = (txt) => {
  if(txt === undefined || txt === null) {
    return "";
  }
  // リンク処理も噛ませる
  return linkAbility(String(txt).trim().replace(/\\n/g, "|\r\n|^|"));
}

// フレーバー（改行をWiki記法で処理）
module.exports.convertFlavor = (txt) => {
  if(txt === undefined || txt === null) {
    return "";
  }

  return String(txt).trim().replace(/\\n/g, "|\r\n|^|");
}

linkAbility = (txt) => {
  // アビリティ用語
  txt = txt.replace(/(陰謀)/g, '[[$1]]');
  txt = txt.replace(/(回復)/g, '[[$1]]');
  txt = txt.replace(/(間接)/g, '[[$1]]');
  txt = txt.replace(/(吸収)/g, '[[$1]]');
  txt = txt.replace(/(狂気)/g, '[[$1]]');
  txt = txt.replace(/(奇襲)/g, '[[$1]]');
  txt = txt.replace(/(共生)/g, '[[$1]]');
  txt = txt.replace(/(狂戦士)/g, '[[$1]]');
  txt = txt.replace(/(ドワーフの\[\[狂戦士\]\])/g, 'ドワーフの狂戦士'); // 二重変換戻し
  txt = txt.replace(/(狂騒)/g, '[[$1]]');
  txt = txt.replace(/(近接)/g, '[[$1]]');
  txt = txt.replace(/(クールダウン)/g, '[[$1]]');
  txt = txt.replace(/(結束)/g, '[[$1]]');
  txt = txt.replace(/(ソヴ・アニメイ：\[\[結束\]\])/g, 'ソヴ・アニメイ：結束'); // 二重変換戻し
  txt = txt.replace(/(決闘)/g, '[[$1]]');
  txt = txt.replace(/(献身)/g, '[[$1]]');
  txt = txt.replace(/(公開)/g, '[[$1]]');
  txt = txt.replace(/(古参兵)/g, '[[$1]]');
  txt = txt.replace(/(強奪)/g, '[[$1]]');
  txt = txt.replace(/(残響)/g, '[[$1]]');
  txt = txt.replace(/(支配)/g, '[[$1]]');
  txt = txt.replace(/(謝礼)/g, '[[$1]]');
  txt = txt.replace(/(召喚)/g, '[[$1]]');
  txt = txt.replace(/(初動)/g, '[[$1]]');
  txt = txt.replace(/(浄化)/g, '[[$1]]');
  txt = txt.replace(/(陣形)/g, '[[$1]]');
  txt = txt.replace(/(生成)/g, '[[$1]]');
  txt = txt.replace(/(成長)/g, '[[$1]]');
  txt = txt.replace(/(チャージ)/g, '[[$1]]');
  txt = txt.replace(/(調和)/g, '[[$1]]');
  txt = txt.replace(/(追撃)/g, '[[$1]]');
  txt = txt.replace(/(同化)/g, '[[$1]]');
  txt = txt.replace(/(恫喝)/g, '[[$1]]');
  txt = txt.replace(/(入手)/g, '[[$1]]');
  txt = txt.replace(/(熱狂)/g, '[[$1]]');
  txt = txt.replace(/(乗組員)/g, '[[$1]]');
  txt = txt.replace(/(破棄)/g, '[[$1]]');
  txt = txt.replace(/(配備)/g, '[[$1]]');
  txt = txt.replace(/(備蓄)/g, '[[$1]]');
  txt = txt.replace(/(伏兵)/g, '[[$1]]');
  txt = txt.replace(/(不忠)/g, '[[$1]]');
  txt = txt.replace(/(奮起)/g, '[[$1]]');
  txt = txt.replace(/(補給)/g, '[[$1]]');
  txt = txt.replace(/(捕食)/g, '[[$1]]');
  txt = txt.replace(/(防塞)/g, '[[$1]]');
  txt = txt.replace(/(貢物)/g, '[[$1]]');
  txt = txt.replace(/(無防備)/g, '[[$1]]');
  txt = txt.replace(/(命令)/g, '[[$1]]');
  txt = txt.replace(/(遺言)/g, '[[$1]]');
  txt = txt.replace(/(勇躍)/g, '[[$1]]');
  txt = txt.replace(/(利益)/g, '[[$1]]');
  txt = txt.replace(/(宴)/g,  '[[$1]]');
  txt = txt.replace(/(忍耐)/g, '[[$1]]');

  // 状態用語
  txt = txt.replace(/(活力)/g, '[[$1]]');
  txt = txt.replace(/(継戦)/g, '[[$1]]');
  txt = txt.replace(/(遮蔽)/g, '[[$1]]');
  txt = txt.replace(/(守護者)/g, '[[$1]]');
  txt = txt.replace(/(出血)/g, '[[$1]]');
  txt = txt.replace(/(懸賞金)/g, '[[$1]]');
  txt = txt.replace(/(シールド)/g, '[[$1]]');
  txt = txt.replace(/(破滅)/g, '[[$1]]');
  txt = txt.replace(/(封印)/g, '[[$1]]');
  txt = txt.replace(/(耐性)/g, '[[$1]]');
  txt = txt.replace(/(毒)/g, '[[$1]]');
  txt = txt.replace(/(密偵)/g, '[[$1]]');
  txt = txt.replace(/(裂傷)/g, '[[$1]]');

  // 列効果用語
  txt = txt.replace(/(雨)/g, '[[$1]]');
  txt = txt.replace(/(豪\[\[雨\]\])/g, '豪雨'); // 二重変換戻し
  txt = txt.replace(/(霧)/g, '[[$1]]');
  txt = txt.replace(/(濃\[\[霧\]\])/g, '濃霧'); // 二重変換戻し
  txt = txt.replace(/(霜)/g, '[[$1]]');
  txt = txt.replace(/(氷\[\[霜\]\])/g, '氷霜'); // 二重変換戻し
  txt = txt.replace(/(嵐)/g, '[[嵐>嵐（列効果）]]');
  txt = txt.replace(/(大変動)/g, '[[$1]]');
  txt = txt.replace(/(竜の夢)/g, '[[竜の夢>竜の夢（列効果）]]');
  txt = txt.replace(/(血染めの月)/g, '[[$1]]');

  // システム用語
  txt = txt.replace(/(アーマー)/g, '[[$1]]');
  txt = txt.replace(/(コイン)/g, '[[$1]]');

  // カード名
  txt = txt.replace(/《(.*?)》/g, '《[[$1]]》');
  
  return txt;
}