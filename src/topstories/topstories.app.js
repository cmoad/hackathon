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
const readability = require('node-readability');
const sanitizer = require('sanitizer');
const nlp = require('nlp_compromise');

/**
 * Return a list of the 'Top Stories' from the Google News page
 * @param callback
 */
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

/**
 * Return a list of headlines for a specific topic.
 * @param topic
 * @param callback
 */
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
                title: title,
                url: url
            });
        }

        callback(null, {
            "topic": topic,
            "headlines": headlines
        });
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

/**
 * Returns a list of Entities, and their count given a list of headlines for a topic
 * @param headlines
 * @param callback
 */
function getHeadlineEntities(headline, callback) {
    callback(null, 'NOT_IMPLEMENTED');
}

function getEntities(callback) {
    getTopics((err, topics) => {
        if (err) return callback(err);

        // ** Fetch headlines for each topic
        //async.map(topics, getTopicHeadlines, (err, results) => {
        //    if (err) return callback(err);
        //
        //    callback(null, results);
        //});


    });
}

function stripHTML(html) {
    var clean = sanitizer.sanitize(html, function (str) {
        return str;
    });

    // Remove all remaining HTML tags.
    clean = clean.replace(/<(?:.|\n)*?>/gm, "");

    // RegEx to remove needless newlines and whitespace.
    // See: http://stackoverflow.com/questions/816085/removing-redundant-line-breaks-with-regular-expressions
    clean = clean.replace(/(?:(?:\r\n|\r|\n)\s*){2,}/ig, "\n");

    // Return the final string, minus any leading/trailing whitespace.
    return clean.trim();
}

/**
 * Returns the content of a news article via URL.  Text is extracted using a method similar to readability.
 * @param url
 * @param callback
 */
function getArticleContent(url, callback) {
    readability(url, (err, article, response) => {
        if (err) return callback(err);

        // ** Ensure we have a valid response status code
        if (response.statusCode !== 200)
            return callback(errors('INVALID_STATUS_CODE', {statusCode: response.statusCode, url: url}));

        // const $ = cheerio.load(article);

        //logger.info(article);

        var obj = {
            "url": url,
            "title": article.title.trim(),
            "content": stripHTML(article.content || "")
        };

        callback(null, obj);
    });
}

function getUrlEntities(url, callback) {
    if (!url)
        url = "http://www.hollywoodreporter.com/news/box-office-spectre-stays-no-840163";

    getArticleContent(url, (err, response) => {
        if (err) return callback(err);

        const results = nlp.spot(response.content);
        const entities = _.pluck(results, 'text');

        callback(null, entities);
    });
}

module.exports.getTopics = getTopics;
module.exports.getHeadlines = getHeadlines;
module.exports.getEntities = getEntities;
module.exports.getUrlEntities = getUrlEntities;