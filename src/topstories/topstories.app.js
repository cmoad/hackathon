'use strict';

// ** Constants
const GOOGLE_TOPICS = {
    "baseUrl": "https://news.google.com",
    "uri": "/news",
    "topics_id": "nav-topic-list"
};

// ** Libraries
const _ = require('underscore');
const async = require('async');
const request = require('request');
const cheerio = require('cheerio');
const errors = require('papyri').errors;
const logger = require('papyri').logger;

function getTopics(callback) {
    // ** Fetch the page contents
    request.get(GOOGLE_TOPICS, (err, response, html) => {
        if (err) return callback(err);

        // ** Ensure we have a valid response status code
        if (response.statusCode !== 200)
            return callback(errors('INVALID_STATUS_CODE', {statusCode: response.statusCode, body: html}));

        // ** Parse HTML
        const $ = cheerio.load(html);
        const topicsEl = $('#' + GOOGLE_TOPICS.topics_id);
        const topicsDiv = topicsEl.children('div');

        const topics = [];

        //topicsDiv.each(t => logger.info(t.toString()));
        for (let lcv = 0; lcv < topicsDiv.length; lcv++) {
            const div = $(topicsDiv[lcv]);
            const title = div.text();
            const path = $(div.find('a')).attr('href');

            topics.push({
                title: title,
                source: 'Google News',
                url: GOOGLE_TOPICS.baseUrl + path
            });
        }

        callback(null, topics);
    });
}

// ** Return a list of headlines for a specific topic
function getTopicHeadlines(topic, callback) {

    const url = topic.url;
    request.get(url, (err, response, html) => {
        if (err) return callback(err);

        // ** Ensure we have a valid response status code
        if (response.statusCode !== 200)
            return callback(errors('INVALID_STATUS_CODE', {statusCode: response.statusCode, body: html}));

        const $ = cheerio.load(html);

        const headlines = [];
        const articlesDivs = $('.esc-lead-article-title');
        for (let lcv = 0; lcv < articlesDivs.length; lcv++) {
            const div = $(articlesDivs[lcv]);
            const title = div.text();
            const url = $(div.find('a')).attr('href');

            headlines.push({
                topic: topic,
                title: title,
                url: url
            });
        }

        callback(null, headlines);
    });
}

function getHeadlines(callback) {
    getTopics((err, topics) => {
        if (err) return callback(err);

        // ** Fetch headlines for each topic
        async.map(topics, getTopicHeadlines, (err, results) => {
            if (err) return callback(err);

            callback(null, results);
        });
    });
}

module.exports.getTopics = getTopics;
module.exports.getHeadlines = getHeadlines;