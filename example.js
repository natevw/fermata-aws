var fermata = require("../../fermata"),
    aws = require(".");
fermata.registerPlugin('aws', aws);



var api = fermata.aws("https://iam.amazonaws.com/");
api({Action:'ListUsers','Version':"2010-05-08"}).get({
  'Content-Type': "application/x-www-form-urlencoded; charset=utf-8",
  //test: 123,
  //'Some-Header': ["abc","   def   asd adsf   "],
}, null, function (e,d) {
  console.log(e,d);
});
