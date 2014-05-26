
var fs = require('fs');
var path = require('path');
var http = require('http');
var connect = require('connect');
var wechat = require('wechat');
var config = require('./config');
var alpha = require('alpha');
var ejs = require('ejs');
var redis = require('redis').createClient();
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
app.use('/wechat', wechat(config.token, wechat.event(function (message, req, res, next){
  if(message.Event.toLowerCase()=='subscribe'){
    res.reply('欢迎关注大江网微信公众平台，参加江西高校智王大赛请回复“我要参赛”');
  }
}).text(function (message, req, res, next) {
  console.log(message);
  var input = (message.Content || '').trim();

  if (input === '小黑') {
    return res.reply("不要叫我小黑，要叫我女王大人啊……");
    console.log(text);
  }else if (input == '我要参赛' || input == '智王' || input == '取题' || input.toLowerCase() == 'qt'){
    yzdd.next(message, function(text){
      res.reply(text);
      console.log(text);
    });
  }else if (input.toLowerCase() == 'a' || input.toLowerCase()  == 'b' || input.toLowerCase()  == 'c' || input.toLowerCase()  == 'd'){
    yzdd.check(input, message, function(text){
      res.reply(text);
      console.log(text);
    });
  }else if(input == '分数' || input.toLowerCase() == 'fs'){
    yzdd.score(message, function(text){
      res.reply(text);
      console.log(text);
    });
  }else if(input == '猜电影'){
    res.reply('5月猜电影活动已经结束了，感谢大家的支持，敬请期待我们的下一次活动哦~');
  }else if(input == '规则'){
    res.reply('江西高校智王大赛规则如下：\n每组有5道题，每道题目答对记10分；\n每组5道问题回答完毕计算该组用时；\n该组用时1分钟以内得全分，用时6分钟以上得0分，1-6分钟部分按时间打折；\n计算后的该组得分计入总得分。\n例：答对3题用时2分钟得分为 3*10*((6-2)/5) = 24');
  }else if(input == '异度支付'){
    res.reply('中信银行异度支付客户端下载地址：\nIOS用户：https://itunes.apple.com/cn/app/yi-du-zhi-fu/id800578884\n安卓用户(Google Play)：https://play.google.com/store/apps/details?id=com.citicbank.cyberpay.ui');
  }else if(input.substring(0,2) == '注册'){
    res.reply('欢迎您来到江西高校大学生智王大赛官方平台，请先下载“异度支付”客户端，并将注册时的姓名、手机和您希望参加的赛区回复到本微信\n如 李四13545678912C\n目前赛区有：\nA.瑶湖赛区(师大承办)\nB.经开赛区(农大承办)\nC.昌西赛区(交大承办)\nD.昌北赛区(东理承办)\nE.财大赛区(财大承办)\nF.社会及昌外赛区\n你还可以回复“规则”查看比赛规则，回复“异度支付”了解下载详情。\n题库不断更新，欢迎您每天来发现不同哦～');
  }else{
    var reg = /^([\u4e00-\u9fa5]{2,4})\+?(1\d{10})\+?([A-Fa-f])$/;//匹配中间可选的+号，匹配赛区大小写
    input = input.replace(/\s+/g,"");//去空格
    var match = input.match(reg);
    if(input.match(reg)){
      console.log(match);
      var name = match[1];
      var phone = match[2];
      var zone = match[3].toUpperCase();
      var info = {name:name, phone:phone, zone:zone};
      yzdd.register(info, message, function(text){
        res.reply(text);
      });
    }else{
      res.reply('亲爱的微友你好，如果我们没有及时回复您的消息，请耐心等待一下，工作人员会尽快与您取得联系的。谢谢支持！你还可以在掌上大江网http://3g.jxnews.com.cn看更多有趣的新闻。');
    }
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



app.use('/status', function (req, res){
  var output='';
  redis.smembers('yzdd_users', function (err, members) {
    res.write('总人数:'+members.length+'\n');
    var j = 0;
    for(var i=0;i<members.length;i++) {
      redis.hgetall('yzdd_user:'+members[i], function (err, member) {
        redis.get('yzdd_user:'+members[i]+':score', function (err, score) {
          res.write(members[i]+':'+member['phone']+':'+member['zone']+':'+score+'\n');
          j+=1;
          if(j==members.length){
            res.end();
          }
        });
      });
    }
  });
  
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
