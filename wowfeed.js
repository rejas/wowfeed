'use strict';

const   version = require('./package.json').version,
        port    = process.env.PORT || 3000,
        key     = process.env.wowPublicKey || require('./secret.json').key;

var http        = require('http'),
    https       = require('https'),
    url         = require('url'),
    RSS         = require('rss'),
    bnet        = require('battlenet-api')(key),
    utils       = require('./lib/utils'),
    itemLink    = require('./lib/item');

var armoryItem = {

    processGuildItem: function (item, basecharurl) {
        var rss = utils.createRssItem(item);

        switch (item.type) {

        case ('playerAchievement'):
            rss.title = item.character + " earned the achievement '" + item.achievement.title + "'";
            rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a>" +
                " earned the achievement " + itemLink.generateAchievementLink(item.achievement) +
                " for " + item.achievement.points + " points.";
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            break;

        case ('itemPurchase'):
            return new Promise(
                function (resolve, reject) {
                    bnet.wow.item.item({origin: app.options.region, id: item.itemId}, function(err, body, res) {
                        if (err) {
                            reject(err);
                        }
                        rss.title = item.character + " purchased '" + body.name + "'";
                        rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character + "</a>" +
                            " purchased item " + itemLink.generateItemLink(body);
                        rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + body.icon + '.jpg', type: 'image/jpg'};
                        resolve(rss);
                    });
                });

        case ('itemLoot'):
            return new Promise(
                function (resolve, reject) {
                    bnet.wow.item.item({origin: app.options.region, id: item.itemId}, function(err, body, res) {
                        if (err) {
                            reject(err);
                        }
                        rss.title = item.character + " looted '" + body.name + "'";
                        rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character +
                            "</a> obtained item " + itemLink.generateItemLink(body);
                        rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + body.icon + '.jpg', type: 'image/jpg'};
                        resolve(rss);
                    });
                });

        case ('itemCraft'):
            return new Promise(
                function (resolve, reject) {
                    bnet.wow.item.item({origin: app.options.region, id: item.itemId}, function(err, body, res) {
                        if (err) {
                            reject(err);
                        }
                        rss.title = item.character + " crafted '" + body.name + "'";
                        rss.description = "<a href='" + basecharurl + item.character + "/'> " + item.character +
                            "</a> crafted item " + itemLink.generateItemLink(body);
                        rss.enclosure = {
                            url: 'http://media.blizzard.com/wow/icons/56/' + body.icon + '.jpg',
                            type: 'image/jpg'
                        };
                        resolve(rss);
                    });
                });

        case ('guildAchievement'):
            rss.title = "Guild earned '" + item.achievement.title + "'";
            rss.description = "The guild earned the achievement <strong>" + item.achievement.title + "</strong> for " +
                item.achievement.points + " points.";
            break;

        default:
            console.log("Unhandled guild item type: " + item.type);
            break;
        }
        return rss;
    },

    processCharacterItem: function (item) {
        var rss = utils.createRssItem(item);

        switch (item.type) {

        case ('ACHIEVEMENT'):
            rss.title = "Earned the achievement '" + item.achievement.title + "'";
            rss.description = "Earned the achievement " + itemLink.generateAchievementLink(item.achievement) + " for " +
                item.achievement.points + " points.";
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            break;

        case ('CRITERIA'):
            if (item.criteria.description !== '') {
                rss.title = "Completed step '" + item.criteria.description + "' of achievement '" + item.achievement.title + "'";
            } else {
                rss.title = "Completed step of achievement '" + item.achievement.title + "'";
            }
            rss.description = "Completed step <strong style='color: #fef092'>" + item.criteria.description +
                "</strong> of achievement " + itemLink.generateAchievementLink(item.achievement);
            rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
            break;

        case ('LOOT'):
            return new Promise(
                function (resolve, reject) {
                    bnet.wow.item.item({origin: app.options.region, id: item.itemId}, function(err, body, res) {
                        if (err) {
                            reject(err);
                        }
                        rss.title = "Looted '" + body.name + "'";
                        rss.description = "Obtained " + itemLink.generateItemLink(body);
                        rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + body.icon + '.jpg', type: 'image/jpg'};
                        resolve(rss);
                    });
                });

        case ('BOSSKILL'):
            if (item.name !== '') {
                rss.title = 'Killed ' + item.name;
            } else {
                rss.title = 'Killed Boss';
            }
            rss.description = item.quantity + " " + item.achievement.title;
            break;

        default:
            console.log('Unhandled character item type: ' + item.type);
            break;
        }

        return rss;
    }
};

var app = {
    process_guild_response: function (data, response) {
        var baseCharUrl = 'https://' + app.options.host + '/wow/character/' + app.options.realm + '/',
            feed = new RSS({
                title: utils.capitalize(app.options.guild) + ' on ' + utils.capitalize(app.options.realm),
                description: 'rss feed generated from blizzards json feed-api, version ' + version,
                feed_url: 'http://' + app.options.host + app.options.path,
                site_url: 'http://' + app.options.host + '/wow/guild/' + app.options.realm + '/' + app.options.guild + '/feed',
                author: 'wowfeed@veeck.de'
            }),
            allP = [];

        if (data.status) {
            app.handleStatus(data, response);
            return;
        }

        data.news = data.news.slice(0, Math.min(data.news.length, app.options.maxItems));
        data.news.forEach(function (item) {
            var p = armoryItem.processGuildItem(item, baseCharUrl);
            if (p instanceof Promise) {
                allP.push(p);
            } else {
                feed.items.push(p);
            }
        });

        Promise.all(allP)
            .then(function (data) {
                data.forEach(function (d) {
                    feed.items.push(d);
                });
                feed.items.sort(utils.sortByDate);
                response.write(feed.xml());
                response.end();
            })
            .catch(function (reason) {
                // Receives first rejection among the promises
            });
    },

    process_char_response: function (data, response, showSteps) {
        var feed = new RSS({
                title: utils.capitalize(app.options.character) + ' on ' + utils.capitalize(app.options.realm),
                description: 'rss feed generated from blizzards json feed-api, version ' + version,
                feed_url: 'http://' + app.options.host + app.options.path,
                image_url: 'http://' + app.options.host + '/static-render/' + app.options.region + '/' + data.thumbnail,
                site_url: 'https://' + app.options.host + '/wow/character/' + app.options.realm + '/' + data.name + '/feed',
                author: 'wowfeed@veeck.de'
            }),
            allP = [];

        if (data.status) {
            app.handleStatus(data, response);
            return;
        }

        data.feed = data.feed.slice(0, Math.min(data.feed.length, app.options.maxItems));
        data.feed.forEach(function (item) {
            if (showSteps || item.type !== 'CRITERIA') {
                var p = armoryItem.processCharacterItem(item);
                if (p instanceof Promise) {
                    allP.push(p);
                } else {
                    feed.items.push(p);
                }
            }
        });

        Promise.all(allP)
            .then(function (data) {
                data.forEach(function (d) {
                    feed.items.push(d);
                });
                feed.items.sort(utils.sortByDate);
                response.write(feed.xml());
                response.end();
            })
            .catch(function (reason) {
                // Receives first rejection among the promises
            });
    },

    handleStatus: function (data, response) {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write(data.status + ': ' + data.reason);
        response.end();
    },

    /**
     * Tell the client the search params were not correct
     * @param response
     */
    writeErrorPage: function (response) {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write('wowfeed version ' + version + '<br>');
        response.write('Invalid call, please specify region, realm as well as character or guild.<br>');
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
                showSteps: url_parts.query.steps !== 'false',
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
