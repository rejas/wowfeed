'use strict';

module.exports = {

    capitalize: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    createRssItem: function (item) {
        return {
            categories: [item.type],
            date: item.timestamp,
            guid: item.timestamp
        };
    },

    sortByDate: function (a, b) {
        return (b.date - a.date);
    }
};
