"use strict";

var http = require('http'),
    rss = require('rss'),
    url = require('url'),
    armory = require('armory'),
    htmlparser = require('htmlparser');

var port = process.env.PORT || 3000;

var quality = ['#d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000', '#e6cc80', '#e6cc80'];

var armoryItem = {

    styleChar: function (char) {
        return char.name;
    },

    generateItemLink: function (res) {
        return "<img src='http://media.blizzard.com/wow/icons/18/" + res.icon + ".jpg'/>" +
            "<a href='http://www.battle.net/wow/en/item/" + res.id + "' style='color: " + quality[res.quality] + "; text-decoration: none'>" + res.name + "</a>";
    },

    generateAchievementLink: function (res) {
        return "<img src='http://media.blizzard.com/wow/icons/18/" + res.icon + ".jpg'/>" +
               "<strong>" + res.title + "</strong>";
    },

    processitem: function (item, basecharurl, callback) {
        var rss = {};
        rss.categories = [item.type];
        rss.date = item.timestamp;
        rss.guid = item.timestamp;

        switch (item.type) {

        case ("ACHIEVEMENT"):
            rss.title = "Achievement earned";
            rss.description = "Earned the achievement " + this.generateAchievementLink(item.achievement) + " for " + item.achievement.points + " points.";
            callback(null, rss);
            break;

        case ("CRITERIA"):
            rss.title = "Achievement step completed";
            rss.description = "Completed step <strong>" + item.criteria.description + "</strong> of achievement " + this.generateAchievementLink(item.achievement);
            callback(null, rss);
            break;

        case ("LOOT"):
            rss.title = "Item looted";
            armory.item(item.itemId, function (err, res) {
                rss.description = "Obtained " + armoryItem.generateItemLink(res);
                callback(this, rss);
            });
            break;

        case ("BOSSKILL"):
            rss.title = "Boss killed";
            rss.description = item.quantity + " " + item.achievement.title;
            callback(null, rss);
            break;

        case ("playerAchievement"):
            rss.title = "Player Achievement earned";
            rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> earned the achievement " + this.generateAchievementLink(item.achievement) + " for " + item.achievement.points + " points.";
            callback(null, rss);
            break;

        case ("itemPurchase"):
            rss.title = "Item purchased";
            armory.item(item.itemId, function (err, res) {
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> purchased item " + armoryItem.generateItemLink(res);
                callback(this, rss);
            });
            break;

        case ("itemLoot"):
            rss.title = "Item looted";
            armory.item(item.itemId, function (err, res) {
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> obtained item " + armoryItem.generateItemLink(res);
                callback(this, rss);
            });
            break;

        case ("itemCraft"):
            rss.title = "Item crafted";
            armory.item(item.itemId, function (err, res) {
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> crafted item " + armoryItem.generateItemLink(res);
                callback(this, rss);
            });
            break;

        case ("guildAchievement"):
            rss.title = "Guild Achievement earned";
            rss.description = "The guild earned the achievement <strong>" + item.achievement.title + "</strong> for " + item.achievement.points + " points.";
            callback(null, rss);
            break;

        default:
            console.log("Unhandled type: " + item.type);
            callback(null, rss);
            break;
        }
    }
};

var feedUtil = {
    sortRSS: function (a, b) {
        return (b.date - a.date);
    },

    capitalize: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
};

function process_char_query(region, realm, character, steps, responseObj) {
    var handler,
        html_parser,
        req,
        options = {
            host: region + '.battle.net',
            path: encodeURI('/api/wow/character/' + realm + '/' + character + '?fields=feed')
        };

    console.log("Fetching " + options.host + options.path);

    handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (!error) {
            var baseCharUrl = 'http://' + options.host + '/wow/character/' + realm + '/',
                outstandingCalls,
                arr = [],
                feed,
                js;

            // Parse JSON we get from blizzard
            try {
                js = JSON.parse(dom[0].data);
            } catch (e) {
                js = {};
                js.status = 'nok';
                js.reason = e.fileName + ":" + e.lineNumber + ":" + e.message;
            }

            if (js.status) {
                responseObj.writeHead(200, {'Content-Type': 'text/html'});
                responseObj.write(js.status + ": " + js.reason);
                responseObj.end();
                return;
            }

            outstandingCalls = js.feed.length;

            feed = new rss({
                title: feedUtil.capitalize(character) + ' on ' + feedUtil.capitalize(realm),
                description: 'rss feed generated from blizzards json feed-api',
                feed_url: 'http://' + options.host + options.path,
                site_url: baseCharUrl + character + '/feed',
                image_url: 'http://' + options.host + '/static-render/' + region + '/' + js.thumbnail,
                author: 'wowfeed@herokuapp.com'
            });

            // Loop over data and add to feed
            js.feed.forEach(function (item) {
                armoryItem.processitem(item, baseCharUrl, function (err, res) {

                    if (steps !== "false" || item.type !== "CRITERIA")
                        arr.push(res);

                    outstandingCalls--;
                    if (outstandingCalls === 0) {
                        arr.sort(feedUtil.sortRSS);
                        feed.items = arr;
                        //Print the RSS feed out as response
                        responseObj.write(feed.xml());
                        responseObj.end();
                    }
                });
            });
        }
    });

    html_parser = new htmlparser.Parser(handler);

    req = http.request(options, function (res) {
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

function process_guild_query(region, realm, guild, steps, responseObj) {
    var handler,
        html_parser,
        req,
        options = {
            host: region + '.battle.net',
            path: encodeURI('/api/wow/guild/' + realm + '/' + guild + '?fields=news')
        };

    console.log("Fetching " + options.host + options.path);

    handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (!error) {
            var baseCharUrl = 'http://' + options.host + '/wow/character/' + realm + '/',
                outstandingCalls,
                arr = [],
                feed,
                js;

            // Parse JSON we get from blizzard
            try {
                js = JSON.parse(dom[0].data);
            } catch (e) {
                js = {};
                js.status = 'nok';
                js.reason = e.fileName + ":" + e.lineNumber + ":" + e.message;
            }

            if (js.status) {
                responseObj.writeHead(200, {'Content-Type': 'text/html'});
                responseObj.write(js.status + ": " + js.reason);
                responseObj.end();
                return;
            }

            outstandingCalls = js.news.length;

            feed = new rss({
                title: feedUtil.capitalize(guild) + ' on ' + feedUtil.capitalize(realm),
                description: 'rss feed generated from blizzards json feed-api',
                feed_url: 'http://' + options.host + options.path,
                site_url: 'http://' + options.host + '/wow/guild/' + realm + '/' + guild + '/feed',
                author: 'wowfeed@herokuapp.com'
            });

            // Loop over data and add to feed
            js.news.forEach(function (item) {
                armoryItem.processitem(item, baseCharUrl, function (err, res) {
                    arr.push(res);
                    outstandingCalls--;
                    if (outstandingCalls === 0) {
                        arr.sort(feedUtil.sortRSS);
                        feed.items = arr;
                        //Print the RSS feed out as response
                        responseObj.write(feed.xml());
                        responseObj.end();
                    }
                });
            });
        }
    });

    html_parser = new htmlparser.Parser(handler);

    req = http.request(options, function (res) {
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
    var url_parts = url.parse(request.url, true),
        character = url_parts.query.character,
        realm = url_parts.query.realm,
        region = url_parts.query.region,
        steps = url_parts.query.steps,
        guild = url_parts.query.guild;

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
            process_char_query(region, realm, character, steps, response);
        } else if (guild) {
            process_guild_query(region, realm, guild, steps, response);
        }
    }
}).listen(port);

console.log('Server running at http://localhost:' + port);