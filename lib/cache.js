var db = require('./db'),
    _ = require('underscore'),
    cache = {};

module.exports = {
    clearCache: function() {
        cache = {};
    },
    getYears: function(callback) {
        if (cache.years) {
            callback(null, cache.years);
        } else {
            db.view('crawler/list', {
                descending: true,
                startkey: [{}],
                endkey: []
            }, function(err, results) {
                var years;

                if (err) {
                    return callback(err);
                }

                years = _.reduce(results, function(memo, result) {
                    var year = result.key[0];

                    if (!~memo.indexOf(year)) {
                        memo.push(year);
                    }
                    return memo;
                }, []);

                cache.years = years;

                callback(null, years);
            });
        }
    },
    forYear: function(year, callback) {
        var startkey = [],
            endkey = [{}];

        if (cache[year]) {
            return callback(null, cache[year]);
        }

        if (year !== 'all') {
            startkey.unshift(Number(year));
            endkey.unshift(Number(year));
        }

        db.view('crawler/list', {
            include_docs: true,
            startkey: startkey,
            endkey: endkey
        }, function(err, results) {
            var stats;

            if (err) {
                return callback(err);
            }

            stats = _.reduce(results, function(memo, result) {
                var doc = result.doc,
                events = doc.info_request_events,
                title = result.key[1],
                status = doc.described_state,
                series,
                body;

                body = memo[title] = memo[title] || {
                    title: title,
                    waiting: 0,
                    successful: 0,
                    unsuccessful: 0,
                    not_held: 0,
                    total: 0
                };

                if (_.contains('waiting_response waiting_clarification internal_review'.split(' '), status)) {
                    body.waiting++;
                    body.total++;
                } else if (_.contains('rejected'.split(' '), status)) {
                    body.unsuccessful++;
                    body.total++;
                } else if (_.contains('partially_successful successful'.split(' '), status)) {
                    body.successful++;
                    body.total++;
                } else if (_.contains('not_held'.split(' '), status)) {
                    body.not_held++;
                    body.total++;
                } else if (_.contains('user_withdrawn'.split(' '), status)) {
                    // do nothing
                } else {
                    // do nothing
                }

                return memo;
            }, {});

            cache[year] = stats;

            callback(null, stats);
        });
    }
};