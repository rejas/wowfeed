const Feed      = require('feed').Feed,
    url         = require('./urls'),
    version     = require('../package.json').version;

module.exports = {

    createRssFeed: () => {
        return new Feed({
            description: `rss2 feed generated from blizzards json feed-api, version ${version}`,
            generator: 'wowfeed',
            author: {
                name: 'rejas',
                email: 'wowfeed@veeck.de',
                link: 'https://github.com/rejas/'
            }
        });
    },

    createRssItem: (item) => {
        return {
            categories: [item.type],
            date: new Date(item.timestamp)
        };
    },

    createRssImage: (icon) => {
        return `${url.iconLarge + icon}.jpg`;
    }
};
