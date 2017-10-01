'use strict';

const RSS = require('rss');

module.exports = {

    capitalize: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    createRssFeed: function(version) {
        return new RSS({
            description: 'rss feed generated from blizzards json feed-api, version ' + version,
            author: 'wowfeed@veeck.de'
        });
    },

    createRssItem: function(item) {
        return {
            categories: [item.type],
            date: item.timestamp,
            guid: item.timestamp
        };
    },

    sortByDate: function(a, b) {
        return (b.date - a.date);
    }
};
