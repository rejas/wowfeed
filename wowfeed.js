'use strict';

const port      = process.env.PORT || 3000;

var http        = require('http'),
    url         = require('url'),
    app         = require('./lib/app.js');

var wowfeed = {

    initialize: function () {

        // Create and start the server to handle requests
        http.createServer(function (request, response) {

            // Extract the searchquery from the url
            var url_parts = url.parse(request.url, true);

            var options = {
                character: url_parts.query.character,
                guild: url_parts.query.guild,
                realm: url_parts.query.realm,
                region: url_parts.query.region,
                showSteps: url_parts.query.steps !== 'false',
                maxItems: url_parts.query.maxItems || 20
            };

            // Actually create the feed
            app.createFeed(options, response);

        }).listen(port);

        console.log('Server running at port: ' + port);
    }
};

wowfeed.initialize();
