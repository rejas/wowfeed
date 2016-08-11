'use strict';

const   version = require('../package.json').version,
        key     = process.env.wowPublicKey || require('../secret.json').key;

var itemLink    = require('./item'),
    utils       = require('./utils') ,
    RSS         = require('rss'),
    bnet        = require('battlenet-api')(key);

var app = {

    createCharFeed: function (data, success, error) {
        var feed = new RSS({
                title: utils.capitalize(app.options.character) + ' on ' + utils.capitalize(app.options.realm),
                description: 'rss feed generated from blizzards json feed-api, version ' + version,
                feed_url: 'http://' + app.options.host + app.options.path,
                image_url: 'http://' + app.options.host + '/static-render/' + app.options.region + '/' + data.thumbnail,
                site_url: 'https://' + app.options.host + '/wow/character/' + app.options.realm + '/' + data.name + '/feed',
                author: 'wowfeed@veeck.de'
            }),
            allP = [];

        data.feed = data.feed.slice(0, Math.min(data.feed.length, app.options.maxItems));
        data.feed.forEach(function (item) {
            if (app.options.showSteps || item.type !== 'CRITERIA') {
                var p = app.createCharItem(item);
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
                success(feed);
            })
            .catch(function (reason) {
                error(reason);
            });
    },

    createGuildFeed: function (data, success, error) {
        var baseCharUrl = 'https://' + app.options.host + '/wow/character/' + app.options.realm + '/',
            feed = new RSS({
                title: utils.capitalize(app.options.guild) + ' on ' + utils.capitalize(app.options.realm),
                description: 'rss feed generated from blizzards json feed-api, version ' + version,
                feed_url: 'http://' + app.options.host + app.options.path,
                site_url: 'http://' + app.options.host + '/wow/guild/' + app.options.realm + '/' + app.options.guild + '/feed',
                author: 'wowfeed@veeck.de'
            }),
            allP = [];

        data.news = data.news.slice(0, Math.min(data.news.length, app.options.maxItems));
        data.news.forEach(function (item) {
            var p = app.createGuildItem(item, baseCharUrl);
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
                success(feed);
            })
            .catch(function (reason) {
                error(reason);
            });
    },

    createCharItem: function (item) {
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
    },

    createGuildItem: function (item, basecharurl) {
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
    }
};

module.exports = {

    createFeed: function (options, response, success, error) {

        app.options = options;
        app.options.host = options.region + '.battle.net';

        if (options.character) {
            app.options.path = encodeURI('/wow/character/' + options.realm + '/' + options.character + '?fields=feed');

            bnet.wow.character.feed({
                    origin: options.region,
                    realm: options.realm,
                    name: options.character
                },
                function (err, body, res) {
                    if (body.status) {
                        error(body);
                        return;
                    }
                    app.createCharFeed(body, success, error);
                });
        } else if (options.guild) {
            app.options.path = encodeURI('/wow/guild/' + options.realm + '/' + options.guild + '?fields=news');

            bnet.wow.guild.news({
                    origin: options.region,
                    realm: options.realm,
                    name: options.guild
                },
                function (err, body, res) {
                    if (body.status) {
                        error(body);
                        return;
                    }
                    app.createGuildFeed(body, success, error);
                });
        }
    }
};
