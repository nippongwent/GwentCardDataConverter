const GwentCards = require('./lib/GwentCards');
const Converter = require('./lib/converter/GwentCard2CSV');

let version = 'v.9.6.1';
let lang    = 'ja-jp';

let gc  = new GwentCards(version);
let CSV = new Converter(gc);

CSV.saveFile(`./cards_${version}_${lang}.csv`, lang);
