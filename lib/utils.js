const Feed      = require('feed'),
    url         = require('./urls'),
    version     = require('../package.json').version;

module.exports = {

    capitalize: (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    createRssFeed: () => {
        return new Feed({
            description: `rss feed generated from blizzards json feed-api, version ${version}`,
            author:  {
                name:    'rejas',
                email:   'wowfeed@veeck.de',
                link:    'https://github.com/rejas/wowfeed/'
            }
        });
    },

    createRssItem: (item) => {
        return {
            categories: [item.type],
            date: new Date(item.timestamp)
        };
    },

    createRssEnclosure: (icon) => {
        return {
            url: url.iconLarge + icon + '.jpg',
            type: 'image/jpg'
        };
    },

    sortByDate: (a, b) => {
        return (b.date - a.date);
    }
};
