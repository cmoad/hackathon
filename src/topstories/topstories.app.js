'use strict';

// ** Constants
const GOOGLE = {
    "baseUrl": "https://news.google.com",
    "uri": "/news",
    "topics_id": "nav-topic-list"
};

// ** Libraries
const _ = require('underscore');
const request = require('request');
const cheerio = require('cheerio');
const errors = require('papyri').errors;
const logger = require('papyri').logger;

function getTopics(callback) {

    // ** Fetch the page contents
    request.get(GOOGLE, (err, response, html) => {
        if (err) return callback(err);

        // ** Ensure we have a valid response status code
        if (response.statusCode !== 200)
            return callback(errors('INVALID_STATUS_CODE', {statusCode: response.statusCode, body: html}));

        // ** Parse HTML
        const $ = cheerio.load(html);
        const topicsEl = $('#' + GOOGLE.topics_id);

        const topicsDiv = topicsEl.children('div');

        const topics = [];

        //topicsDiv.each(t => logger.info(t.toString()));
        for (let lcv=0; lcv<topicsDiv.length; lcv++) {
            const div = $(topicsDiv[lcv]);
            const title = div.text();
            const path = $(div.find('a')).attr('href');

            topics.push({
                title: title,
                source: 'Google News',
                url: GOOGLE.baseUrl + path
            });
        }

        callback(null, topics);
    });
}

module.exports.getTopics = getTopics;