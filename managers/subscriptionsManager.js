const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');

/**
 * Менеджер для работы с подписками (subscriptions)
 * Обеспечивает загрузку и сохранение подписок с использованием Set для уникальности
 * 
 * @namespace subscriptionManager
 */
module.exports = {
  /**
   * Загружает подписки из файлового хранилища и возвращает как Set
   * Гарантирует уникальность элементов и преобразует массив в Set
   * 
   * @function
   * @returns {Set} Множество подписок (уникальные значения)
   * @example
   *
   */
  load: () => new Set(fileManager.load(FILE_KEYS.SUBSCRIPTIONS, [])),

  /**
 * Сохраняет подписки в файловое хранилище
 * Преобразует Set в массив для сериализации
 * 
 * @function
 * @param {Set} subscriptions - Множество подписок для сохранения
 * @returns {boolean} Результат операции сохранения
 * @example
 * 
 */
  save: (subscriptions) => fileManager.save(FILE_KEYS.SUBSCRIPTIONS, [...subscriptions])
};
