module.exports = {

    // initialize api
    init: function (auth) {

        // create twit instance
        this.t = new Twit({
            consumer_key: auth.apiKey,
            consumer_secret: auth.apiSecretKey,
            access_token: auth.accessToken,
            access_token_secret: auth.accessTokenSecret,
        });
    },

    // get images
    getImages: async function (categories) {

        // cerate array
        let imagesFound = [];

        // loop through categories
        for (const [category, tags] of Object.entries(categories)) {

            // fetch data
            let tweets = await this.t.get('search/tweets', { q: `${tags} filter:media -filter:retweets`, count: settings.twitter.requestLimit, result_type: 'recent', tweet_mode: 'extended' });

            // extract data
            tweets = await tweets.data.statuses;

            // loop through tweets
            for (const tweet of tweets) {

                // extract images
                const imagesAvailable = tweet?.extended_entities?.media;

                // check for image (should have one, just to be sure)
                if (!imagesAvailable || imagesAvailable?.length == 0) continue;

                // get tweet location
                const tweetLocation = await this.getTweetLocation(tweet);

                // exit if no place found (remove for testing)
                if (!tweetLocation) continue;

                // get tweet time
                const time = new Date(tweet.created_at).toJSON()

                // loop through images
                for (const image of imagesAvailable) {

                    // push image to list
                    imagesFound.push({
                        time: time,
                        category: category,
                        post: {
                            platform: 'twitter',
                            id: tweet.id_str,
                            url: `https://twitter.com/i/web/status/${tweet.id_str}`,
                        },
                        image: {
                            platform: 'twitter',
                            id: image.id_str,
                            url: image.media_url_https,
                        },
                        location: tweetLocation,
                    });
                };
            };
        }

        // console log
        if (settings.twitter.consoleLog) {
            console.log(util.inspect(imagesFound, false, null, true));
        }

        // return
        return imagesFound;
    },

    getTweetLocation: async function(tweet) {

        // set up variables
        let tweetLocation = null;

        // search for tagged location
        if (tweet.place) {

            // get coordinates
            const [isPlace, coordinates, precision] = await places.get(tweet.place.name.trim());

            // save if place
            if (isPlace) {
                tweetLocation = {
                    coordinates,
                    precision,
                    name: tweet.place.name.trim()
                };
            }
        }

        // search for location in hashtags if needed
        if (!tweetLocation && tweet.entities?.hashtags) {

            // extracts hashtags
            let hashtags = tweet.entities.hashtags.map(x => x.text);

            // console for help
            // console.log(hashtags);

            // set up variables
            let potentialPlaces = [];

            // loop through hashtags
            for (let hashtag of hashtags) {

                // trim
                hashtag = hashtag.trim();

                // get location
                const [isPlace, coordinates, precision] = await places.get(hashtag);

                // return if not a place
                if (!isPlace) continue;

                // save if place
                potentialPlaces.push({
                    coordinates,
                    precision,
                    name: hashtag
                });
            };

            // console log for help
            console.log(potentialPlaces);

            // change precision if null
            for (potentialPlace of potentialPlaces) {
                if (potentialPlace.precision == null) {
                    potentialPlace.precision = 1;
                }
            }

            // if places
            if (potentialPlaces.length != 0) {

                // sort by most precise (smaller precision = better, smaller area)
                potentialPlaces.sort((a, b) => a.pri - b.pri);

                // save the most precise 
                tweetLocation = potentialPlaces[0];
            }
        }

        // search for location in user profile (ony for approximation)
        /* if (!tweetLocation && tweet.user.location && tweet.user.location != '') {

            // set up variables
            let potentialPlaces = [];

            // loop through hashtags
            for (let piece of tweet.user.location.split(',')) {
                // trim
                piece = piece.trim();

                // get location
                const [isPlace, coordinates, precision] = await places.get(piece);

                // return if not a place
                if (!isPlace) continue;

                // save if place
                potentialPlaces.push({
                    coordinates,
                    precision,
                    name: piece
                });
            };

            // console log for help
            console.log(potentialPlaces);

            // change precision if null
            for (potentialPlace of potentialPlaces) {
                if (potentialPlace.precision == null) {
                    potentialPlace.precision = 1;
                }
            }

            // if places
            if (potentialPlaces.length != 0) {

                // sort by most precise (smaller precision = better, smaller area)
                potentialPlaces.sort((a, b) => a.pri - b.pri);

                // save the most precise 
                tweetLocation = potentialPlaces[0];
            }
        } */

        return tweetLocation;
    },

    // all thins that download
    download: {

        // downloads one file
        file: function (uri, filename, callback) {
            request.head(uri, () => {
                request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
            });
        },

        // downloads list of images
        images: function (images) {
            for (image of images) {
                this.file(image.image.url, `${settings.twitter.downloadLoc}${image.image.id}.jpg`, () => {});
            }
        },
    },
}