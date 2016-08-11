'use strict';

const qualityColor = ['#d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000', '#e6cc80', '#00ccff'];

function styleItem(item) {
    return "style='color: " + qualityColor[item.quality] + "; text-decoration: none'";
}

module.exports = {

    generateItemLink: function(item) {
        return "<img src='http://media.blizzard.com/wow/icons/18/" + item.icon + ".jpg'/>" +
            "<a href='http://www.wowhead.com/item=" + item.id + "' " + styleItem(item) + '>' + item.name + '</a>';
    },

    generateAchievementLink: function(achievement) {
        return "<img src='http://media.blizzard.com/wow/icons/18/" + achievement.icon + ".jpg'/>" +
            "<a href='http://www.wowhead.com/achievement=" + achievement.id +
            "' style='color: #e1b105; text-decoration: none'>" + achievement.title + '</a>';
    }
};
