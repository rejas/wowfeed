'use strict';

module.exports = {

    capitalize: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    sortByDate: function (a, b) {
        return (b.date - a.date);
    }
};
