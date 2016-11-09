'use strict';

const itemLink  = require('./item'),
    utils       = require('./utils'),
    version     = require('../package.json').version,
    key         = process.env.wowPublicKey || require('../secret.json').key,
    blizzard    = require('blizzard.js').initialize({apikey: key}),
    app         = {

    createCharFeed: function(data, callSuccess, callError) {
        var feed = utils.createRssFeed(version),
            allP = [],
            p;

        feed.title = utils.capitalize(app.options.character) + ' on ' + utils.capitalize(app.options.realm);
        feed.feed_url = 'http://' + app.options.host + app.options.path;
        feed.image_url = 'http://' + app.options.host + '/static-render/' + app.options.region + '/' + data.thumbnail;
        feed.site_url = 'https://' + app.options.host + '/wow/character/' + app.options.realm + '/' + data.name + '/feed';

        data.feed = data.feed.slice(0, Math.min(data.feed.length, app.options.maxItems));
        data.feed.forEach(function(item) {
            if (app.options.showSteps || item.type !== 'CRITERIA') {
                p = app.createCharItem(item);

                if (p instanceof Promise) {
                    allP.push(p);
                } else {
                    feed.items.push(p);
                }
            }
        });

        Promise.all(allP)
            .then(function(result) {
                result.forEach(function(item) {
                    feed.items.push(item);
                });
                feed.items.sort(utils.sortByDate);
                callSuccess(feed);
            })
            .catch(function(reason) {
                callError(reason);
            });
    },

    createGuildFeed: function(data, callSuccess, callError) {
        var feed = utils.createRssFeed(version),
            baseCharUrl = 'https://' + app.options.host + '/wow/character/' + app.options.realm + '/',
            allP = [],
            p;

        feed.title = utils.capitalize(app.options.guild) + ' on ' + utils.capitalize(app.options.realm);
        feed.feed_url = 'http://' + app.options.host + app.options.path;
        feed.site_url = 'http://' + app.options.host + '/wow/guild/' + app.options.realm + '/' + app.options.guild + '/feed';

        data.news = data.news.slice(0, Math.min(data.news.length, app.options.maxItems));
        data.news.forEach(function(item) {
            p = app.createGuildItem(item, baseCharUrl);

            if (p instanceof Promise) {
                allP.push(p);
            } else {
                feed.items.push(p);
            }
        });

        Promise.all(allP)
            .then(function(result) {
                result.forEach(function(item) {
                    feed.items.push(item);
                });
                feed.items.sort(utils.sortByDate);
                callSuccess(feed);
            })
            .catch(function(reason) {
                callError(reason);
            });
    },

    createCharItem: function(item) {
        var rss = utils.createRssItem(item);

        switch (item.type) {

            case ('ACHIEVEMENT'):
                rss.title = "Earned the achievement '" + item.achievement.title + "'";
                rss.description = 'Earned the achievement ' + itemLink.generateAchievementLink(item.achievement) + ' for ' +
                    item.achievement.points + ' points.';
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
                break;

            case ('CRITERIA'):
                if (item.criteria.description !== '') {
                    rss.title = "Completed step '" + item.criteria.description + "' of achievement '" + item.achievement.title + "'";
                } else {
                    rss.title = "Completed step of achievement '" + item.achievement.title + "'";
                }
                rss.description = "Completed step <strong style='color: #fef092'>" + item.criteria.description +
                    '</strong> of achievement ' + itemLink.generateAchievementLink(item.achievement);
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
                break;

            case ('LOOT'):
                return new Promise(
                    function(resolve, reject) {
                        blizzard.wow.item({origin: app.options.region, id: item.itemId})
                            .then((response) => {
                                rss.title = "Looted '" + response.data.name + "'";
                                rss.description = 'Obtained ' + itemLink.generateItemLink(response.data);
                                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + response.data.icon + '.jpg', type: 'image/jpg'};
                                resolve(rss);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

            case ('BOSSKILL'):
                if (item.name !== '') {
                    rss.title = 'Killed ' + item.name;
                } else {
                    rss.title = 'Killed Boss';
                }
                rss.description = item.quantity + ' ' + item.achievement.title;
                break;

            default:
                console.log('Unhandled character item type: ' + item.type);
                break;
        }

        return rss;
    },

    createGuildItem: function(item, basecharurl) {
        var rss = utils.createRssItem(item);

        switch (item.type) {

            case ('playerAchievement'):
                rss.title = item.character + " earned the achievement '" + item.achievement.title + "'";
                rss.description = "<a href='" + basecharurl + item.character + "/'>" + item.character + '</a>' +
                    ' earned the achievement ' + itemLink.generateAchievementLink(item.achievement) +
                    ' for ' + item.achievement.points + ' points.';
                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + item.achievement.icon + '.jpg', type: 'image/jpg'};
                break;

            case ('itemPurchase'):
                return new Promise(
                    function(resolve, reject) {
                        blizzard.wow.item({origin: app.options.region, id: item.itemId})
                            .then((response) => {
                                rss.title = item.character + " purchased '" + response.data.name + "'";
                                rss.description = "<a href='" + basecharurl + item.character + "/'>" + item.character + '</a>' +
                                    ' purchased item ' + itemLink.generateItemLink(response.data);
                                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + response.data.icon + '.jpg', type: 'image/jpg'};
                                resolve(rss);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

            case ('itemLoot'):
                return new Promise(
                    function(resolve, reject) {
                        blizzard.wow.item({origin: app.options.region, id: item.itemId})
                            .then((response) => {
                                rss.title = item.character + " looted '" + response.data.name + "'";
                                rss.description = "<a href='" + basecharurl + item.character + "/'>" + item.character +
                                    '</a> obtained item ' + itemLink.generateItemLink(response.data);
                                rss.enclosure = {url: 'http://media.blizzard.com/wow/icons/56/' + response.data.icon + '.jpg', type: 'image/jpg'};
                                resolve(rss);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

            case ('itemCraft'):
                return new Promise(
                    function(resolve, reject) {
                        blizzard.wow.item({origin: app.options.region, id: item.itemId})
                            .then((response) => {
                                rss.title = item.character + " crafted '" + response.data.name + "'";
                                rss.description = "<a href='" + basecharurl + item.character + "/'>" + item.character +
                                    '</a> crafted item ' + itemLink.generateItemLink(response.data);
                                rss.enclosure = {
                                    url: 'http://media.blizzard.com/wow/icons/56/' + response.data.icon + '.jpg',
                                    type: 'image/jpg'
                                };
                                resolve(rss);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

            case ('guildAchievement'):
                rss.title = "Guild earned '" + item.achievement.title + "'";
                rss.description = 'The guild earned the achievement <strong>' + item.achievement.title + '</strong> for ' +
                    item.achievement.points + ' points.';
                break;

            default:
                console.log('Unhandled guild item type: ' + item.type);
                break;
        }
        return rss;
    }
};

module.exports = {

    createFeed: function(options, callSuccess, callError) {
        app.options = options;
        app.options.host = options.region + '.battle.net';

        if (options.character) {
            app.options.path = encodeURI('/wow/character/' + options.realm + '/' + options.character + '?fields=feed');

            blizzard.wow.character(['feed'], {
                origin: options.region,
                realm: options.realm,
                name: options.character})
                .then((response) => {
                    app.createCharFeed(response.data, callSuccess, callError);
                })
                .catch((error) => {
                    callError(error);
                });
        } else if (options.guild) {
            app.options.path = encodeURI('/wow/guild/' + options.realm + '/' + options.guild + '?fields=news');

            blizzard.wow.guild(['news'], {
                origin: options.region,
                realm: options.realm,
                name: options.guild
            })
                .then((response) => {
                    app.createGuildFeed(response.data, callSuccess, callError);
                })
                .catch((error) => {
                    callError(error);
                });
        }
    }
};
