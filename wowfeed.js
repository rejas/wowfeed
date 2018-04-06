'use strict';

const fs    = require('fs'),
    http    = require('http'),
    url     = require('url'),
    app     = require('./lib/app.js'),
    ua      = require('universal-analytics'),
    port    = process.env.PORT || 3000,
    wowfeed = {

        /**
         * Tell the client the search params were not correct
         * @param response
         */
        writeErrorPage: (response) => {
            fs.readFile('./docs/index.html', 'binary', (err, file) => {
                if (err) {
                    console.log(err);
                }
                response.writeHead(200);
                response.write(file, 'binary');
                response.end();
            });
        },

        initialize: () => {
            // Create and start the server to handle requests
            http.createServer((request, response) => {
                let visitor = ua('UA-431999-5', {https: true});

                // Extract the searchquery from the url
                let urlParts = url.parse(request.url, true),
                    options = {
                        character: urlParts.query.character,
                        guild: urlParts.query.guild,
                        realm: urlParts.query.realm,
                        region: urlParts.query.region,
                        showSteps: urlParts.query.steps !== 'false',
                        maxItems: urlParts.query.maxItems || 20
                    };

                // Check if all mandatory options are there
                if (!options.region || !options.realm || !(options.character || options.guild)) {
                    visitor.pageview(`index`).send();
                    wowfeed.writeErrorPage(response);
                    return;
                }

                // Replace ' in realm names like Khaz'goroth
                if (options.realm) {
                    options.realm = options.realm.replace('\'', '');
                }

                // Send analytics events
                if (options.character) {
                    visitor.pageview(`character/${options.region}/${options.realm}/${options.character}`).send();
                } else if (options.guild) {
                    visitor.pageview(`character/${options.region}/${options.realm}/${options.guild}`).send();
                }

                // Actually create the feed
                app.createFeed(options, (feed) => {
                    // Tell the client that return value is of rss type
                    response.writeHead(200, {'Content-Type': 'application/rss+xml'});
                    response.write(feed.xml());
                    response.end();
                }, (error) => {
                    response.writeHead(200, {'Content-Type': 'text/html'});
                    response.write(error.code + ': ' + error.syscall);
                    response.end();
                });
            }).listen(port);

            console.log('Server running at port: ' + port);
        }
    };

wowfeed.initialize();
