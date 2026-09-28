var talib = require('talib');
var functions = talib.functions;
for (i in functions) {
    console.log(i, [talib.explain(functions[i].name)]);
}