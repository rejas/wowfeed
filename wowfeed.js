"use strict";

var http        = require('http'),
    https       = require('https'),
    url         = require('url'),
    RSS         = require('rss'),
    utils       = require('./utils'),
    pjson       = require('./package.json'),

    version         = pjson.version,
    port            = process.env.PORT || 3000,
    key             = process.env.wowPublicKey || require('./secret.json').key,
    bnet            = require('battlenet-api')(key),

    qualityColor    = ['#d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000', '#e6cc80', '#e6cc80'];

var armoryItem = {

    styleItem: function (item) {
        return "style='color: " + qualityColor[item.quality] + "; text-decoration: none'";
    },

    generateItemLink: function (item) {
        return "<img src='http://media.blizzard.com/wow/icons/18/" + item.icon + ".jpg'/>" +
                "<a href='http://www.wowhead.com/item=" + item.id + "' " + this.styleItem(item) + ">" + item.name + "</a>";
    },

    generateAchievementLink: function (achievement) {
        return "<img src='http://media.blizzard.com/wow/icons/18/" + achievement.icon + ".jpg'/>" +
                "<a href='http://www.wowhead.com/achievement=" + achievement.id +
                "' style='color: #e1b105; text-decoration: none'>" + achievement.title + "</a>";
    },

    createRssItem: function (item) {
        return {
            categories: [item.type],
            date: item.timestamp,
            guid: item.timestamp
        };
    },

    processGuildItem: function (item, basecharurl, callback) {

        var rss = this.createRssItem(item);

        switch (item.type) {

        case ("playerAchievement"):
            rss.title = item.character + " earned the achievement '" + item.achievement.title + "'";
            rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a>" +
                " earned the achievement " + this.generateAchievementLink(item.achievement) +
                " for " + item.achievement.points + " points.";
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            callback(rss);
            break;

        case ("itemPurchase"):
            bnet.wow.item.item({origin: app.options.region, id: item.itemId}, function(err, body, res) {
                rss.title = item.character + " purchased '" + res.name + "'";
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a>" +
                    " purchased item " + armoryItem.generateItemLink(res);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                callback(rss, err);
            });
            break;

        case ("itemLoot"):
            bnet.wow.item.item({origin: app.options.region, id: item.itemId}, function(err, body, res) {
                rss.title = item.character + " looted '" + body.name + "'";
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character +
                    "</a> obtained item " + armoryItem.generateItemLink(body);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + body.icon + '.jpg', type: 'image/jpg'};
                callback(rss, err);
            });
            /*
            armory.item(item.itemId, function (err, res) {
                if (res.availableContexts && res.availableContexts[0] !== '') {
                    armory.item({ id: item.itemId, context: res.availableContexts[0] }, function (err2, res2) {
                        rss.title = item.character + " looted '" + res2.name + "'";
                        rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character +
                            "</a> obtained item " + armoryItem.generateItemLink(res2);
                        rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res2.icon + '.jpg', type: 'image/jpg'};
                        callback(rss, err2);
                    });
                } else {
                    rss.title = item.character + " looted '" + res.name + "'";
                    rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character +
                        "</a> obtained item " + armoryItem.generateItemLink(res);
                    rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + res.icon + '.jpg', type: 'image/jpg'};
                    callback(rss, err);
                }
            });
            */
            break;

        case ("itemCraft"):
            bnet.wow.item.item({origin: app.options.region, id: item.itemId}, function(err, body, res) {
                rss.title = item.character + " crafted '" + body.name + "'";
                rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character +
                    "</a> crafted item " + armoryItem.generateItemLink(body);
                rss.enclosure = {
                    url: 'http://media.blizzard.com/wow/icons/56/' + body.icon + '.jpg',
                    type: 'image/jpg'
                };
                callback(rss, err);
            });
            /*
            armory.item(item.itemId, function (err, res) {
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
            */
            break;

        case ("guildAchievement"):
            rss.title = "Guild earned '" + item.achievement.title + "'";
            rss.description = "The guild earned the achievement <strong>" + item.achievement.title + "</strong> for "
                + item.achievement.points + " points.";
            callback(rss);
            break;

        default:
            console.log("Unhandled guild item type: " + item.type);
            callback(rss);
            break;
        }
    },

    processCharacterItem: function (item, callback) {
        var rss = this.createRssItem(item);

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

            bnet.wow.item.item({origin: app.options.region, id: item.itemId}, function(err, body, res) {
                rss.title = "Looted '" + body.name + "'";
                rss.description = "Obtained " + armoryItem.generateItemLink(body);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + body.icon + '.jpg', type: 'image/jpg'};
                callback(rss, err);
            });
            /*
            armory.item(item.itemId, function (err, res) {
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
            */
            break;

        case ("BOSSKILL"):
            if (item.name !== "") {
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

var app = {
    process_guild_response: function (data, response) {
        var baseCharUrl = 'https://' + app.options.host + '/wow/character/' + app.options.realm + '/',
            feedItems,
            outstandingCalls,
            arr = [],
            feed,
            item,
            i;

        if (data.status) {
            app.handleStatus(data, response);
            return;
        }

        feedItems = Math.min(data.news.length, app.options.maxItems);
        outstandingCalls = feedItems;

        feed = new RSS({
            title: utils.capitalize(app.options.guild) + ' on ' + utils.capitalize(app.options.realm),
            description: 'rss feed generated from blizzards json feed-api, version ' + version,
            feed_url: 'http://' + app.options.host + app.options.path,
            site_url: 'http://' + app.options.host + '/wow/guild/' + app.options.realm + '/' + app.options.guild + '/feed',
            author: 'wowfeed@veeck.de'
        });

        // Loop over data and add to feed
        for (i = 0; i < feedItems; i++) {
            item = data.news[i];
            armoryItem.processGuildItem(item, baseCharUrl, function (result, error) {

                if (!error) {
                    arr.push(result);
                }

                outstandingCalls -= 1;
                if (outstandingCalls === 0) {
                    arr.sort(utils.sortDate);
                    feed.items = arr;
                    //Print the RSS feed out as response
                    response.write(feed.xml());
                    response.end();
                }
            });
        }
    },

    process_char_response: function (data, response, showSteps) {
        var feedItems,
            outstandingCalls,
            arr = [],
            feed,
            item,
            i;

        if (data.status) {
            app.handleStatus(data, response);
            return;
        }

        feedItems = Math.min(data.feed.length, app.options.maxItems);
        outstandingCalls = feedItems;

        feed = new RSS({
            title: utils.capitalize(app.options.character) + ' on ' + utils.capitalize(app.options.realm),
            description: 'rss feed generated from blizzards json feed-api, version ' + version,
            feed_url: 'http://' + app.options.host + app.options.path,
            image_url: 'http://' + app.options.host + '/static-render/' + app.options.region + '/' + data.thumbnail,
            site_url: 'https://' + app.options.host + '/wow/character/' + app.options.realm + '/' + data.name + '/feed',
            author: 'wowfeed@veeck.de'
        });

        // Loop over data and add to feed
        for (i = 0; i < feedItems; i++) {
            item = data.feed[i];

            if (showSteps || item.type !== "CRITERIA") {

                armoryItem.processCharacterItem(item, function (result, error) {

                    if (!error) {
                        arr.push(result);
                    }

                    outstandingCalls -= 1;

                    if (outstandingCalls === 0) {
                        arr.sort(utils.sortDate);
                        feed.items = arr;
                        //Print the RSS feed out as response
                        response.write(feed.xml());
                        response.end();
                    }
                });
            } else {
                outstandingCalls -= 1;
            }
        }
    },

    handleStatus: function (data, response) {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write(data.status + ": " + data.reason);
        response.end();
    },

    /**
     * Tell the client the search params were not correct
     * @param response
     */
    writeErrorPage: function (response) {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write("wowfeed version " + version + "<br>");
        response.write("Invalid call, please specify region, realm as well as character or guild.<br>");
        response.write('Something like this for characters: ' +
            '<a href="https://wowfeed.herokuapp.com/?region=eu&realm=Khaz%27Goroth&character=Grimstone" > ' +
            'wowfeed.herokuapp.com/?region=eu&realm=Khaz%27Goroth&character=Grimstone</a><br>');
        response.write('or for guilds: ' +
            '<a href="https://wowfeed.herokuapp.com/?region=eu&guild=Mokrah+Toktok&realm=Khaz%27Goroth" > ' +
            'wowfeed.herokuapp.com/?region=eu&guild=Mokrah+Toktok&realm=Khaz%27Goroth</a><br>');
        response.end();
    },

    /**
     *
     */
    initialize: function () {

        // Create and start the server to handle requests
        http.createServer(function (request, response) {

            // Extract the searchquery from the url
            var url_parts = url.parse(request.url, true);

            app.options = {
                character: url_parts.query.character,
                guild: url_parts.query.guild,
                realm: url_parts.query.realm,
                region: url_parts.query.region,
                showSteps: url_parts.query.steps !== "false",
                maxItems: url_parts.query.maxItems || 20
            };

            if (!app.options.region || !app.options.realm || !(app.options.character || app.options.guild)) {
                app.writeErrorPage(response);
                return;
            }

            // Tell the client that return value is of rss type
            response.writeHead(200, {'Content-Type': 'application/rss+xml'});

            app.options.host = app.options.region + '.battle.net';

            if (app.options.character) {
                app.options.path = encodeURI('/wow/character/' + app.options.realm + '/' + app.options.character + '?fields=feed');

                bnet.wow.character.feed({origin: app.options.region, realm: app.options.realm, name: app.options.character},
                    function(err, body, res) {
                        app.process_char_response(body, response, app.options.showSteps);
                    });
            } else if (app.options.guild) {
                app.options.path = encodeURI('/wow/guild/' + app.options.realm + '/' + app.options.guild + '?fields=news');

                bnet.wow.guild.news({origin: app.options.region, realm: app.options.realm, name: app.options.guild},
                    function(err, body, res) {
                        app.process_guild_response(body, response, app.options.showSteps);
                    });
            }
        }).listen(port);

        console.log('Server running at port: ' + port);
    }
};

app.initialize();
