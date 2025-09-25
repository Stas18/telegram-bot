const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');
const DEFAULT_MEETING = require('../config/default-meeting.json');

/**
 * Менеджер для работы с данными о следующем собрании (встрече)
 * Обеспечивает загрузку, сохранение и получение текущих настроек собрания
 * 
 * @namespace meetingManager
 */
const meetingManager = {
  /**
   * Загружает данные о следующем собрании из файлового хранилища
   * Если файл не существует, возвращает собрание по умолчанию
   * 
   * @function
   * @returns {Object} Данные о собрании из хранилища или значения по умолчанию
   * @example
   * const meetingData = meetingManager.load();
   */
  load: () => fileManager.load(FILE_KEYS.NEXT_MEETING, DEFAULT_MEETING),

  /**
   * Сохраняет данные о следующем собрании в файловое хранилище
   * 
   * @function
   * @param {Object} data - Данные собрания для сохранения
   * @returns {boolean} Результат операции сохранения (true - успешно, false - ошибка)
   * @example
   * meetingManager.save({
   *   date: '2024-01-15',
   *   topic: 'Планирование спринта'
   * });
   */
  save: (data) => fileManager.save(FILE_KEYS.NEXT_MEETING, data),

  /**
   * Возвращает текущие данные о собрании
   * Если в хранилище нет данных, возвращает собрание по умолчанию
   * 
   * @function
   * @returns {Object} Текущие данные о собрании
   * @example
   * const currentMeeting = meetingManager.getCurrent();
   * console.log(currentMeeting.date); // Дата текущего собрания
   */
  getCurrent: function () {
    return this.load() || DEFAULT_MEETING;
  }
};

module.exports = meetingManager;
