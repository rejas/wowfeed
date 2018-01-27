const RSS = require('rss'),
    Url = require('./urls');

module.exports = {

    capitalize: (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    createRssFeed: (version) => {
        return new RSS({
            description: 'rss feed generated from blizzards json feed-api, version ' + version,
            author: 'wowfeed@veeck.de'
        });
    },

    createRssItem: (item) => {
        return {
            categories: [item.type],
            date: item.timestamp,
            guid: item.timestamp
        };
    },

    createRssEnclosure: (icon) => {
        return {
            url: Url.iconLarge + icon + '.jpg',
                type: 'image/jpg'
        };
    },

    sortByDate: (a, b) => {
        return (b.date - a.date);
    }
};
