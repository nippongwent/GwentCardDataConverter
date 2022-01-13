const GwentCards = require('./lib/GwentCards');
const ConverterCSV = require('./lib/converter/GwentCard2CSV');
const ConverterSS  = require('./lib/converter/GwentCard2Seesaa');

let version = 'v.10.1.0';
let lang    = 'ja-jp';

let gc  = new GwentCards(version);

let CSV = new ConverterCSV(gc);
CSV.saveFile(lang);

let Seesaa = new ConverterSS(gc);
Seesaa.make();
