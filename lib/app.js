const itemLink  = require('./item'),
    utils       = require('./utils'),
    version     = require('../package.json').version,
    key         = process.env.wowPublicKey || require('../secret.json').key,
    blizzard    = require('blizzard.js').initialize({apikey: key}),
    app         = {

        createCharFeed: (data, callSuccess, callError) => {
            let feed = utils.createRssFeed(version),
                allP = [],
                p;

            feed.title = `${utils.capitalize(app.options.character)} on ${utils.capitalize(app.options.realm)}`;
            feed.feed_url = `https://${app.options.host}${app.options.path}?fields=feed`;
            feed.site_url = `https://${app.options.host}${app.options.path}/feed`;
            feed.image_url = `https://render-${app.options.region}.worldofwarcraft.com/character/${data.thumbnail}`;

            data.feed = data.feed.slice(0, Math.min(data.feed.length, app.options.maxItems));
            data.feed.forEach(item => {
                if (app.options.showSteps || item.type !== 'CRITERIA') {
                    p = app.createCharItem(item);
                    allP.push(p);
                }
            });

            Promise.all(allP)
                .then(result => {
                    result.forEach(item => {
                        feed.items.push(item);
                    });
                    feed.items.sort(utils.sortByDate);
                    callSuccess(feed);
                })
                .catch(reason => {
                    callError(reason);
                });
        },

        createGuildFeed: (data, callSuccess, callError) => {
            let feed = utils.createRssFeed(version),
                baseCharUrl = `https://${app.options.host}/wow/character/${app.options.realm}/`,
                allP = [],
                p;

            feed.title = `${utils.capitalize(app.options.guild)} on ${utils.capitalize(app.options.realm)}`;
            feed.feed_url = `https://${app.options.host}${app.options.path}?fields=news`;
            feed.site_url = `https://${app.options.host}${app.options.path}/feed`;

            data.news = data.news.slice(0, Math.min(data.news.length, app.options.maxItems));
            data.news.forEach(item => {
                p = app.createGuildItem(item, baseCharUrl);
                allP.push(p);
            });

            Promise.all(allP)
                .then(result => {
                    result.forEach(item => {
                        feed.items.push(item);
                    });
                    feed.items.sort(utils.sortByDate);
                    callSuccess(feed);
                })
                .catch(reason => {
                    callError(reason);
                });
        },

        createCharItem: (item) => {
            let rss = utils.createRssItem(item);

            switch (item.type) {

            case ('ACHIEVEMENT'):
                return new Promise(
                    (resolve, reject) => {
                        rss.title = `Earned the achievement ${item.achievement.title}`;
                        rss.description = `Earned the achievement <strong>${itemLink.generateAchievementLink(item.achievement)}</strong> for ${item.achievement.points} points`;
                        rss.enclosure = utils.createRssEnclosure(item.achievement.icon);
                        resolve(rss);
                    });

            case ('BOSSKILL'):
                return new Promise(
                    (resolve, reject) => {
                        rss.title = `Killed ${item.name ? item.name : 'Boss'}`;
                        rss.description = `${item.quantity} ${item.achievement.title}`;
                        resolve(rss);
                    });

            case ('CRITERIA'):
                return new Promise(
                    (resolve, reject) => {
                        rss.title = `Completed step of achievement ${item.achievement.title}`;
                        rss.description = `Completed step <strong>${item.criteria.description}</strong> of achievement ${itemLink.generateAchievementLink(item.achievement)}`;
                        rss.enclosure = utils.createRssEnclosure(item.achievement.icon);
                        resolve(rss);
                    });

            case ('LOOT'):
                return new Promise(
                    (resolve, reject) => {
                        blizzard.wow.item({origin: app.options.region, id: item.itemId})
                            .then((response) => {
                                rss.title = `Looted ${response.data.name}`;
                                rss.description = `Obtained <strong>${itemLink.generateItemLink(response.data)}</strong>`;
                                rss.enclosure = utils.createRssEnclosure(response.data.icon);
                                resolve(rss);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

            default:
                console.log(`Unhandled character item type: ${item.type}`);
                break;
            }

            return rss;
        },

        createGuildItem: (item, basecharurl) => {
            let rss = utils.createRssItem(item),
                charUrl = basecharurl + item.character;

            switch (item.type) {

            case ('guildAchievement'):
                rss.title = `Guild earned ${item.achievement.title}`;
                rss.description = `The guild earned the achievement <strong>${item.achievement.title}</strong> for ${item.achievement.points} points`;
                break;

            case ('itemCraft'):
                return new Promise(
                    (resolve, reject) => {
                        blizzard.wow.item({origin: app.options.region, id: item.itemId})
                            .then((response) => {
                                rss.title = `${item.character} crafted ${response.data.name}`;
                                rss.description = `<a href='${charUrl}'>${item.character}</a> crafted item ${itemLink.generateItemLink(response.data)}`;
                                rss.enclosure = utils.createRssEnclosure(response.data.icon);
                                resolve(rss);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

            case ('itemLoot'):
                return new Promise(
                    (resolve, reject) => {
                        blizzard.wow.item({origin: app.options.region, id: item.itemId})
                            .then((response) => {
                                rss.title = `${item.character} looted ${response.data.name}`;
                                rss.description = `<a href='${charUrl}'>${item.character}</a> obtained item ${itemLink.generateItemLink(response.data)}`;
                                rss.enclosure = utils.createRssEnclosure(response.data.icon);
                                resolve(rss);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

            case ('itemPurchase'):
                return new Promise(
                    (resolve, reject) => {
                        blizzard.wow.item({origin: app.options.region, id: item.itemId})
                            .then((response) => {
                                rss.title = `${item.character} purchased ${response.data.name}`;
                                rss.description = `<a href='${charUrl}'>${item.character}</a> purchased item ${itemLink.generateItemLink(response.data)}`;
                                rss.enclosure = utils.createRssEnclosure(response.data.icon);
                                resolve(rss);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    });

            case ('playerAchievement'):
                return new Promise(
                    (resolve, reject) => {
                        rss.title = `${item.character} earned the achievement ${item.achievement.title}`;
                        rss.description = `<a href='${charUrl}'>${item.character}</a> earned the achievement ${itemLink.generateAchievementLink(item.achievement)} for ${item.achievement.points} points.`;
                        rss.enclosure = utils.createRssEnclosure(item.achievement.icon);
                        resolve(rss);
                    });

            default:
                console.log(`Unhandled guild item type: ${item.type}`);
                break;
            }

            return rss;
        }
    };

module.exports = {

    createFeed: (options, callSuccess, callError) => {
        app.options = options;
        app.options.host = options.region + '.battle.net';

        if (options.character) {
            app.options.path = encodeURI('/wow/character/' + options.realm + '/' + options.character);

            blizzard.wow.character(['feed'], {
                origin: options.region,
                realm: options.realm,
                name: options.character
            })
                .then((response) => {
                    app.createCharFeed(response.data, callSuccess, callError);
                })
                .catch((error) => {
                    callError(error);
                });
        } else if (options.guild) {
            app.options.path = encodeURI('/wow/guild/' + options.realm + '/' + options.guild);

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
