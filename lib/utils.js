'use strict';

//
exports.capitalize = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

//
exports.sortData = function (a, b) {
    return (b.date - a.date);
};