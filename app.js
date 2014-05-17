
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
    res.reply([
      {
        title: '第一题，简单！',
        description: '美国好莱坞早期的经典电影，就是太经典了，所以这部是由当年当红帅哥+两大美女重拍的版本，电影的构思非常巧妙，结局和昨天猜的一部电影有异曲同工之妙。温馨提示：看到这张剧照，除了人，你还看到了什么？想到了什么？',
        picurl: 'http://mmbiz.qpic.cn/mmbiz/ibaGbbXO34h5KDmVMLyCZMBbex3jHquYSGIXjeBJRo48Aw9Dyt5KZKKRfxKuw9ZTx99APwcK4fWrKT8kzKuM0qQ/0',
        url: 'http://mp.weixin.qq.com/s?__biz=MjM5ODUwMDczMg==&mid=200155297&idx=1&sn=0c6495896dbabbb729c6e34cf29f0920#rd'
      }
    ]);
  }else if(input == '香草的天空'){
    res.reply([
      {
        title: '第二题，不要掉以轻心哦~',
        description: ' 中国电影 这部电影的剧照特色太鲜明了，一看就猜的到，所以小编特意选了这张图。总而言之一句话，大制作大牌演员，连里面的歌都那么的红。',
        picurl: 'http://mmbiz.qpic.cn/mmbiz/ibaGbbXO34h5KDmVMLyCZMBbex3jHquYSQfI7neJbCDuvB8EQ7xBj08icRCuibxv4eHDN0VUqg31lsoNA8nxVgo9g/0',
        url: 'http://mp.weixin.qq.com/s?__biz=MjM5ODUwMDczMg==&mid=200155300&idx=1&sn=fa3ec0e9a8d3475fe4c1a06b1b01637c#rd'
      }
    ]);
  }else if(input == '满城尽带黄金甲'){
    res.reply([
      {
        title: '第三题，放马过来吧！~',
        description: '    四个字的电影名称，韩国动作电影，当年男神回归之作，揭发了一个很黑暗很血腥很无人道的地下交易。这部电影好多翻译，小编用的是百度百科的中文名，但是其实大家比较熟知的估计是台湾版的翻译（2个字的）。',
        picurl: 'http://mmbiz.qpic.cn/mmbiz/ibaGbbXO34h5KDmVMLyCZMBbex3jHquYShBibKStOp541hRicVhHaIhibs7QJIUBqXicibMBkGzib2aPShpSDE3ukXgmg/0',
        url: 'http://mp.weixin.qq.com/s?__biz=MjM5ODUwMDczMg==&mid=200155303&idx=1&sn=7f5610940849ee24e637777576c23a8b#rd'
      }
    ]);
  }else if(input == '孤胆特工'){
    res.reply([
      {
        title: '最后一题了，再好好想想？~',
        description: ' 美国剧情电影 此片全程都是在室内交谈，非常平淡，但是剧情却非常精彩，毫不枯燥。此片的内容和前段时间大热的某部电视剧的背景有点相似哦。',
        picurl: 'http://mmbiz.qpic.cn/mmbiz/ibaGbbXO34h5KDmVMLyCZMBbex3jHquYSibu3e0icg6AwgafjoJHaicFlYQaEbqC5vpheuYsJsfOiavb9UDWKTDrTCQ/0',
        url: 'http://mp.weixin.qq.com/s?__biz=MjM5ODUwMDczMg==&mid=200155312&idx=1&sn=80a9f237941cad39c6d922f2b50757a1#rd'
      }
    ]);
  }else if(input == '这个男人来自地球'){
    res.reply('恭喜你！这么难都答对了~本次的规则是全部答对的第30个幸运者，祝你幸运哦！');
  }else if(input.substring(0,2).toLowerCase() == 'zc'){
    var reg = /^([\u4e00-\u9fa5]{2,4})\+?(1\d{10})\+?([A-Ea-e])$/;//匹配中间可选的+号，匹配赛区大小写
    input = input.replace(/\s+/g,"");//去空格
    var match = input.match(reg);
    if(!input.match(reg)){
      res.reply('您的格式有误，请重试');
    }else{
      //console.log(match);
      var name = match[0];
      var phone = match[1];
      var zone = match[2].toUpperCase();
      var info = {name:name, phone:phone, zone:zone};
      yzdd.register(info, message, function(text){
        res.reply(text);
      });
    }
  }else if(input.substring(0,2) == '注册'){
    res.reply('欢迎您来到江西高校大学生智王大赛官方平台，请先下载“异度支付”客户端，并将注册时的姓名、手机和您希望参加的赛区回复到本微信\n如 李四13545678912C\n目前赛区有：\nA.瑶湖赛区\nB.经开赛区\nC.昌西赛区\nD.昌北赛区\nE.社会及昌外赛区\n你还可以回复 规则 查看比赛规则');
  }else{
    res.reply('亲爱的微友你好，如果我们没有及时回复您的消息，请耐心等待一下，工作人员会尽快与您取得联系的。谢谢支持！你还可以在掌上大江网http://3g.jxnews.com.cn看更多有趣的新闻。');
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
