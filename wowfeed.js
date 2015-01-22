"use strict";

var http = require('http'),
    RSS = require('rss'),
    url = require('url'),
    armory = require('./armory'),
    htmlparser = require('htmlparser'),
    pjson = require('./package.json'),

    version = pjson.version,
    port = process.env.PORT || 3000,
    max_feed_item = 20,

    qualityColor = ['#d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000', '#e6cc80', '#e6cc80'];

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

    processGuildItem: function (item, basecharurl, callback) {
        var rss = {};
        rss.categories = [item.type];
        rss.date = item.timestamp;
        rss.guid = item.timestamp;

        switch (item.type) {

        case ("playerAchievement"):
            rss.title = item.character + " earned the achievement '" + item.achievement.title + "'";
            rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> earned the achievement " + this.generateAchievementLink(item.achievement) + " for " + item.achievement.points + " points.";
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            callback(rss);
            break;

        case ("itemPurchase"):
            armory.item(item.itemId, function (err, res) {
                rss.title = item.character + " purchased '" + res.name + "'";
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> purchased item " + armoryItem.generateItemLink(res);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                callback(rss, err);
            });
            break;

        case ("itemLoot"):
            armory.item(item.itemId, function (err, res) {

                // TODO this deserves a rewrite
                if (res.availableContexts && res.availableContexts[0] !== '') {

                    armory.item({ id: item.itemId, context: res.availableContexts[0] }, function (err2, res2) {
                        rss.title = item.character + " looted '" + res2.name + "'";
                        rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> obtained item " + armoryItem.generateItemLink(res2);
                        rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res2.icon + '.jpg', type: 'image/jpg'};
                        callback(rss, err2);
                    });

                } else {
                    rss.title = item.character + " looted '" + res.name + "'";
                    rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a> obtained item " + armoryItem.generateItemLink(res);
                    rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                    callback(rss, err);
                }
            });
            break;

        case ("itemCraft"):
            armory.item(item.itemId, function (err, res) {

                // TODO this deserves a rewrite
                if (res.availableContexts && res.availableContexts[0] !== '') {

                    armory.item({ id: item.itemId, context: res.availableContexts[0] }, function (err2, res2) {
                        rss.title = item.character + " crafted '" + res2.name + "'";
                        rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character +
                        "</a> crafted item " + armoryItem.generateItemLink(res2);
                        rss.enclosure = {
                            url: 'http://media.blizzard.com/wow/icons/56/' + res2.icon + '.jpg',
                            type: 'image/jpg'
                        };
                        callback(rss, err2);
                    });

                } else {
                    rss.title = item.character + " crafted '" + res.name + "'";
                    rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character +
                        "</a> crafted item " + armoryItem.generateItemLink(res);
                    rss.enclosure = {
                        url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg',
                        type: 'image/jpg'
                    };
                    callback(rss, err);
                }
            });
            break;

        case ("guildAchievement"):
            rss.title = "Guild earned '" + item.achievement.title + "'";
            rss.description = "The guild earned the achievement <strong>" + item.achievement.title + "</strong> for " + item.achievement.points + " points.";
            callback(rss);
            break;

        default:
            console.log("Unhandled guild item type: " + item.type);
            callback(rss);
            break;
        }
    },

    processCharacterItem: function (item, callback) {
        var rss = {};
        rss.categories = [item.type];
        rss.date = item.timestamp;
        rss.guid = item.timestamp;

        switch (item.type) {

        case ("ACHIEVEMENT"):
            rss.title = "Earned the achievement '" + item.achievement.title + "'";
            rss.description = "Earned the achievement " + this.generateAchievementLink(item.achievement) + " for " + item.achievement.points + " points.";
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            callback(rss);
            break;

        case ("CRITERIA"):
            if (item.criteria.description !== '') {
                rss.title = "Completed step '" + item.criteria.description + "' of achievement '" + item.achievement.title + "'";
            } else {
                rss.title = "Completed step of achievement '" + item.achievement.title + "'";
            }
            rss.description = "Completed step <strong style='color: #fef092'>" + item.criteria.description + "</strong> of achievement " + this.generateAchievementLink(item.achievement);
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            callback(rss);
            break;

        case ("LOOT"):

            armory.item(item.itemId, function (err, res) {

                // TODO this deserves a rewrite
                if (res.availableContexts && res.availableContexts[0] !== '') {

                    armory.item({ id: item.itemId, context: res.availableContexts[0] }, function (err2, res2) {
                        rss.title = "Looted '" + res2.name + "'";
                        rss.description = "Obtained " + armoryItem.generateItemLink(res2);
                        rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res2.icon + '.jpg', type: 'image/jpg'};
                        callback(rss, err2);
                    });

                } else {
                    rss.title = "Looted '" + res.name + "'";
                    rss.description = "Obtained " + armoryItem.generateItemLink(res);
                    rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                    callback(rss, err);
                }
            });
            break;

        case ("BOSSKILL"):
            if (item.name != "") {
                rss.title = "Killed " + item.name;
            } else {
                rss.title = "Killed Boss";
            }
            rss.description = item.quantity + " " + item.achievement.title;
            callback(rss);
            break;

        default:
            console.log("Unhandled character item type: " + item.type);
            callback(rss);
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
    process_guild_query: function (region, realm, guild, responseObj) {
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
                    feedItems,
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

                feedItems = Math.min(js.news.length, max_feed_item);
                outstandingCalls = feedItems;

                feed = new RSS({
                    title: feedUtil.capitalize(guild) + ' on ' + feedUtil.capitalize(realm),
                    description: 'rss feed generated from blizzards json feed-api, version '+ version,
                    feed_url: 'http://' + options.host + options.path,
                    site_url: 'http://' + options.host + '/wow/guild/' + realm + '/' + guild + '/feed',
                    author: 'wowfeed@herokuapp.com'
                });

                // Loop over data and add to feed
                for (var i=0; i < feedItems; i++) {
                    var item = js.news[i];
                    armoryItem.processGuildItem(item, baseCharUrl, function (result, error) {

                        if (!error)
                            arr.push(result);

                        outstandingCalls -= 1;
                        if (outstandingCalls === 0) {
                            arr.sort(feedUtil.sortRSS);
                            feed.items = arr;
                            //Print the RSS feed out as response
                            responseObj.write(feed.xml());
                            responseObj.end();
                        }
                    });
                }
            }
        });

        html_parser = new htmlparser.Parser(handler);

        req = http.request(options, function (res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));
            var alldata = "";
            res.on('data', function (chunk) {
                alldata = alldata + chunk;
            });
            res.on('error', function (e) {
                console.log('problem with request: ' + e.message);
            });
            res.on('end', function () {
                console.log(alldata);
                html_parser.parseComplete(alldata);
            });
        });

        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });

        req.end();
    },

    process_char_query: function (region, realm, character, showSteps, responseObj) {
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
                    feedItems,
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

                feedItems = Math.min(js.feed.length, max_feed_item);
                outstandingCalls = feedItems;

                feed = new RSS({
                    title: feedUtil.capitalize(character) + ' on ' + feedUtil.capitalize(realm),
                    description: 'rss feed generated from blizzards json feed-api, version '+ version,
                    feed_url: 'http://' + options.host + options.path,
                    site_url: baseCharUrl + character + '/feed',
                    image_url: 'http://' + options.host + '/static-render/' + region + '/' + js.thumbnail,
                    author: 'wowfeed@herokuapp.com'
                });

                // Loop over data and add to feed
                for (var i=0; i < feedItems; i++) {
                    var item = js.feed[i];

                    if (showSteps !== "false" || item.type !== "CRITERIA") {

                        armoryItem.processCharacterItem(item, function (result, error) {

                            if (!error)
                                arr.push(result);

                            outstandingCalls -= 1;

                            if (outstandingCalls === 0) {
                                arr.sort(feedUtil.sortRSS);
                                feed.items = arr;
                                //Print the RSS feed out as response
                                responseObj.write(feed.xml());
                                responseObj.end();
                            }
                        });
                    } else {
                        outstandingCalls -= 1;
                    }
                }
            }
        });

        html_parser = new htmlparser.Parser(handler);

        req = http.request(options, function (res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));

            var alldata = "";
            res.on('data', function (chunk) {
                alldata = alldata + chunk;
            });
            res.on('error', function (e) {
                console.log('problem with request: ' + e.message);
            });
            res.on('end', function () {
                console.log(alldata);
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
                showSteps = url_parts.query.steps,
                guild = url_parts.query.guild;

            if (!region || !realm || !(character || guild)) {
                // Tell the client the search params were not correct
                response.writeHead(200, {'Content-Type': 'text/html'});
                response.write("wowfeed version " + version + "<br>");
                response.write("Invalid call, please specify region, realm as well as character or guild.<br>");
                response.end('Something like this: ' +
                    '<a href="https://wowfeed.herokuapp.com/?region=eu&realm=khazgoroth&character=grimstone" > ' +
                    'wowfeed.herokuapp.com/?region=eu&realm=khazgoroth&character=grimstone </a>');
            } else {
                // Tell the client that return value is of rss type
                response.writeHead(200, {'Content-Type': 'application/rss+xml'});

                armory = armory.defaults({
                    realm: realm,
                    region: region
                });

                if (character) {
                    app.process_char_query(region, realm, character, showSteps, response);
                } else if (guild) {
                    app.process_guild_query(region, realm, guild, response);
                }
            }
        }).listen(port);

        console.log('Server running at port: ' + port);
    }
};

app.initialize();