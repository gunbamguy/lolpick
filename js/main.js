// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const playersPanel = document.querySelector('.players-panel');
    state.originalPlayersPanelParent = playersPanel ? playersPanel.parentNode : null;
    
    // 초기 UI 상태 설정
    initializeUI();
    
    loadFromStorage();
    
    setupEventListeners();
    setupDragAndDrop();
    setupSlotMachineDrag();
    
    highlightActivePositions(state.currentPosition);
    renderPlayers();
    
    initializeScoreInputs();
    updateSlotMachinePosition(false);
    setupLayoutAdjuster();
    setupSizeAdjuster();
    setupDarkMode();
});

function initializeUI() {
    // 팀위치 수정 버튼이 초기에 확실히 표시되도록 설정
    const teamEditBtn = document.getElementById('teamEditBtn');
    if (teamEditBtn) {
        teamEditBtn.style.display = 'inline-block';
        teamEditBtn.style.visibility = 'visible';
        teamEditBtn.disabled = false;
        console.log('초기 UI 설정: 팀위치 수정 버튼 표시');
    }
}

function setupDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    
    // 저장된 다크모드 설정 복원
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
    
    // 다크모드 토글 이벤트
    darkModeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        body.classList.toggle('dark-mode');
        
        const isNowDarkMode = body.classList.contains('dark-mode');
        darkModeToggle.textContent = isNowDarkMode ? '☀️' : '🌙';
        
        // 다크모드 설정 저장
        localStorage.setItem('darkMode', isNowDarkMode.toString());
    });
}

function setupSizeAdjuster() {
    const adjustBtn = document.getElementById('adjust-size-btn');
    const body = document.body;
    const container = document.querySelector('.container');
    let isAdjustMode = false;
    let isDragging = false;
    let startY = 0;
    let initialScale = 1;

    adjustBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isAdjustMode = !isAdjustMode;

        if (isAdjustMode) {
            body.classList.add('adjusting-size');
            adjustBtn.style.backgroundColor = '#e63946'; // 활성화 색상
        } else {
            body.classList.remove('adjusting-size');
            adjustBtn.style.backgroundColor = '#4CAF50'; // 비활성화 색상
            isDragging = false;
        }
    });

    body.addEventListener('mousedown', (e) => {
        if (!isAdjustMode) return;
        if (e.target.closest('.layout-controls, .player-card, .position-slot, .team-header, .controls')) {
            return;
        }
        e.preventDefault();
        isDragging = true;
        startY = e.clientY;
        const currentScale = container.style.transform.match(/scale\(([^)]+)\)/);
        initialScale = currentScale ? parseFloat(currentScale[1]) : 1;
    });

    body.addEventListener('mousemove', (e) => {
        if (!isDragging || !isAdjustMode) return;
        const dy = startY - e.clientY; // 위로 올리면 확대, 아래로 내리면 축소
        const newScale = Math.max(0.5, Math.min(2, initialScale + dy * 0.0017)); // 0.5배 ~ 2배 (민감도 1/3로 감소)
        container.style.transform = `scale(${newScale})`;
    });

    body.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        localStorage.setItem('layoutScale', container.style.transform);
    });

    const savedScale = localStorage.getItem('layoutScale');
    if (savedScale) {
        container.style.transform = savedScale;
    }
}

function setupLayoutAdjuster() {
    const adjustBtn = document.getElementById('adjust-layout-btn');
    const body = document.body;
    const container = document.querySelector('.container');
    let isAdjustMode = false; // 조정 모드 활성화 상태
    let isDragging = false;   // 실제 드래그 중인 상태
    let startX = 0;
    let startY = 0;
    let initialMarginLeft = 0;
    let initialMarginTop = 0;

    // 조정 모드 활성화/비활성화
    adjustBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isAdjustMode = !isAdjustMode;

        if (isAdjustMode) {
            body.classList.add('adjusting-layout');
            adjustBtn.style.backgroundColor = '#e63946'; // 활성화 색상
        } else {
            body.classList.remove('adjusting-layout');
            adjustBtn.style.backgroundColor = '#4CAF50'; // 비활성화 색상
            isDragging = false; // 모드 해제 시 드래그 중지
        }
    });

    body.addEventListener('mousedown', (e) => {
        if (!isAdjustMode) return;
        // 조정 버튼, 선수 카드, 슬롯 등 특정 요소 위에서는 드래그 시작 방지
        if (e.target.closest('.layout-controls, .player-card, .position-slot, .team-header, .controls')) {
            return;
        }
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialMarginLeft = parseInt(getComputedStyle(container).marginLeft) || 0;
        initialMarginTop = parseInt(getComputedStyle(container).marginTop) || 0;
    });

    body.addEventListener('mousemove', (e) => {
        if (!isDragging || !isAdjustMode) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        container.style.marginLeft = `${initialMarginLeft + dx}px`;
        container.style.marginTop = `${initialMarginTop + dy}px`;
    });

    body.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        // 변경된 레이아웃 위치 저장
        localStorage.setItem('layoutMarginLeft', container.style.marginLeft);
        localStorage.setItem('layoutMarginTop', container.style.marginTop);
    });

    // 페이지 로드 시 저장된 레이아웃 위치 복원
    const savedMarginLeft = localStorage.getItem('layoutMarginLeft');
    const savedMarginTop = localStorage.getItem('layoutMarginTop');
    
    if (savedMarginLeft) {
        container.style.marginLeft = savedMarginLeft;
    }
    if (savedMarginTop) {
        container.style.marginTop = savedMarginTop;
    }
}

function initializeScoreInputs() {
    document.querySelectorAll('.position-slot:not(.jgl) .position-score').forEach(input => {
        if (!input.dataset.oldValue) {
            input.dataset.oldValue = input.value || '0';
        }
    });
}

function selectPlayer(card, playerId, playerFile) {
    document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
    
    card.classList.add('selected');
    state.selectedPlayer = {
        id: playerId,
        file: playerFile,
        position: state.currentPosition
    };
}

function assignPlayer(emptySlot) {
    if (!state.selectedPlayer) {
        alert('먼저 아래에서 선수를 선택해주세요!');
        return;
    }

    const position = emptySlot.dataset.position;
    
    if (state.selectedPlayer.position !== position) {
        alert(`${POSITION_NAMES[position]} 포지션에는 ${POSITION_NAMES[state.selectedPlayer.position]} 선수를 배치할 수 없습니다!`);
        return;
    }

    const teamElement = emptySlot.closest('.team');
    const teamId = parseInt(teamElement.dataset.team);
    
    if (state.teams[teamId].players[position]) {
        alert('이미 해당 포지션에 선수가 있습니다!');
        return;
    }

    state.teams[teamId].players[position] = {
        file: state.selectedPlayer.file,
        id: state.selectedPlayer.id
    };

    state.usedPlayers.add(state.selectedPlayer.id);

    updateSlot(emptySlot, state.selectedPlayer);
    renderPlayers();
    state.selectedPlayer = null;
    saveToStorage();
}

function assignPlayerByDrop(emptySlot, playerData) {
    const position = emptySlot.dataset.position;
    
    if (playerData.position !== position) {
        alert(`${POSITION_NAMES[position]} 포지션에는 ${POSITION_NAMES[playerData.position]} 선수를 배치할 수 없습니다!`);
        return;
    }

    const teamElement = emptySlot.closest('.team');
    const teamId = parseInt(teamElement.dataset.team);
    
    if (state.teams[teamId].players[position]) {
        alert('이미 해당 포지션에 선수가 있습니다!');
        return;
    }

    state.teams[teamId].players[position] = {
        file: playerData.file,
        id: playerData.id
    };

    state.usedPlayers.add(playerData.id);

    updateSlot(emptySlot, playerData);
    renderPlayers();
    saveToStorage();
}

function removePlayer(slot, player) {
    const teamElement = slot.closest('.team');
    const teamId = parseInt(teamElement.dataset.team);
    const position = player.position;

    const scoreInput = slot.querySelector('.position-score');
    const currentScore = parseInt(scoreInput?.value) || 0;

    state.teams[teamId].players[position] = null;
    state.usedPlayers.delete(player.id);

    const playerContainer = slot.querySelector('.player-container');
    if (playerContainer) {
        playerContainer.remove();
    }

    if (!slot.querySelector('.empty-slot')) {
        const emptySlotHtml = `<div class="empty-slot" data-position="${position}">${POSITION_NAMES[position]}</div>`;
        slot.insertAdjacentHTML('afterbegin', emptySlotHtml);
    }

    if (position !== 'jgl' && scoreInput) {
        scoreInput.value = '0';
        scoreInput.dataset.oldValue = '0';

        const pointsInput = teamElement.querySelector('.points-input');
        const currentPoints = parseInt(pointsInput.value) || 0;
        const restoredPoints = Math.min(1000, currentPoints + currentScore);
        pointsInput.value = restoredPoints;

        console.log(`[팀 ${teamId}] 선수 제거: ${position} 포지션 점수 ${currentScore} → 0, 팀 포인트 ${currentPoints} → ${restoredPoints} (+${currentScore})`);
    }

    renderPlayers();
    saveToStorage();
}

// 팀 순서 랜덤화 실행 중 플래그
let isRandomizingTeams = false;

// 모든 팀 리셋 실행 중 플래그
let isResettingTeams = false;

function randomizeTeamPositions() {
    // 이미 실행 중인 경우 중복 호출 방지
    if (isRandomizingTeams) {
        console.log('팀 순서 랜덤화가 이미 진행 중입니다.');
        return;
    }
    
    if (confirm('팀들의 위치를 무작위로 섞으시겠습니까? (선수 배치는 유지됩니다)')) {
        isRandomizingTeams = true; // 실행 시작
        
        try {
            // 현재 내 팀 모드 상태 저장
            const isMyTeamMode = state.selectedTeam !== null;
            const currentSelectedTeam = state.selectedTeam;
        
        // 내 팀 모드 상태를 명시적으로 해제 (토글이 아닌 직접 해제)
        if (isMyTeamMode) {
            // state만 초기화하고 UI는 나중에 한번에 처리
            state.selectedTeam = null;
            
            const teamsContainer = document.querySelector('.teams-container');
            const playersPanel = document.querySelector('.players-panel');
            
            // 내 팀 모드 클래스 제거
            teamsContainer.classList.remove('my-team-mode');
            playersPanel.classList.remove('in-grid');
            
            // 기존 other-teams-container에서 팀들을 다시 원래 컨테이너로 이동
            const existingOtherContainer = document.querySelector('.other-teams-container');
            if (existingOtherContainer) {
                const otherTeams = Array.from(existingOtherContainer.querySelectorAll('.team.other-team'));
                otherTeams.forEach(team => {
                    team.classList.remove('other-team');
                    teamsContainer.appendChild(team);
                });
                existingOtherContainer.remove();
            }
            
            // 선수 패널을 원래 위치로 이동
            if (state.originalPlayersPanelParent && playersPanel.parentNode !== state.originalPlayersPanelParent) {
                state.originalPlayersPanelParent.appendChild(playersPanel);
            }
        }
        
        let teamElements = [];
        const teamsContainer = document.querySelector('.teams-container');
        
        // 내 팀 모드에서는 teamsContainer 내의 모든 팀을 찾는다
        if (isMyTeamMode) {
            teamElements = Array.from(teamsContainer.querySelectorAll('.team'));
            const myTeamCount = teamElements.filter(el => el.classList.contains('my-team')).length;
            const otherTeamCount = teamElements.filter(el => el.classList.contains('other-team')).length;
            console.log(`내 팀 모드에서 찾은 팀 수: ${teamElements.length} (내 팀: ${myTeamCount}, 다른 팀: ${otherTeamCount})`);
        } else {
            // 일반 모드에서는 기존 방법 사용
            teamElements = Array.from(document.querySelectorAll('.team'));
            console.log(`일반 모드에서 찾은 팀 수: ${teamElements.length}`);
        }
        
        if (teamElements.length === 0) {
            console.error('팀을 찾을 수 없습니다. 랜덤화를 중단합니다.');
            isRandomizingTeams = false;
            return;
        }
        
        const teamDataWithDOM = teamElements.map(teamElement => {
            const teamId = parseInt(teamElement.dataset.team);
            return {
                element: teamElement.cloneNode(true),
                data: { ...state.teams[teamId] }
            };
        });
        
        // 팀 순서 섞기
        for (let i = teamDataWithDOM.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teamDataWithDOM[i], teamDataWithDOM[j]] = [teamDataWithDOM[j], teamDataWithDOM[i]];
        }
        
        // 기존 팀 요소들 제거
        teamElements.forEach(element => element.remove());
        
        // 컨테이너 초기화
        teamsContainer.innerHTML = '';
        
        // state와 DOM 업데이트 (배열 구조 유지)
        const newTeamsData = [];
        teamDataWithDOM.forEach((teamInfo, index) => {
            newTeamsData[index] = {
                ...teamInfo.data,
                id: index
            };
            
            teamInfo.element.dataset.team = index.toString();
            teamInfo.element.classList.remove('my-team', 'other-team');
            
            const myTeamBtn = teamInfo.element.querySelector('.my-team-btn');
            if (myTeamBtn) {
                myTeamBtn.dataset.team = index.toString();
                myTeamBtn.classList.remove('selected');
            }
            
            teamsContainer.appendChild(teamInfo.element);
        });
        
        // state.teams 업데이트 (배열로 유지)
        state.teams = newTeamsData;
        
        console.log('팀 위치가 무작위로 섞였습니다.');
        
        } catch (error) {
            console.error('팀 순서 랜덤화 중 오류 발생:', error);
        } finally {
            isRandomizingTeams = false; // 실행 완료
            
            // 플래그 해제 후 이벤트 리스너 재연결
            setTimeout(() => {
                reattachEventListeners();
                console.log('팀 순서 랜덤화 완료 후 이벤트 리스너 재연결됨');
            }, 100);
        }
    } else {
        isRandomizingTeams = false; // 취소 시에도 플래그 해제
    }
}

function resetAllTeams() {
    // 이미 실행 중인 경우 중복 호출 방지
    if (isResettingTeams) {
        console.log('모든 팀 리셋이 이미 진행 중입니다.');
        return;
    }
    
    if (confirm('모든 팀을 리셋하시겠습니까? (선수 배치와 포인트가 초기화됩니다)')) {
        isResettingTeams = true; // 실행 시작
        
        try {
            // 내 팀 모드 완전히 해제
            const wasMyTeamMode = state.selectedTeam !== null;
            state.selectedTeam = null;
            
            // UI 상태 초기화
            const teamsContainer = document.querySelector('.teams-container');
            const playersPanel = document.querySelector('.players-panel');
            
            // 내 팀 모드 관련 클래스와 구조 완전히 정리
            if (wasMyTeamMode) {
                teamsContainer.classList.remove('my-team-mode');
                playersPanel.classList.remove('in-grid');
                
                // 기존 other-teams-container 제거 및 팀들 복원
                const existingOtherContainer = document.querySelector('.other-teams-container');
                if (existingOtherContainer) {
                    const otherTeams = Array.from(existingOtherContainer.querySelectorAll('.team.other-team'));
                    otherTeams.forEach(team => {
                        team.classList.remove('other-team');
                        teamsContainer.appendChild(team);
                    });
                    existingOtherContainer.remove();
                }
                
                // 선수 패널을 원래 위치로 이동
                if (state.originalPlayersPanelParent && playersPanel.parentNode !== state.originalPlayersPanelParent) {
                    state.originalPlayersPanelParent.appendChild(playersPanel);
                }
            }
            
            // 팀위치 수정 버튼 다시 보이기
            const teamEditBtn = document.getElementById('teamEditBtn');
            if (teamEditBtn) {
                teamEditBtn.style.display = 'inline-block';
                teamEditBtn.style.visibility = 'visible';
                teamEditBtn.disabled = false;
                console.log('리셋: 팀위치 수정 버튼 표시');
            }
            
            // 슬롯머신 크기 초기화
            updateSlotMachinePosition(false);
            
            // 모든 팀 데이터 초기화
            state.teams.forEach(team => {
                team.players = { top: null, mid: null, bot: null, sup: null };
            });

            state.usedPlayers.clear();

            // 포인트 입력 필드 초기화
            document.querySelectorAll('.points-input').forEach(input => {
                input.value = 1000;
            });

            // 포지션 슬롯 초기화
            document.querySelectorAll('.position-slot:not(.jgl)').forEach(slot => {
                const positionClasses = ['top', 'mid', 'bot', 'sup'];
                let position = null;
                
                for (const pos of positionClasses) {
                    if (slot.classList.contains(pos)) {
                        position = pos;
                        break;
                    }
                }
                
                if (position) {
                    slot.innerHTML = '';
                    
                    const emptySlotHtml = `<div class="empty-slot" data-position="${position}">${POSITION_NAMES[position]}</div>`;
                    slot.insertAdjacentHTML('beforeend', emptySlotHtml);
                    
                    const scoreInput = document.createElement('input');
                    scoreInput.type = 'number';
                    scoreInput.className = 'position-score';
                    scoreInput.value = '0';
                    scoreInput.min = '0';
                    scoreInput.max = '1000';
                    scoreInput.placeholder = '점수';
                    scoreInput.dataset.oldValue = '0';
                    slot.appendChild(scoreInput);
                }
            });

            // 모든 팀의 클래스 초기화
            document.querySelectorAll('.team').forEach(team => {
                team.classList.remove('my-team', 'other-team');
            });
            
            // 내 팀 버튼 초기화
            document.querySelectorAll('.my-team-btn').forEach(btn => {
                btn.classList.remove('selected');
            });

            // 선택된 선수 초기화
            state.selectedPlayer = null;
            
            // UI 재렌더링
            renderPlayers();
            
            // 저장
            saveToStorage();
            
            console.log('모든 팀 리셋 완료');
            
        } catch (error) {
            console.error('모든 팀 리셋 중 오류 발생:', error);
        } finally {
            isResettingTeams = false; // 실행 완료
            
            // 플래그 해제 후 이벤트 리스너 재연결
            setTimeout(() => {
                reattachEventListeners();
                console.log('모든 팀 리셋 완료 후 이벤트 리스너 재연결됨');
            }, 100);
        }
    } else {
        isResettingTeams = false; // 취소 시에도 플래그 해제
    }
}
