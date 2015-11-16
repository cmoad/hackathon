'use strict';

// ** Libraries
const errors = require('papyri').errors;

function getStories(callback) {
    callback(errors('NOT_IMPLEMENTED'));
}

module.exports.getStories = getStories;