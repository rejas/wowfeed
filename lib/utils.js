'use strict';

const version   = require('../package.json').version;
var RSS         = require('feed');

module.exports = {

    capitalize: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    createFeed: function() {
        return new RSS({
            description: 'rss feed generated from blizzards json feed-api, version ' + version,
            author:  {
                name:    'Michael Veeck',
                email:   'github@veeck.de',
                link:    'https://github.com/rejas/wowfeed/'
            }
        });
    },

    createRssItem: function(item) {
        return {
            categories: [item.type],
            date: new Date(item.timestamp)
        };
    },

    sortByDate: function(a, b) {
        return (b.date - a.date);
    }
};
