
// js/storage.js

function saveToStorage() {
    try {
        // state.teams가 배열인지 확인하고 보정
        if (!Array.isArray(state.teams)) {
            console.warn('saveToStorage: state.teams가 배열이 아닙니다. 변환합니다.');
            if (typeof state.teams === 'object' && state.teams !== null) {
                const teamsArray = [];
                Object.keys(state.teams).forEach(key => {
                    const teamIndex = parseInt(key);
                    const team = state.teams[key];
                    
                    if (!team || typeof team !== 'object') {
                        console.warn(`저장 중 팀 ${teamIndex}이 유효하지 않습니다. 기본값으로 초기화합니다.`);
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
            }
        } else {
            // 배열이라도 각 요소의 유효성 검사
            state.teams = state.teams.map((team, index) => {
                if (!team || typeof team !== 'object') {
                    console.warn(`저장 중 팀 ${index}이 유효하지 않습니다. 기본값으로 초기화합니다.`);
                    return { id: index, players: { top: null, mid: null, bot: null, sup: null } };
                }
                // players가 없으면 기본값 설정
                if (!team.players || typeof team.players !== 'object') {
                    team.players = { top: null, mid: null, bot: null, sup: null };
                }
                return team;
            });
        }
        
        const gameData = {
            teams: state.teams,
            usedPlayers: Array.from(state.usedPlayers),
            teamPoints: getTeamPoints(),
            positionScores: getPositionScores(),
            selectedTeam: state.selectedTeam, // 내 팀 모드 상태 저장
            timestamp: new Date().getTime()
        };
        localStorage.setItem('lol-team-builder', JSON.stringify(gameData));
    } catch (error) {
        console.log('저장 실패:', error);
    }
}

function loadFromStorage() {
    try {
        const savedData = localStorage.getItem('lol-team-builder');
        if (savedData) {
            const gameData = JSON.parse(savedData);
            
            if (gameData.teams) {
                // teams가 배열인지 확인하고, 객체인 경우 배열로 변환
                if (Array.isArray(gameData.teams)) {
                    // 배열의 각 요소가 유효한지 확인
                    state.teams = gameData.teams.map((team, index) => {
                        if (!team || typeof team !== 'object') {
                            console.warn(`로드된 팀 ${index}이 유효하지 않습니다. 기본값으로 초기화합니다.`);
                            return { id: index, players: { top: null, mid: null, bot: null, sup: null } };
                        }
                        // players가 없으면 기본값 설정
                        if (!team.players || typeof team.players !== 'object') {
                            team.players = { top: null, mid: null, bot: null, sup: null };
                        }
                        return team;
                    });
                } else {
                    // 객체를 배열로 변환
                    const teamsArray = [];
                    Object.keys(gameData.teams).forEach(key => {
                        const teamIndex = parseInt(key);
                        const team = gameData.teams[key];
                        
                        if (!team || typeof team !== 'object') {
                            console.warn(`로드된 팀 ${teamIndex}이 유효하지 않습니다. 기본값으로 초기화합니다.`);
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
                    console.log('state.teams를 객체에서 배열로 변환했습니다.');
                }
            }
            
            if (gameData.usedPlayers) {
                state.usedPlayers = new Set(gameData.usedPlayers);
            }
            
            // 내 팀 모드 상태 복원
            if (typeof gameData.selectedTeam === 'number') {
                state.selectedTeam = gameData.selectedTeam;
            }
            
            setTimeout(() => {
                // restoreUI 재호출 방지 플래그 확인
                if (!window._skipRestoreUI) {
                    restoreUI(gameData);
                    
                    // 내 팀 모드였다면 다시 활성화
                    if (typeof gameData.selectedTeam === 'number') {
                        setTimeout(() => {
                            selectMyTeam(gameData.selectedTeam);
                        }, 150);
                    } else {
                        // 내 팀 모드가 아니라면 팀위치 수정 버튼이 확실히 보이도록 설정
                        const teamEditBtn = document.getElementById('teamEditBtn');
                        if (teamEditBtn) {
                            teamEditBtn.style.display = 'inline-block';
                            teamEditBtn.style.visibility = 'visible';
                            teamEditBtn.disabled = false;
                            console.log('일반 모드 복원: 팀위치 수정 버튼 표시 확인');
                        }
                    }
                } else {
                    console.log('restoreUI 호출 건너뜀 (플래그 설정됨)');
                }
            }, 100);
        }
    } catch (error) {
        console.log('로드 실패:', error);
    }
}

function getTeamPoints() {
    const points = [];
    document.querySelectorAll('.points-input').forEach((input, index) => {
        points[index] = parseInt(input.value) || 1000;
    });
    return points;
}

function getPositionScores() {
    const scores = [];
    document.querySelectorAll('.position-slot:not(.jgl)').forEach(slot => {
        const scoreInput = slot.querySelector('.position-score');
        if (scoreInput) {
            const teamElement = slot.closest('.team');
            const teamId = parseInt(teamElement.dataset.team);
            const position = ['top', 'mid', 'bot', 'sup'].find(pos => slot.classList.contains(pos));
            
            if (position) {
                scores.push({
                    teamId: teamId,
                    position: position,
                    score: parseInt(scoreInput.value) || 0
                });
            }
        }
    });
    return scores;
}
