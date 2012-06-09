// requirements
var https = require('https'),
	querystring = require('querystring'),
	events = require('events'),
	util = require('util');

// default options, all can be overridden
var defaultOptions = {
	username: '',
	password: '',
	showProtectedTweets: false,
	userLanguage: false
};

// default postData, twitter API requires at least one parameter defined
var defaultPostData = {
	track: false,
	locations: false,
	follow: false
};

// required postData
var forcedPostData = {
	stallWarnings: 'true'
};



// var tweetstream = new events.EventEmitter();
function TweetStream(postData, options) {
	events.EventEmitter.call(this);
	
	// initialise
	
	this.postData = defaultPostData;
	this.options = defaultOptions;
	
	// set up postData
	for (var i in postData) {
		this.postData[i] = postData[i];
	}
	for (var i in forcedPostData) {
		this.postData[i] = forcedPostData[i];
	}
	
	// set up options
	for (var i in options) {
		this.options[i] = options[i];
	}
	
	// set up postData query string
	var tempPostData = {};
	for (var i in this.postData) {
		var dataItem = this.postData[i];
		if (util.isArray(dataItem.constructor)) {
			tempPostData[i] = dataItem.join(',');
		}
		else if (dataItem) {
			tempPostData[i] = dataItem;
		}
	}
	this.postDataString = querystring.stringify(tempPostData);
	delete tempPostData;
	
	// set https request options
	this.requestOptions = {
		auth: this.options.username + ':' + this.options.password,
		host: 'stream.twitter.com',
		port: 443,
		path: '/1/statuses/filter.json',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': this.postDataString.length
		}
	};
}

// extend the event emitter
TweetStream.prototype = new events.EventEmitter();

TweetStream.prototype.start = function() {
	var stream = this;
	
	// initialise the https request
	var request = https.request(stream.requestOptions, function(res) {
		// fire connected event
		stream.emit('connected');
		
		
		// UTF-8 encoding
		res.setEncoding('utf8');
		
		
		res.on('close', function(err) {
			// request was closed, fire closed event
			stream.emit('close', err);
		});
		
		
		// response was accepted
		if (res.statusCode == 200) {
			// receive chunked data
			res.on('data', function(chunk) {
				// ignore blank data
				if (chunk == '' || chunk.replace(/^\s+/, '') == '') {
					return;
				}
				
				var tweet;
				try {
					tweet = JSON.parse(chunk);
				}
				catch (e) {
					// fire parsing error event
					stream.emit('parse error', chunk);
					return;
				}
				
				
				// check if tweet is actually just a stall_warning
				if (tweet.warning) {
					stream.emit('warning', tweet);
				}
				
				
				
				// ignore protected tweets
				if (! exports.showProtectedTweets && (! tweet.user || tweet.user['protected'])) {
					// fire protected tweet ignored event
					stream.emit('protected tweet', tweet);
					return;
				}
				
				// ignore anything except specified language
				if (exports.userLanguage && tweet.user.lang != exports.userLanguage) {
					// fire language ignored event
					stream.emit('language tweet', tweet);
					return;
				}
				
				// fire new tweet event
				stream.emit('tweet', tweet);
			});
		}
		else {
			// fire unable to connect event
			stream.emit('no connection', { statusCode: res.statusCode, response: res });
		}
	});
	
	// error received in request
	request.on('error', function(e) {
		// fire unable to connect event
		stream.emit('error', e);
	});
	
	// initialise request by writing postData to connection
	request.write(this.postDataString);
	request.end();
}

module.exports = TweetStream;
module.exports.version = '0.1.0';