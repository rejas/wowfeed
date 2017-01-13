'use strict';

const fs    = require('fs'),
    http    = require('http'),
    url     = require('url'),
    app     = require('./lib/app.js'),
    port    = process.env.PORT || 3000,
    wowfeed = {

        /**
         * Tell the client the search params were not correct
         * @param response
         */
        writeErrorPage: function(response) {
            fs.readFile('./html/index.html', 'binary', function(err, file) {
                response.writeHead(200);
                response.write(file, 'binary');
                response.end();
            });
        },

        initialize: function() {
            // Create and start the server to handle requests
            http.createServer(function(request, response) {
                // Extract the searchquery from the url
                var urlParts = url.parse(request.url, true),
                    options = {
                        character: urlParts.query.character,
                        guild: urlParts.query.guild,
                        realm: urlParts.query.realm,
                        region: urlParts.query.region,
                        showSteps: urlParts.query.steps !== 'false',
                        maxItems: urlParts.query.maxItems || 20
                    };

                if (!options.region || !options.realm || !(options.character || options.guild)) {
                    wowfeed.writeErrorPage(response);
                    return;
                }

                // Replace ' in realm names like Khaz'goroth
                if (options.realm) {
                    options.realm = options.realm.replace("'", '');
                }

                // Actually create the feed
                app.createFeed(options, function(feed) {
                    // Tell the client that return value is of rss type
                    response.writeHead(200, {'Content-Type': 'application/rss+xml'});
                    response.write(feed.xml());
                    response.end();
                }, function(error) {
                    response.writeHead(200, {'Content-Type': 'text/html'});
                    response.write(error.code + ': ' + error.syscall);
                    response.end();
                });
            }).listen(port);

            console.log('Server running at port: ' + port);
        }
    };

wowfeed.initialize();
