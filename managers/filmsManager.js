const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');

const filmsManager = {
  // Загружаем все фильмы
  load: () => fileManager.load(FILE_KEYS.FILMS, []),

  // Сохраняем все фильмы
  save: (films) => fileManager.save(FILE_KEYS.FILMS, films),

  // Добавляем новый фильм в массив
  add: function (film) {
    const films = this.load();
    films.push(film);
    this.save(films);
    return films;
  },

  // Получаем последние N фильмов
  getRecent: function (count = 2) {
    const films = this.load();
    return films.slice(-count);
  },

  // Получаем фильм по discussionNumber
  getByDiscussionNumber: function (number) {
    const films = this.load();
    return films.find(film => film.discussionNumber == number);
  },

  // Обновляем фильм
  update: function (discussionNumber, updates) {
    const films = this.load();
    const index = films.findIndex(film => film.discussionNumber == discussionNumber);

    if (index !== -1) {
      films[index] = { ...films[index], ...updates };
      this.save(films);
      return films[index];
    }

    return null;
  }
};

module.exports = filmsManager;