const url = require('./urls');

const qualityColor = ['#d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000', '#e6cc80', '#00ccff'],
    achievementColor = '#e1b105';

function styleItem(item) {
    return 'style=\'color: ' + qualityColor[item.quality] + '; text-decoration: none\'';
}

function styleAchievement() {
    return 'style=\'color: ' + achievementColor + '; text-decoration: none\'';
}

module.exports = {

    generateItemLink: (item) => {
        return '<img src=\'' + url.iconSmall + item.icon + '.jpg\'/>' +
            '<a href=\'' + url.wowheadItem + item.id + '\' ' + styleItem(item) + '>' + item.name + '</a>';
    },

    generateAchievementLink: (achievement) => {
        return '<img src=\'' + url.iconSmall + achievement.icon + '.jpg\'/>' +
            '<a href=\'' + url.wowheadAchiv + achievement.id + '\' ' + styleAchievement() + '>' + achievement.title + '</a>';
    }
};
