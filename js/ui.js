// js/ui.js

function renderPlayers() {
    const playersGrid = document.getElementById('playersGrid');
    playersGrid.innerHTML = '';

    PLAYERS[state.currentPosition].forEach((player, index) => {
        const playerCard = document.createElement('div');
        const playerId = `${state.currentPosition}_${player}`;
        const isUsed = state.usedPlayers.has(playerId);
        
        playerCard.className = `player-card ${isUsed ? 'used' : ''}`;
        playerCard.draggable = !isUsed;
        playerCard.innerHTML = `
            <img src="${state.currentPosition}/${player}" alt="선수">
            <h4>${getPlayerName(player)}</h4>
        `;

        if (!isUsed) {
            playerCard.addEventListener('dragstart', (e) => {
                playerCard.classList.add('dragging');
                e.dataTransfer.setData('application/json', JSON.stringify({
                    id: playerId,
                    file: player,
                    position: state.currentPosition
                }));
            });

            playerCard.addEventListener('dragend', () => {
                playerCard.classList.remove('dragging');
            });

            playerCard.addEventListener('click', () => {
                selectPlayer(playerCard, playerId, player);
            });
        }

        playersGrid.appendChild(playerCard);
    });
}

function updateSlot(slot, player) {
    const positionSlot = slot.closest('.position-slot');
    const scoreInput = positionSlot.querySelector('.position-score');
    
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-container';
    
    const img = document.createElement('img');
    img.src = `${player.position}/${player.file}`;
    img.className = 'player-img';
    img.alt = '선수';
    
    const nameLabel = document.createElement('div');
    nameLabel.className = 'player-name-label';
    nameLabel.textContent = getPlayerName(player.file);
    
    img.addEventListener('click', () => {
        removePlayer(positionSlot, player);
    });

    playerContainer.appendChild(img);
    playerContainer.appendChild(nameLabel);
    
    slot.remove();
    positionSlot.insertBefore(playerContainer, scoreInput);
}

function restoreUI(gameData) {
    if (gameData.teamPoints) {
        gameData.teamPoints.forEach((points, teamId) => {
            const pointsInput = document.querySelector(`[data-team="${teamId}"] .points-input`);
            if (pointsInput) {
                pointsInput.value = points;
            }
        });
    }

    if (gameData.positionScores) {
        gameData.positionScores.forEach(scoreData => {
            const slot = document.querySelector(`[data-team="${scoreData.teamId}"] .position-slot.${scoreData.position} .position-score`);
            if (slot) {
                slot.value = scoreData.score;
                slot.dataset.oldValue = scoreData.score;
            }
        });
    }

    // state.teams가 배열인지 확인
    if (!Array.isArray(state.teams)) {
        console.error('state.teams가 배열이 아닙니다:', typeof state.teams, state.teams);
        // 객체인 경우 배열로 변환
        if (typeof state.teams === 'object' && state.teams !== null) {
            const teamsArray = [];
            Object.keys(state.teams).forEach(key => {
                const teamIndex = parseInt(key);
                const team = state.teams[key];
                
                if (!team || typeof team !== 'object') {
                    console.warn(`변환 중 팀 ${teamIndex}이 유효하지 않습니다. 기본값으로 초기화합니다.`);
                    teamsArray[teamIndex] = { id: teamIndex, players: { top: null, mid: null, bot: null, sup: null } };
                } else {
                    // players가 없으면 기본값 설정
                    if (!team.players || typeof team.players !== 'object') {
                        team.players = { top: null, mid: null, bot: null, sup: null };
                    }
                    teamsArray[teamIndex] = team;
                }
            });
            state.teams = teamsArray;
            console.log('restoreUI에서 state.teams를 배열로 변환했습니다.');
        } else {
            console.error('state.teams를 복구할 수 없습니다. 기본값으로 초기화합니다.');
            return;
        }
    }

    state.teams.forEach((team, teamId) => {
        // team 객체가 유효한지 확인
        if (!team || typeof team !== 'object') {
            console.warn(`팀 ${teamId}이 유효하지 않습니다:`, team);
            return; // 이 팀은 건너뛰기
        }
        
        // team.players가 유효한지 확인
        if (!team.players || typeof team.players !== 'object') {
            console.warn(`팀 ${teamId}의 players가 유효하지 않습니다:`, team.players);
            return; // 이 팀은 건너뛰기
        }
        
        Object.keys(team.players).forEach(position => {
            const player = team.players[position];
            if (player) {
                const slot = document.querySelector(`[data-team="${teamId}"] .position-slot.${position}`);
                if (slot) {
                    const emptySlot = slot.querySelector('.empty-slot');
                    if (emptySlot) {
                        updateSlot(emptySlot, {
                            file: player.file,
                            position: position,
                            id: player.id
                        });
                    }
                }
            }
        });
    });

    renderPlayers();
}

function highlightActivePositions(position) {
    document.querySelectorAll('.position-slot').forEach(slot => {
        slot.classList.remove('active');
    });

    document.querySelectorAll(`.position-slot.${position}`).forEach(slot => {
        slot.classList.add('active');
    });
}

function toggleEditMode() {
    state.isEditMode = !state.isEditMode;
    const editBtn = document.getElementById('teamEditBtn');
    const teamsContainer = document.querySelector('.teams-container');
    const teams = document.querySelectorAll('.team');
    
    if (state.isEditMode) {
        editBtn.textContent = '편집 완료';
        editBtn.classList.add('active');
        teamsContainer.classList.add('edit-mode');
        teams.forEach(team => {
            team.draggable = true;
        });
        
        // 내 팀 모드든 일반 모드든 드래그 앤 드롭 설정
        setupDragAndDrop();
    } else {
        editBtn.textContent = '팀위치 수정';
        editBtn.classList.remove('active');
        teamsContainer.classList.remove('edit-mode');
        teams.forEach(team => {
            team.draggable = false;
        });
        
        // 편집 모드 해제 시 내 팀 모드가 아니라면 버튼이 확실히 보이도록 설정
        if (state.selectedTeam === null) {
            editBtn.style.display = 'inline-block';
            editBtn.style.visibility = 'visible';
            editBtn.disabled = false;
            console.log('편집 모드 해제: 팀위치 수정 버튼 표시 확인');
        }
        
        // 편집 모드 해제 시 내 팀 모드 상태 복원
        if (state.selectedTeam !== null) {
            console.log('편집 모드 해제 중 내 팀 모드 복원:', state.selectedTeam);
            // 약간의 지연을 두고 내 팀 모드 복원
            setTimeout(() => {
                const currentSelectedTeam = state.selectedTeam;
                state.selectedTeam = null; // 일시적으로 null로 설정
                selectMyTeam(currentSelectedTeam); // 다시 내 팀 모드 활성화
            }, 50);
        }
    }
}

function selectMyTeam(teamId) {
    const teamsContainer = document.querySelector('.teams-container');
    const playersPanel = document.querySelector('.players-panel');
    
    // DOM에서 현재 존재하는 모든 팀을 가져오기
    const allTeams = Array.from(document.querySelectorAll('.team')).sort((a, b) => {
        return parseInt(a.dataset.team) - parseInt(b.dataset.team);
    }).map(team => team.cloneNode(true));
    
    console.log(`selectMyTeam 호출: teamId=${teamId}, 찾은 팀 수=${allTeams.length}`);
    
    // 선택하려는 팀이 존재하는지 확인
    const targetTeam = allTeams.find(team => parseInt(team.dataset.team) === teamId);
    if (!targetTeam) {
        console.error(`팀 ID ${teamId}을 찾을 수 없습니다. 사용 가능한 팀:`, allTeams.map(t => t.dataset.team));
        return;
    }
    
    document.querySelectorAll('.my-team-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelectorAll('.team').forEach(team => {
        team.classList.remove('my-team', 'other-team');
        team.style.display = '';
    });

    const existingOtherContainer = document.querySelector('.other-teams-container');
    if (existingOtherContainer) {
        existingOtherContainer.remove();
    }
    
    if (state.selectedTeam === teamId) {
        state.selectedTeam = null;
        teamsContainer.classList.remove('my-team-mode');
        playersPanel.classList.remove('in-grid');
        
        // 팀위치 수정 버튼과 랜덤 버튼 다시 보이기
        const teamEditBtn = document.getElementById('teamEditBtn');
        if (teamEditBtn) {
            teamEditBtn.style.display = 'inline-block';
            teamEditBtn.style.visibility = 'visible';
            teamEditBtn.disabled = false;
            console.log('일반 모드로 복귀: 팀위치 수정 버튼 표시');
        }
        
        const randomBtn = document.getElementById('randomBtn');
        if (randomBtn) {
            randomBtn.style.display = 'inline-block';
            randomBtn.style.visibility = 'visible';
            randomBtn.disabled = false;
            console.log('일반 모드로 복귀: 랜덤 버튼 표시');
        }
        
        updateSlotMachinePosition(false);
        
        if (state.originalPlayersPanelParent && playersPanel.parentNode !== state.originalPlayersPanelParent) {
            state.originalPlayersPanelParent.appendChild(playersPanel);
        }
        
        teamsContainer.innerHTML = '';
        
        allTeams.forEach(team => {
            team.style.display = '';
            team.classList.remove('my-team', 'other-team');
            teamsContainer.appendChild(team);
        });
        
        reattachEventListeners();
    } else {
        state.selectedTeam = teamId;
        
        // 팀위치 수정 버튼과 랜덤 버튼 숨기기
        const teamEditBtn = document.getElementById('teamEditBtn');
        if (teamEditBtn) {
            teamEditBtn.style.display = 'none';
            teamEditBtn.style.visibility = 'hidden';
            teamEditBtn.disabled = true;
            console.log('내 팀 모드 진입: 팀위치 수정 버튼 숨김');
        }
        
        const randomBtn = document.getElementById('randomBtn');
        if (randomBtn) {
            randomBtn.style.display = 'none';
            randomBtn.style.visibility = 'hidden';
            randomBtn.disabled = true;
            console.log('내 팀 모드 진입: 랜덤 버튼 숨김');
        }
        
        teamsContainer.classList.add('my-team-mode');
        playersPanel.classList.add('in-grid');
        
        updateSlotMachinePosition(false); // 확대 기능 제거
        
        const selectedTeam = allTeams.find(team => parseInt(team.dataset.team) === teamId);
        const otherTeams = allTeams.filter(team => parseInt(team.dataset.team) !== teamId)
            .sort((a, b) => parseInt(a.dataset.team) - parseInt(b.dataset.team)); // 팀 번호 순으로 정렬
        
        console.log(`내 팀: ${teamId}, 다른 팀 수: ${otherTeams.length}`);
        
        teamsContainer.innerHTML = '';
        
        selectedTeam.classList.add('my-team');
        selectedTeam.classList.remove('other-team');
        teamsContainer.appendChild(selectedTeam);
        
        const otherTeamsContainer = document.createElement('div');
        otherTeamsContainer.className = 'other-teams-container';
        
        otherTeams.forEach((team, index) => {
            team.classList.add('other-team');
            team.classList.remove('my-team');
            team.style.display = '';
            console.log(`다른 팀 ${index + 1}: data-team=${team.dataset.team}`);
            otherTeamsContainer.appendChild(team);
        });
        
        // 선수 선택 패널을 other-teams-container 내부로 이동
        otherTeamsContainer.appendChild(playersPanel);
        
        teamsContainer.appendChild(otherTeamsContainer);
        
        const myTeamBtn = teamsContainer.querySelector(`.my-team .my-team-btn`);
        if (myTeamBtn) {
            myTeamBtn.classList.add('selected');
        }
        
        reattachEventListeners();
        
        // DOM 렌더링 완료 후 확인
        setTimeout(() => {
            const renderedTeams = document.querySelectorAll('.other-teams-container .team.other-team');
            console.log(`렌더링된 other-teams: ${renderedTeams.length}개`);
        }, 10);
    }
}

// 슬롯머신에서 추첨된 선수의 포지션으로 자동 전환
function switchToPosition(position) {
    // 현재 포지션 상태 업데이트
    state.currentPosition = position;
    
    // 해당 포지션의 탭 버튼을 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.position === position) {
            btn.classList.add('active');
        }
    });
    
    // 해당 포지션을 하이라이트
    highlightActivePositions(position);
    
    // 선수 목록을 해당 포지션으로 업데이트
    renderPlayers();
    
    console.log(`포지션이 ${POSITION_NAMES[position]}로 전환되었습니다.`);
}
