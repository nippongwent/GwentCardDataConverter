const GwentCards = require('./lib/GwentCards');
const ConverterCSV = require('./lib/converter/GwentCard2CSV');
const ConverterSS  = require('./lib/converter/GwentCard2Seesaa');

let version = 'v.9.6.1';
let lang    = 'ja-jp';

let gc  = new GwentCards(version);
gc.saveJSON(2); // JSON.stringfy() の第3引数（spacer）を渡せるようにしてある

let CSV = new ConverterCSV(gc);
CSV.saveFile(lang);

let Seesaa = new ConverterSS(gc);
Seesaa.make();
