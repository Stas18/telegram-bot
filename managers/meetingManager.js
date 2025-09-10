const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');
const DEFAULT_MEETING = require('../config/default-meeting.json');

const meetingManager = {
  load: () => fileManager.load(FILE_KEYS.NEXT_MEETING, DEFAULT_MEETING),
  save: (data) => fileManager.save(FILE_KEYS.NEXT_MEETING, data),
  getCurrent: function () {
    return this.load() || DEFAULT_MEETING;
  }
};

module.exports = meetingManager;