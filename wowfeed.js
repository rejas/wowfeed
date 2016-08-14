'use strict';

const port      = process.env.PORT || 3000;

var http        = require('http'),
    url         = require('url'),
    app         = require('./lib/app.js');

var wowfeed = {

    /**
     * Tell the client the search params were not correct
     * @param response
     */
    writeErrorPage: function(response) {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write('wowfeed version ' + require('./package.json').version + '<br>');
        response.write('Invalid call, please specify region, realm as well as character or guild.<br>');
        response.write('Something like this for characters: ' +
            '<a href="https://wowfeed.herokuapp.com/?region=eu&realm=Khaz%27Goroth&character=Grimstone" > ' +
            'wowfeed.herokuapp.com/?region=eu&realm=Khaz%27Goroth&character=Grimstone</a><br>');
        response.write('or for guilds: ' +
            '<a href="https://wowfeed.herokuapp.com/?region=eu&realm=Khaz%27Goroth&guild=Mokrah+Toktok" > ' +
            'wowfeed.herokuapp.com/?region=eu&guild=Mokrah+Toktok&realm=Khaz%27Goroth</a><br>');
        response.end();
    },

    initialize: function() {
        // Create and start the server to handle requests
        http.createServer(function(request, response) {
            // Extract the searchquery from the url
            var urlParts = url.parse(request.url, true);

            var options = {
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
            app.createFeed(options, response, function(feed) {
                // Tell the client that return value is of rss type
                response.writeHead(200, {'Content-Type': 'application/rss+xml'});
                response.write(feed.xml());
                response.end();
            }, function(error) {
                console.log(error);
                response.writeHead(200, {'Content-Type': 'text/html'});
                response.write(error.status + ': ' + error.reason);
                response.end();
            });
        }).listen(port);

        console.log('Server running at port: ' + port);
    }
};

wowfeed.initialize();
