const Feed = require('feed'),
    url = require('./urls');

const version   = require('../package.json').version;

module.exports = {

    capitalize: (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    createFeed: function() {
        return new Feed({
            description: 'rss feed generated from blizzards json feed-api, version ' + version,
            author:  {
                name:    'rejas',
                email:   'wowfeed@veeck.de',
                link:    'https://github.com/rejas/wowfeed/'
            }
        });
    },

    /*
    createRssFeed: (version) => {
        return new RSS({
            description: 'rss feed generated from blizzards json feed-api, version ' + version,
            author: 'wowfeed@veeck.de'
        });
    },
    */

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
