test = function() {
		
};

test.prototype.getName = function() {
	console.log(this.name);
};

test.prototype.setName = function(name) {
	this.name = name;
	this.changeName(name, function(newname){
		console.log(this.name);
	})
};

test.prototype.changeName = function(name, callback) {
	this.name = name;
	callback(name);
}

t = new test();
t.setName('a');
t.getName();