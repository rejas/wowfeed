var http = require('http'),
    rss = require('rss'),
    url = require('url'),
    armory = require('armory'),
    htmlparser = require('htmlparser');

var port = process.env.PORT || 3000;

function processitem(item, callback) {

    var rss = {};
    rss.date = item.timestamp;
    rss.categories = [item.type];
    rss.title = item.type;
    rss.guid = 0;
    rss.author = 'todo author';
    rss.url = 'todo url';

    switch (item.type) {

        case ("ACHIEVEMENT"):
            rss.title = item.achievement.title;
            rss.description = "Earned the achievement <strong>" + item.achievement.description + "</strong> for " + item.achievement.points + " points.";
            callback(this, rss);
            break;

        case ("CRITERIA"):
            rss.title = item.achievement.title;
            rss.description = "Completed step <strong>" + item.criteria.description + "</strong> of achievement <strong>" + item.achievement.description + "</strong>";
            callback(this, rss);
            break;

        case ("LOOT"):
            rss.title = "Loot";
            armory.item(item.itemId, function(err, res) {
                rss.description = "Obtained  <strong>" + res.name + "</strong>";
                callback(this, rss);
            });
            break;

        case ("BOSSKILL"):
            rss.title = item.name;
            rss.description = item.quantity + " " + item.achievement.title;
            callback(this, rss);
            break;

        case ("playerAchievement"):
            rss.title = item.achievement.title;
            rss.description = item.character + " earned the achievement <strong>" + item.achievement.title + "</strong> for " + item.achievement.points + " points.";
            callback(this, rss);
            break;

        case ("itemPurchase"):
            rss.title = "Item purchased";
            armory.item(item.itemId, function(err, res) {
                rss.description = item.character + " purchased item  <strong>" + res.name + "</strong>";
                callback(this, rss);
            });
            break;

        case ("itemLoot"):
            rss.title = "Item looted";
            armory.item(item.itemId, function(err, res) {
                rss.description = item.character + " obtained item  <strong>" + res.name + "</strong>";
                callback(this, rss);
            });
            break;

        case ("itemCraft"):
            rss.title = "Item crafted";
            armory.item(item.itemId, function(err, res) {
                rss.description = item.character + " crafted item  <strong>" + res.name + "</strong>";
                callback(this, rss);
            });
            break;

        case ("guildAchievement"):
            rss.title = item.achievement.title;
            rss.description = "The guild earned the achievement <strong>" + item.achievement.title + "</strong> for " + item.achievement.points + " points.";
            callback(this, rss);
            break;

        default:
            console.log("Unhandled type: " + item.type);
            callback(this, rss);
            break;
    }
}

function sortRSS(a, b) {
    return (b.date - a.date);
}

function process_char_query(region, realm, character, responseObj) {
    var options = {
        host: region + '.battle.net',
        path: encodeURI('/api/wow/character/' + realm + '/' + character + '?fields=feed')
    };

    console.log("Fetching " + options.host+ options.path);

    var handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (error) {
            console.log("error: " + error);
        }
         else {
            ///////////// Generate RSS feed
            var feed = new rss({
                title: 'RSS feed for ' + character + ' on ' + realm,
                description: 'RSS feed generated from blizzards json feed-api',
                feed_url: 'http://' + options.host + options.path,
                site_url: 'http://' + options.host + '/wow/character/' + realm + '/' + character + '/feed',
                author: 'rejas'
            });


            try {
                js = JSON.parse(dom[0].data);
            } catch (e) {
                js = {}
                body.status = 'nok';
                body.reason = e.fileName + ":" + e.lineNumber + ":" + e.message
            }

            if (js.status)
            {
                responseObj.writeHead(200, {'Content-Type': 'text/html'});
                responseObj.write(js.status + ": " + js.reason);
                responseObj.end();
                return;
            }

            var outstandingCalls = js.feed.length;
            var arr = [];

            // Loop over data and add to feed
            js.feed.forEach(function (item) {
                processitem(item, function (err, res) {
                    arr.push(res);
                    outstandingCalls--;
                    if (outstandingCalls == 0) {
                        arr.sort(sortRSS);
                        feed.items = arr;
                        //Print the RSS feed out as response
                        responseObj.write(feed.xml());
                        responseObj.end();
                    }
                });
            });
        }
    });
    var html_parser = new htmlparser.Parser(handler);

    var req = http.request(options, function (res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));

        var alldata = "";
        res.on('data', function (chunk) {
            alldata = alldata + chunk;
        });
        res.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        res.on('end', function () {
            html_parser.parseComplete(alldata);
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });

    req.end();
}

function process_guild_query(region, realm, guild, responseObj) {
    var options = {
        host: region + '.battle.net',
        path: encodeURI('/api/wow/guild/' + realm + '/' + guild + '?fields=news'),
        encoding:     'utf-8'
    };

    console.log("Fetching " + options.host+ options.path);

    var handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (!error) {
            ///////////// Generate RSS feed
            var feed = new rss({
                title: 'RSS feed for ' + guild + ' on ' + realm,
                description: 'RSS feed generated from blizzards json feed-api',
                feed_url: 'http://' + options.host + options.path,
                site_url: 'http://' + options.host + '/wow/guild/' + realm + '/' + guild + '/feed',
                author: 'rejas'
            });

            // Parse JSON we get from blizzard
            var js = JSON.parse(dom[0].data);

            if (js.status)
            {
                responseObj.writeHead(200, {'Content-Type': 'text/html'});
                responseObj.write(js.status + ": " + js.reason);
                responseObj.end();
                return;
            }

            var outstandingCalls = js.news.length;
            var arr = [];

            // Loop over data and add to feed
            js.news.forEach(function (item) {
                processitem(item, function (err, res) {
                    arr.push(res);
                    outstandingCalls--;
                    if (outstandingCalls == 0) {
                        arr.sort(sortRSS);
                        feed.items = arr;
                        //Print the RSS feed out as response
                        responseObj.write(feed.xml());
                        responseObj.end();
                    }
                });
            });
        }
    });
    var html_parser = new htmlparser.Parser(handler);

    var req = http.request(options, function (res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));

        var alldata = "";
        res.on('data', function (chunk) {
            alldata = alldata + chunk;
        });
        res.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        res.on('end', function () {
            html_parser.parseComplete(alldata);
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });

    req.end();
}

/////////// Create and start the server to handle requests
http.createServer(function (request, response) {
    // Extract the searchquery from the url
    var url_parts = url.parse(request.url, true);
    var character = url_parts.query.character;
    var realm = url_parts.query.realm;
    var region = url_parts.query.region;
    var guild = url_parts.query.guild;

    if (!region || !realm || !(character || guild)) {
        // Tell the client the search params were not correct
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end('Invalid call, please specify region, realm as well as character or guild.\n');
    } else {
        // Tell the client that return value is of rss type
        response.writeHead(200, {'Content-Type': 'application/rss+xml'});

        armory = require('armory').defaults({
            realm: realm,
            region: region
        });

        if (character) {
            process_char_query(region, realm, character, response);
        } else if (guild) {
            process_guild_query(region, realm, guild, response);
        }
    }
}).listen(port);

console.log('Server running at http://localhost:' + port);