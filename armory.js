"use strict";

var request = require('request'),
    url = require('url'),
    utils = require('./utils'),

    armory = {auth: {privateKey: null, publicKey: null}};

// Makes the request.
armory.get = function (path, options, callback) {
    options.headers = options.headers || {};
    options.jar = false;
    options.json = true;
    options.gzip = true;

    path = encodeURI('/wow' + path);

    if (options.locale) {
        options.query.locale = options.locale;
    }

    if (!options.region) {
        throw new Error('region must be provided');
    }

    if (process.env.http_proxy) {
        options.strictSSL = false;
    }

    if (process.env.wowPublicKey) {
        this.auth.publicKey = process.env.wowPublicKey;
    }

    if (this.auth.publicKey) {
        options.query.apikey = this.auth.publicKey;
    }

    options.uri = url.format({
        protocol: 'https:',
        hostname: options.region + '.api.battle.net',
        pathname: path,
        query: options.query
    });

    var cb;

    if (callback) {
        cb = function (err, res, body) {
            if (body && body.status === 'nok') {
                err = err || new Error(body.reason);
            } else if (res && res.statusCode && res.statusCode !== 200 && res.statusCode !== 304) {
                err = err || new Error(body);
            }

            callback.call(this, err, body, res);
        };
    }

    return request(options, cb);
};

// Retrieves an object describing an arena team.
armory.arena = function (options, callback) {
    var path = '/arena/' + [options.realm, options.size, options.id].join('/');

    return this.get(path, options, callback);
};

// Retrieves an array of arena ladder information.
armory.arenaLadder = function (options, callback) {
    var path = '/pvp/arena/' + options.battlegroup + '/' + options.id,
        cb;

    options.query = utils.pick(options, ['asc', 'page', 'size']);

    if (callback) {
        cb = function (err, body, res) {
            var data = utils.getKey(body, 'arenateam');
            callback.call(this, err, data, res);
        };
    }

    return this.get(path, options, cb);
};

// Retrieves object describing a battle pet.
armory.battlePetStats = function (options, callback) {
    var path = '/battlePet/stats/' + options.id;

    options.query = utils.pick(options, ['breedId', 'level', 'qualityId']);

    return this.get(path, options, callback);
};

// Retrieves an array of challenge mode leaderboard information.
armory.challengeRegion = function (options) {
    options.id = 'region';

    return this.challenge.apply(this, arguments);
};

// Returns wrapped module where every method has default options applied
armory.defaults = function (defaults) {
    defaults.id = defaults.id || defaults.name;
    delete defaults.name;

    return utils.wrap(this, function (fn, context) {
        return function (options, callback) {
            if (options.toString() === '[object Object]') {
                options = utils.merge(options, defaults);
                return fn.call(context, options, callback);
            }

            return utils.initParams(function (options, callback) {
                options = utils.merge(options, defaults);
                return fn.call(context, options, callback);

            }, context)(options, callback);
        };
    });
};

// Retrieves an array of rated battleground ladder information.
armory.rbgLadder = function (options, callback) {
    var path = '/pvp/ratedbg/ladder',
        cb;

    options.query = utils.pick(options, ['asc', 'page', 'size']);

    if (callback) {
        cb = function (err, body, res) {
            var data = utils.getKey(body, 'bgRecord');
            callback.call(this, err, data, res);
        };
    }

    return this.get(path, options, cb);
};

// Retrieves array of realm status information.
armory.realmStatus = function (options, callback) {
    var path = '/realm/status',
        cb;

    if (options.id) {
        options.query.realm = options.id;
    }

    if (callback) {
        cb = function (err, body, res) {
            var data = utils.getKey(body, 'realms');
            callback.call(this, err, data, res);
        };
    }

    return this.get(path, options, cb);
};

// Retrieves an object describing a character or guild.
['character', 'guild'].forEach(function (method) {
    armory[method] = function (options, callback) {
        if (options.fields) {
            options.query.fields = options.fields;
        }

        if (options.lastModified) {
            options.headers['If-Modified-Since'] = new Date(options.lastModified).toUTCString();
        }

        var path = '/' + [method, options.realm, options.id].join('/');
        return this.get(path, options, callback);
    };
});

// Definitions for generic functions.
require('./methods').forEach(function (definition) {
    definition.url = definition.url || definition.method;

    armory[definition.method] = function (options, callback) {
        var id = options.id ? '/' + options.id : '',
            path = '/' + definition.url + id,
            cb;

        if (options.context) {
            path += '/' + options.context;
        }

        if (definition.trailingSlash) {
            path += '/';
        }

        if (callback && definition.key) {
            cb = function (err, body, res) {
                var data = utils.getKey(body, definition.key);
                callback.call(this, err, data, res);
            };
        } else {
            cb = callback;
        }

        return this.get(path, options, cb);
    };
});

module.exports = utils.wrap(armory, utils.initParams);
