'use strict';

const fs    = require('fs'),
    http    = require('http'),
    url     = require('url'),
    ua      = require('universal-analytics'),
    app     = require('./lib/app.js'),
    port    = process.env.PORT || 3000,
    wowfeed = {

        /**
         * Tell the client the search params were not correct
         * @param response
         */
        createIndexPage: (response) => {
            fs.readFile('./docs/index.html', 'binary', (err, file) => {
                if (err) {
                    console.log(err);
                }
                response.writeHead(200);
                response.write(file, 'binary');
                response.end();
            });
        },

        /**
         * Tell the client that return value is of rss type
         * @param response
         */
        createFeedPage: (response, feed) => {
            response.writeHead(200, {'Content-Type': 'application/rss+xml'});
            response.write(feed.rss2());
            response.end();
        },

        /**
         * Tell the client what the error is
         * @param error
         */
        createErrorPage: (response, error) => {
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(`Error: ${error.response.status} - ${error.response.statusText}`);
            response.end();
        },

        initialize: () => {
            // Create and start the server to handle requests
            http.createServer((request, response) => {
                let analytics = ua('UA-431999-5', {https: true});

                // Extract the searchquery from the url
                let urlParts = url.parse(request.url, true),
                    options = {
                        character: urlParts.query.character,
                        guild: urlParts.query.guild,
                        realm: urlParts.query.realm,
                        region: urlParts.query.region,
                        showSteps: urlParts.query.showSteps !== 'false',
                        maxItems: urlParts.query.maxItems || 20
                    };

                // Check if all mandatory options are there
                if (!options.region || !options.realm || !(options.character || options.guild)) {
                    analytics.pageview('index').send();
                    wowfeed.createIndexPage(response);
                    return;
                }

                // Replace ' in realm names like Khaz'goroth
                if (options.realm) {
                    options.realm = options.realm.replace('\'', '');
                }

                // Actually create the feed
                app.createFeed(options)
                    .then(feed => {
                        // Send analytics events
                        if (options.character) {
                            analytics.pageview(`character/${options.region}/${options.realm}/${options.character}`).send();
                        } else if (options.guild) {
                            analytics.pageview(`guild/${options.region}/${options.realm}/${options.guild}`).send();
                        }
                        return wowfeed.createFeedPage(response, feed);
                    })
                    .catch(error => {
                        // Send analytics exception
                        analytics.exception({
                            dp: request.url,
                            exd: `${error.response.status} - ${error.response.statusText}`
                        }).send();
                        wowfeed.createErrorPage(response, error);
                    });
            }).listen(port);

            console.log('Server running at port: ' + port);
        }
    };

wowfeed.initialize();
