
// js/slotMachine.js

let slotMachineDrag = {
    isDragging: false,
    offsetX: 0,
    offsetY: 0
};

function setupSlotMachineDrag() {
    const slotMachineSection = document.querySelector('.slot-machine-section');
    const slotMachineContainer = document.querySelector('.slot-machine-container');

    slotMachineContainer.addEventListener('mousedown', (e) => {
        // 버튼 클릭 시 드래그 시작 방지
        if (e.target.tagName === 'BUTTON') return;
        
        slotMachineDrag.isDragging = true;
        
        // 현재 위치를 계산하여 top/left로 변환
        const rect = slotMachineSection.getBoundingClientRect();
        slotMachineSection.style.bottom = 'auto';
        slotMachineSection.style.right = 'auto';
        slotMachineSection.style.top = `${rect.top}px`;
        slotMachineSection.style.left = `${rect.left}px`;
        
        // 마우스를 클릭한 지점을 기준으로 offset 계산
        slotMachineDrag.offsetX = e.clientX - rect.left;
        slotMachineDrag.offsetY = e.clientY - rect.top;
        
        slotMachineSection.classList.add('dragging');
        slotMachineSection.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (slotMachineDrag.isDragging) {
            let newX = e.clientX - slotMachineDrag.offsetX;
            let newY = e.clientY - slotMachineDrag.offsetY;

            // 화면 경계 내에서만 이동하도록 제한
            const maxX = window.innerWidth - slotMachineSection.offsetWidth;
            const maxY = window.innerHeight - slotMachineSection.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            slotMachineSection.style.left = `${newX}px`;
            slotMachineSection.style.top = `${newY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (slotMachineDrag.isDragging) {
            slotMachineDrag.isDragging = false;
            slotMachineSection.classList.remove('dragging');
            slotMachineSection.style.cursor = 'move';
        }
    });
}


function startSlotMachine() {
    const slotReel = document.getElementById('slot-reel');
    const slotResult = document.getElementById('slotResult');
    const slotBtn = document.getElementById('slotMachineBtn');
    
    console.log('슬롯머신 시작'); // 디버깅용
    
    // 버튼 비활성화
    slotBtn.disabled = true;
    slotBtn.textContent = '추첨 중...';
    
    // 모든 선수 목록 생성
    const allPlayers = [];
    for (const position in PLAYERS) {
        PLAYERS[position].forEach(playerFile => {
            const playerId = `${position}_${playerFile}`;
            if (!state.usedPlayers.has(playerId)) {
                allPlayers.push({
                    file: playerFile,
                    position: position,
                    id: playerId
                });
            }
        });
    }

    console.log('사용 가능한 선수 수:', allPlayers.length); // 디버깅용

    if (allPlayers.length === 0) {
        slotResult.innerHTML = '<p>남은 선수가 없습니다!</p>';
        slotBtn.disabled = false;
        slotBtn.textContent = '선수 추첨';
        return;
    }

    // 최종 결과 선수 선택
    const winner = allPlayers[Math.floor(Math.random() * allPlayers.length)];
    console.log('당첨자:', winner); // 디버깅용
    
    // 기존 슬롯 아이템들 모두 제거하고 애니메이션용 아이템들 생성
    slotReel.innerHTML = '';
    
    // 슬롯 릴 컨테이너 생성
    const reelContainer = document.createElement('div');
    reelContainer.style.position = 'relative';
    reelContainer.style.top = '0px';
    reelContainer.style.transition = 'none';
    reelContainer.style.width = '100%';
    
    const totalItems = 15; // 적당한 수의 아이템
    
    // 여러 랜덤 아이템들과 마지막에 당첨자 생성
    for (let i = 0; i < totalItems; i++) {
        const randomPlayer = i === totalItems - 1 ? winner : 
            allPlayers[Math.floor(Math.random() * allPlayers.length)];
        
        const item = document.createElement('div');
        item.className = 'slot-item';
        item.style.position = 'absolute';
        item.style.top = `${i * 110}px`; // 각 아이템의 절대 위치 (110px 간격)
        item.style.left = '0px';
        item.style.width = '100%';
        item.innerHTML = `
            <img src="${randomPlayer.position}/${randomPlayer.file}" alt="선수">
            <span>${getPlayerName(randomPlayer.file)}</span>
        `;
        reelContainer.appendChild(item);
    }
    
    slotReel.appendChild(reelContainer);

    // 초기 상태 설정
    reelContainer.style.transition = 'none';
    reelContainer.style.top = '0px';
    
    // 스피닝 클래스 추가 (CSS 블러 효과)
    slotReel.classList.add('spinning');
    
    // 결과 초기화
    slotResult.innerHTML = '<p>추첨 중...</p>';

    // 단계적 애니메이션 실행 (3단계로 단순화) - 시간 반으로 단축
    setTimeout(() => {
        // 1단계: 빠른 스핀 (1.25초) - 처음부터 빠르게 이동
        reelContainer.style.transition = 'top 1.25s ease-out';
        const fastSpinDistance = -(totalItems - 4) * 110; // 마지막 4개 전까지 빠르게
        reelContainer.style.top = `${fastSpinDistance}px`;
        console.log('1단계 빠른 스핀:', fastSpinDistance); // 디버깅용
    }, 50);

    setTimeout(() => {
        // 2단계: 감속 (0.75초)
        slotReel.classList.remove('spinning');
        slotReel.classList.add('slowing-1');
        reelContainer.style.transition = 'top 0.75s ease-out';
        const slowSpinDistance = -(totalItems - 2) * 110;
        reelContainer.style.top = `${slowSpinDistance}px`;
        console.log('2단계 감속:', slowSpinDistance); // 디버깅용
    }, 1350);

    setTimeout(() => {
        // 3단계: 최종 위치로 부드럽게 이동 (0.5초)
        slotReel.classList.remove('slowing-1');
        slotReel.classList.add('slowing-2');
        reelContainer.style.transition = 'top 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        const finalPosition = -(totalItems - 1) * 110; // 마지막 아이템(당첨자)이 보이도록
        reelContainer.style.top = `${finalPosition}px`;
        console.log('3단계 최종위치:', finalPosition); // 디버깅용
    }, 2150);

    // 최종 결과 표시 및 정리
    setTimeout(() => {
        slotReel.classList.remove('slowing-2');
        slotResult.innerHTML = `
            <p><strong>${getPlayerName(winner.file)}</strong></p>
            <p>(${POSITION_NAMES[winner.position]})</p>
            <p style="font-size: 0.9em; color: #666;">선수를 뽑았습니다!</p>
        `;
        
        // 추첨된 선수의 포지션으로 자동 전환
        if (typeof switchToPosition === 'function') {
            switchToPosition(winner.position);
        }
        
        // 버튼 재활성화
        slotBtn.disabled = false;
        slotBtn.textContent = '선수 추첨';
        
        console.log('슬롯머신 완료, 포지션 전환:', winner.position); // 디버깅용
    }, 2700);
}

function updateSlotMachinePosition(isMyTeamMode) {
    const slotMachine = document.querySelector('.slot-machine-section');
    const body = document.body;
    
    // 기존 드래그 상태 초기화
    slotMachine.classList.remove('dragging');
    
    // 내 팀 모드일 때 body에 클래스 추가하여 슬롯머신 크기 조정
    if (isMyTeamMode) {
        body.classList.add('my-team-active');
    } else {
        body.classList.remove('my-team-active');
    }
    
    // 위치 초기화 - 기본 bottom/right 위치로 복원
    slotMachine.style.top = '';
    slotMachine.style.left = '';
    slotMachine.style.bottom = '20px';
    slotMachine.style.right = '20px';
}

function adjustSlotMachinePositionOnResize() {
    const slotMachine = document.querySelector('.slot-machine-section');
    
    // 수동으로 이동된 상태인지 확인 (top/left가 설정되어 있음)
    if (slotMachine.style.top && slotMachine.style.left) {
        // 화면 밖으로 나가지 않도록 보정
        const rect = slotMachine.getBoundingClientRect();
        
        if (rect.right > window.innerWidth) {
            slotMachine.style.left = `${window.innerWidth - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            slotMachine.style.top = `${window.innerHeight - rect.height}px`;
        }
        if (rect.left < 0) {
            slotMachine.style.left = '0px';
        }
        if (rect.top < 0) {
            slotMachine.style.top = '0px';
        }
    }
}
