/**
 * tweetstream
 * Copyright(c) 2012 Mark Wilson <mark@89allport.co.uk>
 * MIT Licensed
 **/

var TweetStream = require('./lib/tweetstream');

var stream = new TweetStream({
    track: [
        'node.js'
    ]
}, {
    username: '<twitter-username>',
    password: '<twitter-password>'
});

stream.on('tweet', function (tweet) {
    console.log(tweet.user.screen_name, '-', tweet.text);
});

stream.start();
