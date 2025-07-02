
// js/events.js

function setupEventListeners() {
    // 기존 이벤트 리스너 제거 후 재등록
    const randomBtn = document.getElementById('randomBtn');
    const teamEditBtn = document.getElementById('teamEditBtn');
    const slotMachineBtn = document.getElementById('slotMachineBtn');
    
    // 기존 이벤트 리스너 제거
    if (randomBtn) {
        randomBtn.replaceWith(randomBtn.cloneNode(true));
    }
    if (teamEditBtn) {
        teamEditBtn.replaceWith(teamEditBtn.cloneNode(true));
    }
    if (slotMachineBtn) {
        slotMachineBtn.replaceWith(slotMachineBtn.cloneNode(true));
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.currentPosition = e.target.dataset.position;
            highlightActivePositions(state.currentPosition);
            renderPlayers();
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('empty-slot')) {
            assignPlayer(e.target);
        }
        else if (e.target.classList.contains('player-img') && !e.target.classList.contains('fixed')) {
            const slot = e.target.closest('.position-slot');
            const teamElement = slot.closest('.team');
            const teamId = parseInt(teamElement.dataset.team);
            
            let position = null;
            const positionClasses = ['top', 'mid', 'bot', 'sup'];
            for (const pos of positionClasses) {
                if (slot.classList.contains(pos)) {
                    position = pos;
                    break;
                }
            }
            
            if (position) {
                const player = state.teams[teamId].players[position];
                if (player) {
                    removePlayer(slot, player);
                }
            }
        }
    });

    document.addEventListener('dragover', (e) => {
        if (e.target.classList.contains('empty-slot') || 
            e.target.closest('.position-slot')?.querySelector('.empty-slot')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetSlot = e.target.classList.contains('empty-slot') ? 
            e.target : e.target.closest('.position-slot')?.querySelector('.empty-slot');
        
        if (targetSlot) {
            try {
                const jsonData = e.dataTransfer.getData('application/json');
                if (jsonData) {
                    const playerData = JSON.parse(jsonData);
                    assignPlayerByDrop(targetSlot, playerData);
                }
            } catch (error) {
                console.log('드롭 데이터 파싱 실패:', error);
            }
        }
    });

    // 리셋 버튼 이벤트 리스너 (중복 방지)
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn && !resetBtn.hasAttribute('data-listener-added')) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetAllTeams();
        });
        resetBtn.setAttribute('data-listener-added', 'true');
    }

    // 버튼 이벤트 리스너 등록 (강제 재연결)
    const teamEditBtnNew = document.getElementById('teamEditBtn');
    if (teamEditBtnNew) {
        // 기존 속성 제거하고 새로운 이벤트 리스너 추가
        teamEditBtnNew.removeAttribute('data-listener-added');
        if (!teamEditBtnNew.hasAttribute('data-listener-added')) {
            teamEditBtnNew.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleEditMode();
            });
            teamEditBtnNew.setAttribute('data-listener-added', 'true');
            console.log('팀위치 수정 버튼 이벤트 리스너 재연결됨');
        }
    }

    const randomBtnNew = document.getElementById('randomBtn');
    if (randomBtnNew) {
        // 기존 속성 제거하고 새로운 이벤트 리스너 추가
        randomBtnNew.removeAttribute('data-listener-added');
        if (!randomBtnNew.hasAttribute('data-listener-added')) {
            randomBtnNew.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                randomizeTeamPositions();
            });
            randomBtnNew.setAttribute('data-listener-added', 'true');
            console.log('팀 순서 랜덤 버튼 이벤트 리스너 재연결됨');
        }
    }

    const slotMachineBtnNew = document.getElementById('slotMachineBtn');
    if (slotMachineBtnNew) {
        slotMachineBtnNew.addEventListener('click', () => {
            startSlotMachine();
        });
    }

    document.querySelectorAll('.my-team-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const teamId = parseInt(btn.dataset.team);
            selectMyTeam(teamId);
        });
    });

    setupTeamPointsEvents();
    setupPositionScoreEvents();

    window.addEventListener('resize', () => {
        adjustSlotMachinePositionOnResize();
    });
}

function setupTeamPointsEvents() {
    document.querySelectorAll('.points-input').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value < 0) e.target.value = 0;
            if (value > 1000) e.target.value = 1000;
            saveToStorage();
        });
        
        newInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value < 0) e.target.value = 0;
            if (value > 1000) e.target.value = 1000;
        });
        
        newInput.addEventListener('blur', (e) => {
            saveToStorage();
        });
    });
}

function setupPositionScoreEvents() {
    document.querySelectorAll('.position-slot:not(.jgl) .position-score').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('input', (e) => {
            handlePositionScoreChange(e);
        });

        newInput.addEventListener('focus', (e) => {
            e.target.dataset.oldValue = e.target.value || '0';
        });
    });
}

function handlePositionScoreChange(event) {
    const input = event.target;
    let newScore = parseInt(input.value) || 0;
    const oldScore = parseInt(input.dataset.oldValue) || 0;
    
    if (newScore < 0) {
        newScore = 0;
        input.value = 0;
    }
    if (newScore > 1000) {
        newScore = 1000;
        input.value = 1000;
    }

    const teamElement = input.closest('.team');
    if (!teamElement) {
        console.error('팀 요소를 찾을 수 없습니다.');
        return;
    }
    
    const pointsInput = teamElement.querySelector('.points-input');
    if (!pointsInput) {
        console.error('포인트 입력란을 찾을 수 없습니다.');
        return;
    }
    
    const currentPoints = parseInt(pointsInput.value) || 0;
    const scoreDifference = newScore - oldScore;
    const newPoints = Math.max(0, currentPoints - scoreDifference);
    
    pointsInput.value = newPoints;
    input.dataset.oldValue = newScore;
    
    setTimeout(() => saveToStorage(), 100);
    
    console.log(`[팀 ${teamElement.dataset.team}] 포지션 점수 변경: ${oldScore} → ${newScore}, 팀 포인트: ${currentPoints} → ${newPoints} (차감: ${scoreDifference})`);
}

function reattachEventListeners() {
    setupEventListeners();
    setupDragAndDrop();
    
    // 이벤트 리스너 재연결 후 팀위치 수정 버튼 상태 확인
    // 내 팀 모드가 아니라면 버튼이 확실히 보이도록 설정
    if (state.selectedTeam === null) {
        const teamEditBtn = document.getElementById('teamEditBtn');
        if (teamEditBtn) {
            teamEditBtn.style.display = 'inline-block';
            teamEditBtn.style.visibility = 'visible';
            teamEditBtn.disabled = false;
            console.log('이벤트 리스너 재연결: 팀위치 수정 버튼 표시 확인');
        }
    }
}
