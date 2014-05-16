
var fs = require('fs');
var path = require('path');
var http = require('http');
var connect = require('connect');
var wechat = require('wechat');
var config = require('./config');
var alpha = require('alpha');
var ejs = require('ejs');
var yzdd = require('./yzdd').create();
var worker = require('pm').createWorker();

var List = require('wechat').List;
List.add('view', [
  ['没有找到相关API。输入模块名，方法名，事件名等都能获取到相关内容。\n回复{a}可以查看近期的NodeParty活动', function (info, req, res) {
    res.nowait('暂无活动');
  }]
]);

var app = connect();
connect.logger.format('home', ':remote-addr :response-time - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :res[content-length]');
app.use(connect.logger({
  format: 'home',
  stream: fs.createWriteStream(__dirname + '/logs/access.log')
}));
app.use(connect.query());
app.use(connect.static(__dirname + '/assets', { maxAge: 86400000 }));
app.use(connect.cookieParser());
app.use(connect.session({secret: config.secret}));
app.use('/wechat', wechat(config.token, wechat.text(function (message, req, res) {
  console.log(message);
  var input = (message.Content || '').trim();

  if (input === '小黑') {
    return res.reply("不要叫我小黑，要黑我女王大人啊……");
    console.log(text);
  }

  if (input == '一站到底' || input == '取题' || input.toLowerCase() == 'qt'){
    yzdd.next(message, function(text){
      res.reply(text);
      console.log(text);
    });
  }

  if (input.toLowerCase() == 'a' || input.toLowerCase()  == 'b' || input.toLowerCase()  == 'c' || input.toLowerCase()  == 'd'){
    yzdd.check(input, message, function(text){
      res.reply(text);
      console.log(text);
    });
  }

  if(input == '分数' || input.toLowerCase() == 'fs'){
    yzdd.score(message, function(text){
      res.reply(text);
      console.log(text);
    });
  }

  if(input.substring(0,2).toLowerCase() == 'zc'){
    var reg = /^[zZ][cC]\+?(1\d{10})\+?([A-Ea-e])$/;//匹配中间可选的+号，匹配赛区大小写
    input = input.replace(/\s+/g,"");//去空格
    var match = input.match(reg);
    if(!input.match(reg)){
      res.reply('您的格式有误，请重试');
    }else{
      //console.log(match);
      var phone = match[1];
      var zone = match[2].toUpperCase();
      var info = {phone:phone, zone:zone};
      yzdd.register(info, message, function(text){
        res.reply(text);
      });
    }
  }

  if(input.substring(0,2) == '注册'){
    res.reply('请回复 zc+手机号+赛区号 进行注册\n例如 zc13545678912C\n\n目前赛区有：\nA.测试赛区1\nB.测试赛区2\nC.测试赛区3\nD.测试赛区4\nE.测试赛区5')
  }

/*以下内容几乎不需要使用
  var data = alpha.search(input);
  var content = '';
  switch (data.status) {
  case 'TOO_MATCHED':
    content = '找到API过多，请精确一点：\n' + data.result.join(', ').substring(0, 100) + '...';
    break;
  case 'MATCHED':
    content = data.result.map(function (item) {
      var replaced = (item.desc || '')
        .replace(/<p>/ig, '').replace(/<\/p>/ig, '')
        .replace(/<code>/ig, '').replace(/<\/code>/ig, '')
        .replace(/<pre>/ig, '').replace(/<\/pre>/ig, '')
        .replace(/<strong>/ig, '').replace(/<\/strong>/ig, '')
        .replace(/<ul>/ig, '').replace(/<\/ul>/ig, '')
        .replace(/<li>/ig, '').replace(/<\/li>/ig, '')
        .replace(/<em>/ig, '').replace(/<\/em>/ig, '')
        .replace(/&#39;/ig, "'");

      return {
        title: item.path,
        description: item.textRaw + ':\n' + replaced,
        picurl: config.domain + '/assets/qrcode.jpg',
        url: config.domain + '/detail?id=' + item.hash
      };
    });
    if (data.more && data.more.length) {
      content.push({
        title: '更多：' + data.more.join(', ').substring(0, 200) + '...',
        description: data.more.join(', ').substring(0, 200) + '...',
        picurl: config.domain + '/assets/qrcode.jpg',
        url: config.domain + '/404'
      });
    }
    break;
  default:
    res.wait('view');
    return;
    break;
  }
  var from = message.FromUserName;
  if (!Array.isArray(content)) {
    if (from === 'oPKu7jgOibOA-De4u8J2RuNKpZRw') {
      content = '主人你好：\n' + content;
    }
    if (from === 'oPKu7jpSY1tD1xoyXtECiM3VXzdU') {
      content = '女王大人:\n' + content;
    }
  }
  console.log(content);
  res.reply(content);
*/
})));

var tpl = ejs.compile(fs.readFileSync(path.join(__dirname, 'views/detail.html'), 'utf-8'));
app.use('/detail', function (req, res) {
  var id = req.query.id || '';
  var info = alpha.access(alpha.getKey(id));
  if (info) {
    res.writeHead(200);
    res.end(tpl(info));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

app.use('/ecjtu', function (req, res) {
  res.writeHead(200);
  res.end('ecjtu');
});

app.use('/', function (req, res) {
  res.writeHead(200);
  res.end('hello node ecjtu');
});



/**
 * Error handler
 */
app.use(function (err, req, res) {
  console.log(err.message);
  console.log(err.stack);
  res.statusCode = err.status || 500;
  res.end(err.message);
});

var server = http.createServer(app);

worker.ready(function (socket) {
  server.emit('connection', socket);  
});
