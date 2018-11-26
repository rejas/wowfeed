const itemLink  = require('./item'),
    rssUtils     = require('./rss'),
    key         = process.env.wowPublicKey || require('../secret.json').key,
    blizzard    = require('blizzard.js').initialize({apikey: key}),
    app         = {

        capitalize: (string) => {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },

        createCharFeed: (data) => {
            let feed = rssUtils.createRssFeed(),
                allP = [],
                p;

            feed.options.title = `${app.capitalize(app.options.character)} on ${app.capitalize(app.options.realm)}`;
            feed.options.link = 'http://' + app.options.host + app.options.path;
            feed.options.image = `https://render-${app.options.region}.worldofwarcraft.com/character/${data.thumbnail}`;

            data.feed = data.feed.slice(0, Math.min(data.feed.length, app.options.maxItems));
            data.feed.forEach(item => {
                if (app.options.showSteps || item.type !== 'CRITERIA') {
                    p = app.createCharItem(item);
                    allP.push(p);
                }
            });

            return Promise.all(allP)
                .then(result => {
                    result.forEach(item => {
                        feed.addItem(item);
                    });
                    return feed;
                });
        },

        createGuildFeed: (data) => {
            let feed = rssUtils.createRssFeed(),
                baseCharUrl = `https://${app.options.host}/wow/character/${app.options.realm}/`,
                allP = [],
                p;

            feed.options.title = `${app.capitalize(app.options.guild)} on ${app.capitalize(app.options.realm)}`;
            feed.options.link = 'http://' + app.options.host + app.options.path;

            data.news = data.news.slice(0, Math.min(data.news.length, app.options.maxItems));
            data.news.forEach(item => {
                p = app.createGuildItem(item, baseCharUrl);
                allP.push(p);
            });

            return Promise.all(allP)
                .then(result => {
                    result.forEach(item => {
                        feed.addItem(item);
                    });
                    return feed;
                });
        },

        createCharItem: (item) => {
            let rss = rssUtils.createRssItem(item);

            switch (item.type) {

            case ('ACHIEVEMENT'):
                return new Promise(
                    (resolve) => {
                        let achievement = item.achievement;
                        if (achievement.points > 0) {
                            rss.title = `Earned the achievement '${achievement.title}'`;
                            rss.description = `Earned the achievement <strong>${itemLink.generateAchievementLink(achievement)}</strong> for ${achievement.points} points`;
                        } else {
                            rss.title = `Earned the Feat of Strength '${achievement.title}'`;
                            rss.description = `Earned the Feat of Strength <strong>${itemLink.generateAchievementLink(achievement)}</strong>`;
                        }
                        if (achievement.rewardItems) achievement.rewardItems.forEach(item => {
                            rss.description += `. Reward: <strong>${itemLink.generateItemLink(item)}</strong>`;
                        });
                        rss.image = rssUtils.createRssImage(item.achievement.icon);
                        resolve(rss);
                    });

            case ('BOSSKILL'):
                return new Promise(
                    (resolve) => {
                        rss.title = `Killed ${item.name ? item.name : 'Boss'}`;
                        rss.description = `${item.quantity} ${item.achievement.title}`;
                        resolve(rss);
                    });

            case ('CRITERIA'):
                return new Promise(
                    (resolve) => {
                        rss.title = `Completed step of achievement '${item.achievement.title}'`;
                        rss.description = `Completed step <strong>${item.criteria.description}</strong> of achievement ${itemLink.generateAchievementLink(item.achievement)}`;
                        rss.image = rssUtils.createRssImage(item.achievement.icon);
                        resolve(rss);
                    });

            case ('LOOT'):
                return blizzard.wow.item({origin: app.options.region, id: item.itemId})
                    .then(response => {
                        rss.title = `Looted ${response.data.name}`;
                        rss.description = `Obtained <strong>${itemLink.generateItemLink(response.data)}</strong>`;
                        rss.image = rssUtils.createRssImage(response.data.icon);
                        return rss;
                    });

            default:
                console.log(`Unhandled character item type: ${item.type}`);
                break;
            }

            return rss;
        },

        createGuildItem: (item, basecharurl) => {
            let rss = rssUtils.createRssItem(item),
                charUrl = basecharurl + item.character;

            switch (item.type) {

            case ('guildAchievement'):
                rss.title = `Guild earned ${item.achievement.title}`;
                rss.description = `The guild earned the achievement <strong>${item.achievement.title}</strong> for ${item.achievement.points} points`;
                break;

            case ('itemCraft'):
                return blizzard.wow.item({origin: app.options.region, id: item.itemId})
                    .then(response => {
                        rss.title = `${item.character} crafted ${response.data.name}`;
                        rss.description = `<a href='${charUrl}'>${item.character}</a> crafted item ${itemLink.generateItemLink(response.data)}`;
                        rss.image = rssUtils.createRssImage(response.data.icon);
                        return rss;
                    });

            case ('itemLoot'):
                return blizzard.wow.item({origin: app.options.region, id: item.itemId})
                    .then(response => {
                        rss.title = `${item.character} looted ${response.data.name}`;
                        rss.description = `<a href='${charUrl}'>${item.character}</a> obtained item ${itemLink.generateItemLink(response.data)}`;
                        rss.image = rssUtils.createRssImage(response.data.icon);
                        return rss;
                    });

            case ('itemPurchase'):
                return blizzard.wow.item({origin: app.options.region, id: item.itemId})
                    .then(response => {
                        rss.title = `${item.character} purchased ${response.data.name}`;
                        rss.description = `<a href='${charUrl}'>${item.character}</a> purchased item ${itemLink.generateItemLink(response.data)}`;
                        rss.image = rssUtils.createRssImage(response.data.icon);
                        return rss;
                    });

            case ('playerAchievement'):
                return new Promise(
                    (resolve) => {
                        rss.title = `${item.character} earned the achievement ${item.achievement.title}`;
                        rss.description = `<a href='${charUrl}'>${item.character}</a> earned the achievement ${itemLink.generateAchievementLink(item.achievement)} for ${item.achievement.points} points.`;
                        rss.image = rssUtils.createRssImage(item.achievement.icon);
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

    createFeed: (options) => {
        app.options = options;
        app.options.host = options.region + '.battle.net';

        if (options.character) {
            app.options.path = encodeURI('/wow/character/' + options.realm + '/' + options.character);

            return blizzard.wow.character(['feed'], {
                origin: options.region,
                realm: options.realm,
                name: options.character
            })
                .then(response => {
                    return app.createCharFeed(response.data);
                });
        } else if (options.guild) {
            app.options.path = encodeURI('/wow/guild/' + options.realm + '/' + options.guild.replace(' ', '_'));

            return blizzard.wow.guild(['news'], {
                origin: options.region,
                realm: options.realm,
                name: options.guild
            })
                .then(response => {
                    return app.createGuildFeed(response.data);
                });
        }
    }
};
