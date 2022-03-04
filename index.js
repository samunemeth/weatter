// console
console.log('> loading...');

// requiring libraries 
global.fs = require('fs');
global.fetch = require('node-fetch');
global.Twit = require('twit');
global.util = require('util');
request = require('request');

// requiring modules
global.twitter = require('./modules/twitter');
global.places = require('./modules/places');

// requiring json-s
global.settings = require('./settings/settings.json');
global.auth = require('./settings/auth.json')

// console
console.log('> loaded!');
console.log('> initializing...');

// initialize
twitter.init(auth.twitter);

places.file.load();

// console
console.log('> initialized!');
console.log('> running...');

// get tweets with media, and extract the image urls
(async () => {
    const urls = await twitter.getImages(settings.categories);
    twitter.download.images(urls); // disable for performance
    places.file.save();
})();

// console
console.log('> finished!');