// 디버깅용 간단한 슬롯머신 테스트
function testSlotMachine() {
    console.log('테스트 시작');
    console.log('PLAYERS:', PLAYERS);
    console.log('state:', state);
    
    const slotReel = document.getElementById('slot-reel');
    const slotResult = document.getElementById('slotResult');
    
    if (!slotReel) {
        console.error('slot-reel 요소를 찾을 수 없습니다!');
        return;
    }
    
    if (!slotResult) {
        console.error('slotResult 요소를 찾을 수 없습니다!');
        return;
    }
    
    console.log('요소들 정상 확인됨');
    
    // 간단한 테스트 아이템 생성
    slotReel.innerHTML = `
        <div class="slot-item" style="position: absolute; top: 0; left: 0; width: 100%;">
            <img src="top/던.gif" alt="선수">
            <span>테스트선수</span>
        </div>
    `;
    
    slotResult.innerHTML = '<p>테스트 완료!</p>';
    
    console.log('테스트 완료');
}

// 테스트 함수를 전역으로 등록
window.testSlotMachine = testSlotMachine;
