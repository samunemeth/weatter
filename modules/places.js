module.exports = {
    get: async function (name) {

        // get entry
        const entry = this.places[name];

        if (entry == 0) {

            // console for help
            // console.log('loaded from file!');

            // if not a place, return
            return [false, undefined, Infinity];

        } else if (entry) {

            // console for help
            // console.log('loaded from file!');

            // if a place, return with coordinates
            return [true, entry.coordinates, entry.precision];

        } else {

            /* if we don't know yet, request it from wikipedia */

            // search on mediawiki
            const searchResult = await this.mediaWiki.search(name);

            // return if not found
            if (!searchResult) {
                this.places[name] = 0;
                return [false, [], Infinity];
            }

            // get wikidata id by mediawiki id
            const id = await this.mediaWiki.id(searchResult);

            // console log for help
            console.log(id, name);
            
            // return if not found
            if (!id) {
                this.places[name] = 0;
                return [false, [], Infinity];
            }

            // get wikidata entry
            const data = await this.wikiData.coordinates(id);

            // extract objects and values
            const locationObject = data[0];
            const coordinates = [locationObject?.latitude, locationObject?.longitude];

            const areaObject = data[1];
            const precision = parseInt(areaObject?.amount);
            console.log(areaObject);
            console.log(areaObject?.amount, precision);

            // return if no coordinates or precision
            if (!locationObject || !areaObject?.amount) {
                this.places[name] = 0;
                return [false, [], Infinity];
            }

            //add to list
            this.places[name] = {
                coordinates,
                precision,
            }

            // return data
            return [true, coordinates, precision];
        }
    },
    
    // mediaWiki related things
    mediaWiki: {

        search: async function(word) {
    
            // fetch data
            const response = await this.fetch(`https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query&list=search&srsearch=${word}&srlimit=2&srprop=size|wordcount|timestamp|snippet|categorysnippet`);
    
            // return
            return response?.query?.search?.[0]?.pageid;
        },
    
        id: async function(id) {
    
            // fetch data
            const response = await this.fetch(`https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query&prop=pageprops&pageids=${id}`);
    
            // return
            return response?.query?.pages?.[id]?.pageprops?.wikibase_item;
        },
    
        fetch: async function(url) {
            let response = await fetch(encodeURI(url), { headers: { 'User-Agent': auth.places.userAgent } });
        
            // see if json
            try {
                response = await response.json();
            } catch {
                console.log(response);
            }
    
            // return
            return response;
        },
    },

    // wikiData related things
    wikiData: {

        coordinates: async function(id) {
    
            // fetch data
            let response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`);
            try {
                response = await response.json();
            } catch {
                response = await response.json();
                throw response;
            }
            
    
            // return
            return [
                response?.entities?.[id]?.claims?.P625?.[0]?.mainsnak?.datavalue?.value,
                response?.entities?.[id]?.claims?.P2046?.[0]?.mainsnak?.datavalue?.value,
            ];
        },
    },

    // save file related things
    file: {

        save: function() {
    
            // save file
            const saveableData = JSON.stringify(places.places, null, 2);
            fs.writeFileSync(settings.places.saveFilePath, saveableData);
        },
    
        load: function() {
    
            // load file
            const rawData = fs.readFileSync(settings.places.saveFilePath);
            places.places = JSON.parse(rawData);;
        },
    },
}

