
// js/config.js

const PLAYERS = {
    top: ['던.gif', '룩삼.gif', '맛수령.gif', '승우아빠.gif', '치킨쿤.gif', '푸린.gif'],
    mid: ['네클릿.gif', '노페.gif', '인간젤리.gif', '트롤야.gif', '피닉스박.gif', '헤징.gif'],
    bot: ['강퀴.gif', '눈꽃.gif', '따효니.gif', '러너.gif', '마소킴.gif', '플러리.gif'],
    sup: ['고수달.gif', '라콩.gif', '매드라이프.gif', '이희태.gif', '캡틴잭.gif', '크캣.gif']
};

const POSITION_NAMES = {
    top: '탑',
    mid: '미드',
    bot: '원딜',
    sup: '서포터'
};

function getPlayerName(filename) {
    return filename.replace('.gif', '');
}
