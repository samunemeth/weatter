// console
console.log('> Loading...');

// requiring libraries 
global.fs = require('fs');
global.fetch = require('node-fetch');
global.Twit = require('twit');
global.util = require('util');
global.request = require('request');
global.spawn = require('child_process').spawn;

// requiring modules
global.twitter = require('./modules/twitter');
global.places = require('./modules/places');

// requiring json-s
global.settings = require('./settings/settings.json');
global.auth = require('./settings/auth.json')

// console
console.log('> Initializing...');

// initialize
twitter.init(auth.twitter);

places.file.load();

// console
console.log('> Running...');

// main body
(async () => {

    // get images and their metadata
    const images = await twitter.getImages(settings.categories); // get the image metadata
    await twitter.download.images(images); // save images (disable for performance)
    places.file.save(); // save places

    // run python script
    const python = spawn('python', ['images.py']);
    console.log('> Piping data from python...');
    console.log('> ------------------------------');

    // pipe data from python
    python.stdout.on('data', (data) => {
        console.log(data.toString().slice(0, -1));
    });

    // console when python script finishes
    python.on('close', (code) => {

        // close python script piping
        console.log('> ------------------------------');
        console.log(`> Python exited with code: '${code}'`);

        // script end
        console.log('> Finished!');
    });
})();