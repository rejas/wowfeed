"use strict";

var http = require('http'),
    RSS = require('rss'),
    url = require('url'),
    armory = require('armory'),
    htmlparser = require('htmlparser');

var port = process.env.PORT || 3000;

var qualityColor = ['#d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000', '#e6cc80', '#e6cc80'];

var armoryItem = {

    styleChar: function (c) {
        return "style='text-decoration: none'";
    },

    styleItem: function (i) {
        return "style='color: " + qualityColor[i.quality] + "; text-decoration: none'";
    },

    generateItemLink: function (res) {
        return "<img src='http://media.blizzard.com/wow/icons/18/" + res.icon + ".jpg'/>" +
            "<a href='http://www.wowhead.com/item=" + res.id + "' " + this.styleItem(res) + ">" + res.name + "</a>";
    },

    generateAchievementLink: function (res) {
        return "<img src='http://media.blizzard.com/wow/icons/18/" + res.icon + ".jpg'/>" +
               "<a href='http://www.wowhead.com/achievement=" + res.id + "' style='color: #e1b105; text-decoration: none'>" + res.title + "</a>";
    },

    processitem: function (item, basecharurl, callback) {
        var rss = {};
        rss.categories = [item.type];
        rss.date = item.timestamp;
        rss.guid = item.timestamp;

        switch (item.type) {

        case ("ACHIEVEMENT"):
            rss.title = "Earned the achievement '" + item.achievement.title + "'";
            rss.description = "Earned the achievement " + this.generateAchievementLink(item.achievement) + " for " + item.achievement.points + " points.";
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            callback(null, rss);
            break;

        case ("CRITERIA"):
            rss.title = "Completed the step '" + item.criteria.description + "' of achievement '" + item.achievement.title + "'";
            rss.description = "Completed step <strong style='color: #fef092'>" + item.criteria.description + "</strong> of achievement " + this.generateAchievementLink(item.achievement);
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            callback(null, rss);
            break;

        case ("LOOT"):
            armory.item(item.itemId, function (err, res) {
                rss.title = "Looted '" + res.name + "'";
                rss.description = "Obtained " + armoryItem.generateItemLink(res);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                callback(this, rss);
            });
            break;

        case ("BOSSKILL"):
            rss.title = "Killed " + item.name;
            rss.description = item.quantity + " " + item.achievement.title;
            callback(null, rss);
            break;

        case ("playerAchievement"):
            rss.title = item.character + " earned the achievement '" + item.achievement.title + "'";
            rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> earned the achievement " + this.generateAchievementLink(item.achievement) + " for " + item.achievement.points + " points.";
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            callback(null, rss);
            break;

        case ("itemPurchase"):
            armory.item(item.itemId, function (err, res) {
                rss.title = item.character + " purchased '" + res.name + "'";
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> purchased item " + armoryItem.generateItemLink(res);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                callback(this, rss);
            });
            break;

        case ("itemLoot"):
            armory.item(item.itemId, function (err, res) {
                rss.title = item.character + " looted '" + res.name + "'";
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> obtained item " + armoryItem.generateItemLink(res);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                callback(this, rss);
            });
            break;

        case ("itemCraft"):
            armory.item(item.itemId, function (err, res) {
                rss.title = item.character + " crafted '" + res.name + "'";
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> crafted item " + armoryItem.generateItemLink(res);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                callback(this, rss);
            });
            break;

        case ("guildAchievement"):
            rss.title = "Guild earned '" + item.achievement.title + "'";
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

var app = {
    process_guild_query: function (region, realm, guild, steps, responseObj) {
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

                feed = new RSS({
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
                        outstandingCalls -= 1;
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
    },

    process_char_query: function (region, realm, character, steps, responseObj) {
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

                feed = new RSS({
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

                        if (steps !== "false" || item.type !== "CRITERIA") {
                            arr.push(res);
                        }

                        outstandingCalls -= 1;

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
    },

    initialize: function () {
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
                response.end('Invalid call, please specify region, realm as well as character or guild.\n Something like this: '
                    + '<a href="https://wowfeed.herokuapp.com/?region=eu&realm=khazgoroth&character=grimstone" > wowfeed.herokuapp.com/?region=eu&realm=khazgoroth&character=grimstone </a>');
            } else {
                // Tell the client that return value is of rss type
                response.writeHead(200, {'Content-Type': 'application/rss+xml'});

                armory = require('armory').defaults({
                    realm: realm,
                    region: region
                });

                if (character) {
                    app.process_char_query(region, realm, character, steps, response);
                } else if (guild) {
                    app.process_guild_query(region, realm, guild, steps, response);
                }
            }
        }).listen(port);

        console.log('Server running at http://localhost:' + port);
    }
};

app.initialize();