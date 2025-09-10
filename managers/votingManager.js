const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');

module.exports = {
  load: () => fileManager.load(FILE_KEYS.VOTING, {
    ratings: {},
    average: null,
    film: null,
    director: null,
    genre: null,
    country: null,
    year: null,
    poster: null,
    discussionNumber: null,
    date: null,
    description: null
  }),

  save: (data) => fileManager.save(FILE_KEYS.VOTING, data),

  calculateAverage: (ratings) => {
    const values = Object.values(ratings);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }
};