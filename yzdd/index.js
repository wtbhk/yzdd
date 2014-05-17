var yzdd = function() {
	
};

exports.create = function() {
	yzdd.redis = require('redis').createClient();
	yzdd.redis_prename = 'yzdd_';
	yzdd.questions_per_group = 5;
	yzdd.score_per_question = 10;
	return yzdd;
}

yzdd.next = function(message, callback) {
	var redis = yzdd.redis;
	var _keys = yzdd._keys;
	var _status = yzdd._status;
	yzdd.message = message;
	var user = message.FromUserName;
	var _putQuestionsIntoList = yzdd._putQuestionsIntoList;
	var _getNextQuestion = yzdd._getNextQuestion;
	_status('REGISTER', function(status){
		if(status){
			return callback('未注册，请先回复 注册');
		}else{
			_status('QUESTION', function(status){
				if(!status){
					return callback('已经取题过，请先回答');
				}else{
					redis.llen(_keys('user_questionList', user), function(err, count){
						console.log('1 questionList count : ',count);
						if(count == 0){
							_putQuestionsIntoList(user, function(){
								console.log('message.CreateTime:',message.CreateTime);
								redis.set(_keys('user_time', user), message.CreateTime);
								_getNextQuestion(user, function(text){
									callback(text);
								})
							})
						}else{
							_getNextQuestion(user, function(text){
								callback(text);
							});
						}
					});
				}
			});
		}
	});
};

yzdd.check = function(answer, message, callback) {
	var redis = yzdd.redis;
	var _keys = yzdd._keys;
	var score_per_question = yzdd.score_per_question;
	var _calcScore = yzdd._calcScore;
	var _setStatus = yzdd._setStatus;
	yzdd.message = message;

	yzdd._status('REGISTER', function(status){
		if(status){
			return callback('未注册，请先回复 注册');
		}
		yzdd._status('ANSWER', function(status){
			if(status){
				return callback('该题已经回答过，请回复 取题 或 qt 取下一道题');
			}
			yzdd._status('CHECK', function(status){
				if(!status){
					callback('还未取题，请先回复 取题 或 qt 取题');
				}else{
					redis.get(_keys('user_currentQuestion', message.FromUserName), function(err, question){
						redis.sismember(_keys('question_answer', question), answer, function(err, isTrue){
							redis.llen(_keys('user_questionList', message.FromUserName), function(err, count){
								var curscore = 0;
								curscore = isTrue ? score_per_question : 0;
								if(count == 0){//本组最后一道题
									redis.get(_keys('user_scoretmp', message.FromUserName), function(err, scoretmp){
										redis.get(_keys('user_time', message.FromUserName), function(err, starttime){
											redis.set(_keys('user_scoretmp', message.FromUserName), 0);
											var score = (scoretmp-0) + (curscore-0);
											score = _calcScore(message.CreateTime - starttime, score);
											score = Math.round(score);
											redis.incrby(_keys('user_score', message.FromUserName), score, function(err, response){});
											redis.hget(_keys('user_', message.FromUserName), 'zone', function(err, zone){//排名
												redis.zincrby(_keys('rank'), score, message.FromUserName);
												redis.zincrby(_keys('rank_', zone), score, message.FromUserName);
											})
											console.log('check starttime:',starttime,' endtime:',message.CreateTime)
											if(isTrue){
												callback('回答正确，本组题目回答完毕，得分'+score+'分\n请回复 取题 或 qt 取题');
											}else{
												callback('回答错误，本组题目回答完毕，得分'+score+'分\n请回复 取题 或 qt 取题');
											}
										});	
									});
								}else{//不是本组最后一题
									redis.incrby(_keys('user_scoretmp', message.FromUserName), curscore, function(err, scoretmp){
										var truecount = scoretmp/score_per_question;
										if(isTrue){
											callback('回答正确，本组答对'+truecount+'道题\n请回复 取题 或 qt 取题');
										}else{
											callback('回答错误，本组答对'+truecount+'道题\n请回复 取题 或 qt 取题');
										}
									});
								}
								_setStatus('CHECK');
							});
						});
					});
				}
			});
		});
	});
};

yzdd.score = function(message, callback) {
	var redis = yzdd.redis;
	var _keys = yzdd._keys;
	yzdd.message = message;
	var user = yzdd.message.FromUserName;
	yzdd.redis.get(_keys('user_score', user), function(err, totalscore){
		yzdd.redis.hget(_keys('user_', message.FromUserName), 'zone', function(err, zone){
			yzdd.redis.zrevrank(_keys('rank_', zone), message.FromUserName, function(err, rank){
				yzdd.redis.zcount(_keys('rank_', zone), '-inf', '+inf', function(err, count){
					rank++;
					count = count - rank;
					callback('你的总分数是'+totalscore+'分\n在赛区'+zone+'中排名'+rank+'名，打败了'+count+'个同学');
				});
			});
		});
		
	});
}

yzdd.register = function(info, message, callback) {
	var redis = yzdd.redis;
	var _keys = yzdd._keys;
	var multi = redis.multi();
	var _setStatus = yzdd._setStatus;
	yzdd.message = message;
	yzdd._status('REGISTER', function(status){
		if(status){
				multi.sadd(_keys('users'), message.FromUserName);
				multi.hmset(_keys('user_', message.FromUserName), info);
				multi.sadd(_keys('phones'), info.phone);
				multi.zadd(_keys('rank'), 0, message.FromUserName);//初始化总排名
				multi.zadd(_keys('rank_', info.zone), 0, message.FromUserName);//初始化赛区排名
				multi.set(_keys('user_score', message.FromUserName), 0);
				multi.exec(function(err, replies){
					_setStatus('REGISTER');
					callback('注册成功，回复 取题 或 qt 取题目');
				});
		}else{
			callback('已经注册，回复 取题 或 qt 取题目');
		}
	});
}

yzdd._calcScore = function(time, score) {	//根据答题时间计算分数
	if(time <= 60){
		return score;
	}else{
		score = score * (300 - time)/240;
		return (score < 0 ? 0 : score);
	}
}

yzdd._getNextQuestion = function(user, callback) { //取队列下一个问题
	var redis = yzdd.redis;
	var _keys = yzdd._keys;
	var _setStatus = yzdd._setStatus;
	var _questionToString = yzdd._questionToString;
	redis.lpop(_keys('user_questionList', user), function(err, question) {
		redis.get(_keys('question_content', question), function(err, question_content) {
			_questionToString(question_content, function(text) {
				redis.set(_keys('user_currentQuestion', user), question);
				_setStatus('QUESTION');
				callback(text);
			});
		});	
	});
}

yzdd._putQuestionsIntoList = function(user, callback) {
	console.log('_putQuestionsIntoList user:',user);
	var redis = yzdd.redis;
	var _keys = yzdd._keys;
	var questions_per_group = yzdd.questions_per_group;
	redis.srandmember(_keys('questions'), questions_per_group, function(err, questions) {
		redis.send_command('lpush', [_keys('user_questionList', user)].concat(questions), function(err, count){ //node_redis已知bug，只能这么写
		//redis.lpush(_keys('user_questionList', user), questions, function(err, count){
			console.log('_putQuestionsIntoList questions:',questions,' count:',count);
			if(count){
				callback();
			}
		});
	});
}

yzdd._questionToString = function(question, callback) { //问题的JSON to String
	var redis = yzdd.redis;
	var _keys = yzdd._keys;
	console.log(question);
	question = JSON.parse(question);
	console.log(question);
	var result = '[' + question.id.toString() + ']' + question.question;
	result += (question.options['A'] ? ('\nA:'+question.options['A']):'');
	result += (question.options['B'] ? ('\nB:'+question.options['B']):'');
	result += (question.options['C'] ? ('\nC:'+question.options['C']):'');
	result += (question.options['D'] ? ('\nD:'+question.options['D']):'');
	callback(result);
};

yzdd._isRegisted = function(uesr, callback) {
	var _keys = yzdd._keys;
	yzdd.redis.sismember(_keys('users'), user, function(err, isMember) {
		if(!err && !isMember) {
			callback(true);
		}else{
			callback(false);
		}
	});
}


yzdd._keys = function(rule, key) {
	var result;
	switch(rule) {
		case 'users':
			result = 'users';
			break;
		case 'questions':
			result = 'questions';
			break;
		case 'phones':
			result = 'phones';
			break;
		case 'question_content':
			result = 'question:' + key + ':content';
			break;
		case 'question_answer':
			result = 'question:' + key + ':answer';
			break;
		case 'user_':
			result = 'user:' + key;
			break;
		case 'user_time':
			result = 'user:' + key + ':time';
			break;
		case 'user_questionList':
			result = 'user:' + key + ':questionList';
			break;
		case 'user_currentQuestion':
			result = 'user:' + key + ':currentQuestion';
			break;
		case 'user_status':
			result = 'user:' + key + ':status';
			break;
		case 'user_score':
			result = 'user:' + key + ':score';
			break;
		case 'user_scoretmp':
			result = 'user:' + key + ':scoretmp';
			break;
		case 'rank':
			result = 'rank';
			break;
		case 'rank_':
			result = 'rank:' + key;	//赛区
			break;

	}
	return yzdd.redis_prename + result;
}

yzdd._status = function(flag, callback) {
	var message = yzdd.message;
	var _keys = yzdd._keys;
	yzdd.redis.get(_keys('user_status', message.FromUserName), function(err, status) {
		var result;
		if(!status){
			status = 01;//初始化status
		}
		switch(flag){
			case 'QUESTION'://是否可以出题
				result = (status > 10 ? true : false);
				break;
			case 'REGISTER'://是否可以注册
				result = (status < 10 ? true : false);
				break;
			case 'CHECK'://是否已经出题
				result = (status == 10 ? true : false);
				break;
			case 'ANSWER'://回答过
				result = (status == 12 ? true : false);
				break;
		}
		return callback(result);
	});
}

yzdd._setStatus = function(flag) {
	var _keys = yzdd._keys;
	var message = yzdd.message;
	switch(flag){
		case 'REGISTER'://注册
			console.log(message.FromUserName);
			yzdd.redis.set(_keys('user_status', message.FromUserName), 11);
			break;
		case 'QUESTION'://出题
			yzdd.redis.set(_keys('user_status', message.FromUserName), 10);
			break;
		case 'CHECK'://回答
			yzdd.redis.set(_keys('user_status', message.FromUserName), 12);
			break;
	}
}