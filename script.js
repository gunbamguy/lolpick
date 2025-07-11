// 게임 상태 관리
class TeamManager {
    constructor() {
        this.teams = [
            { id: 0, players: { top: null, mid: null, bot: null, sup: null } },
            { id: 1, players: { top: null, mid: null, bot: null, sup: null } },
            { id: 2, players: { top: null, mid: null, bot: null, sup: null } },
            { id: 3, players: { top: null, mid: null, bot: null, sup: null } },
            { id: 4, players: { top: null, mid: null, bot: null, sup: null } },
            { id: 5, players: { top: null, mid: null, bot: null, sup: null } }
        ];

        this.players = {
            top: ['던.gif', '룩삼.gif', '맛수령.gif', '승우아빠.gif', '치킨쿤.gif', '푸린.gif'],
            mid: ['네클릿.gif', '노페.gif', '인간젤리.gif', '트롤야.gif', '피닉스박.gif', '헤징.gif'],
            bot: ['강퀴.gif', '눈꽃.gif', '따효니.gif', '러너.gif', '마소킴.gif', '플러리.gif'],
            sup: ['고수달.gif', '라콩.gif', '매드라이프.gif', '이희태.gif', '캡틴잭.gif', '크캣.gif']
        };

        this.usedPlayers = new Set();
        this.currentPosition = 'top';
        this.selectedPlayer = null;
        this.isEditMode = false;
        this.selectedTeam = null;
        
        // 선수 선택 패널의 원래 위치 저장
        this.originalPlayersPanelParent = null;

        // 로컬 스토리지에서 데이터 로드
        this.loadFromStorage();

        this.init();
    }

    init() {
        // 선수 선택 패널의 원래 부모 요소 저장
        const playersPanel = document.querySelector('.players-panel');
        this.originalPlayersPanelParent = playersPanel ? playersPanel.parentNode : null;
        
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupSlotMachineDrag();
        this.highlightActivePositions(this.currentPosition);
        this.renderPlayers();
        
        // 초기 데이터 설정 - 모든 포지션 점수 입력란의 oldValue 설정
        this.initializeScoreInputs();
        
        // 슬롯머신 초기 위치 설정 (일반 모드)
        this.updateSlotMachinePosition(false);
    }

    // 초기 포지션 점수 입력란 설정
    initializeScoreInputs() {
        document.querySelectorAll('.position-slot:not(.jgl) .position-score').forEach(input => {
            if (!input.dataset.oldValue) {
                input.dataset.oldValue = input.value || '0';
            }
        });
    }

    setupEventListeners() {
        // 포지션 탭 이벤트
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPosition = e.target.dataset.position;
                this.highlightActivePositions(this.currentPosition);
                this.renderPlayers();
            });
        });

        // 이벤트 위임을 사용한 빈 슬롯 클릭 및 드롭 이벤트
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('empty-slot')) {
                this.assignPlayer(e.target);
            }
            // 선수 이미지 클릭 이벤트 (선수 제거)
            else if (e.target.classList.contains('player-img') && !e.target.classList.contains('fixed')) {
                const slot = e.target.closest('.position-slot');
                const teamElement = slot.closest('.team');
                const teamId = parseInt(teamElement.dataset.team);
                
                // position-slot에서 포지션 찾기
                let position = null;
                const positionClasses = ['top', 'mid', 'bot', 'sup'];
                for (const pos of positionClasses) {
                    if (slot.classList.contains(pos)) {
                        position = pos;
                        break;
                    }
                }
                
                if (position) {
                    const player = this.teams[teamId].players[position];
                    if (player) {
                        this.removePlayer(slot, player);
                    }
                }
            }
        });

        // 드롭 이벤트
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
                        this.assignPlayerByDrop(targetSlot, playerData);
                    }
                } catch (error) {
                    console.log('드롭 데이터 파싱 실패:', error);
                }
            }
        });

        // 리셋 이벤트
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetAllTeams();
        });

        // 팀 편집 모드 토글
        document.getElementById('teamEditBtn').addEventListener('click', () => {
            this.toggleEditMode();
        });

        // 랜덤 버튼 이벤트
        document.getElementById('randomBtn').addEventListener('click', () => {
            this.randomizeTeamPositions();
        });

        // 슬롯머신 버튼 이벤트
        document.getElementById('slotMachineBtn').addEventListener('click', () => {
            this.startSlotMachine();
        });

        // 내 팀 선택 이벤트
        document.querySelectorAll('.my-team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const teamId = parseInt(btn.dataset.team);
                this.selectMyTeam(teamId);
            });
        });

        // 포인트 입력 변경 이벤트
        this.setupTeamPointsEvents();

        // 포지션 점수 입력 이벤트 (정글러 제외)
        this.setupPositionScoreEvents();

        // 윈도우 리사이즈 이벤트 (슬롯머신 위치 조정)
        window.addEventListener('resize', () => {
            this.adjustSlotMachinePositionOnResize();
        });
    }

    // 팀 포인트 입력 이벤트 설정 (재사용 가능한 메서드)
    setupTeamPointsEvents() {
        document.querySelectorAll('.points-input').forEach(input => {
            // 기존 이벤트 리스너 제거 (중복 방지)
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            newInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (value < 0) e.target.value = 0;
                if (value > 1000) e.target.value = 1000;
                this.saveToStorage(); // 포인트 변경 시 저장
            });
            
            newInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (value < 0) e.target.value = 0;
                if (value > 1000) e.target.value = 1000;
            });
            
            newInput.addEventListener('blur', (e) => {
                this.saveToStorage(); // 포인트 수정 완료 시 저장
            });
        });
    }

    // 포지션 점수 입력 이벤트 설정 (재사용 가능한 메서드)
    setupPositionScoreEvents() {
        // 포지션 점수 입력 이벤트 (정글러 제외)
        document.querySelectorAll('.position-slot:not(.jgl) .position-score').forEach(input => {
            // 기존 이벤트 리스너 제거 (중복 방지)
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            // 포지션 점수 변경 시 팀 포인트 차감 로직
            newInput.addEventListener('input', (e) => {
                this.handlePositionScoreChange(e);
            });

            // 초기 값 저장 (포인트 차감 계산을 위해)
            newInput.addEventListener('focus', (e) => {
                e.target.dataset.oldValue = e.target.value || '0';
            });
        });
    }

    // 포지션 점수 변경 처리 (팀 포인트 차감 포함)
    handlePositionScoreChange(event) {
        const input = event.target;
        let newScore = parseInt(input.value) || 0;
        const oldScore = parseInt(input.dataset.oldValue) || 0;
        
        // 점수 범위 검증
        if (newScore < 0) {
            newScore = 0;
            input.value = 0;
        }
        if (newScore > 1000) {
            newScore = 1000;
            input.value = 1000;
        }

        // 해당 팀의 포인트에서 점수 차이만큼 차감
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
        
        // 팀 포인트 업데이트
        pointsInput.value = newPoints;
        input.dataset.oldValue = newScore;
        
        // 변경사항 저장
        setTimeout(() => this.saveToStorage(), 100);
        
        console.log(`[팀 ${teamElement.dataset.team}] 포지션 점수 변경: ${oldScore} → ${newScore}, 팀 포인트: ${currentPoints} → ${newPoints} (차감: ${scoreDifference})`);
    }

    renderPlayers() {
        const playersGrid = document.getElementById('playersGrid');
        playersGrid.innerHTML = '';

        this.players[this.currentPosition].forEach((player, index) => {
            const playerCard = document.createElement('div');
            const playerId = `${this.currentPosition}_${player}`;
            const isUsed = this.usedPlayers.has(playerId);
            
            playerCard.className = `player-card ${isUsed ? 'used' : ''}`;
            playerCard.draggable = !isUsed;
            playerCard.innerHTML = `
                <img src="${this.currentPosition}/${player}" alt="선수">
                <h4>${this.getPlayerName(player)}</h4>
            `;

            if (!isUsed) {
                // 드래그 이벤트 추가
                playerCard.addEventListener('dragstart', (e) => {
                    playerCard.classList.add('dragging');
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        id: playerId,
                        file: player,
                        position: this.currentPosition
                    }));
                });

                playerCard.addEventListener('dragend', () => {
                    playerCard.classList.remove('dragging');
                });

                // 기존 클릭 이벤트도 유지
                playerCard.addEventListener('click', () => {
                    this.selectPlayer(playerCard, playerId, player);
                });
            }

            playersGrid.appendChild(playerCard);
        });
    }

    selectPlayer(card, playerId, playerFile) {
        // 이전 선택 해제
        document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
        
        // 새로운 선택
        card.classList.add('selected');
        this.selectedPlayer = {
            id: playerId,
            file: playerFile,
            position: this.currentPosition
        };
    }

    assignPlayer(emptySlot) {
        if (!this.selectedPlayer) {
            alert('먼저 아래에서 선수를 선택해주세요!');
            return;
        }

        const position = emptySlot.dataset.position;
        
        // 선택된 포지션과 슬롯 포지션이 일치하는지 확인
        if (this.selectedPlayer.position !== position) {
            alert(`${this.getPositionName(position)} 포지션에는 ${this.getPositionName(this.selectedPlayer.position)} 선수를 배치할 수 없습니다!`);
            return;
        }

        const teamElement = emptySlot.closest('.team');
        const teamId = parseInt(teamElement.dataset.team);
        
        // 팀에 이미 해당 포지션 선수가 있는지 확인
        if (this.teams[teamId].players[position]) {
            alert('이미 해당 포지션에 선수가 있습니다!');
            return;
        }

        // 선수 배치
        this.teams[teamId].players[position] = {
            file: this.selectedPlayer.file,
            id: this.selectedPlayer.id
        };

        // 사용된 선수 목록에 추가
        this.usedPlayers.add(this.selectedPlayer.id);

        // UI 업데이트
        this.updateSlot(emptySlot, this.selectedPlayer);
        this.renderPlayers();
        this.selectedPlayer = null;
        this.saveToStorage(); // 선수 배치 시 저장
    }

    assignPlayerByDrop(emptySlot, playerData) {
        const position = emptySlot.dataset.position;
        
        // 선택된 포지션과 슬롯 포지션이 일치하는지 확인
        if (playerData.position !== position) {
            alert(`${this.getPositionName(position)} 포지션에는 ${this.getPositionName(playerData.position)} 선수를 배치할 수 없습니다!`);
            return;
        }

        const teamElement = emptySlot.closest('.team');
        const teamId = parseInt(teamElement.dataset.team);
        
        // 팀에 이미 해당 포지션 선수가 있는지 확인
        if (this.teams[teamId].players[position]) {
            alert('이미 해당 포지션에 선수가 있습니다!');
            return;
        }

        // 선수 배치
        this.teams[teamId].players[position] = {
            file: playerData.file,
            id: playerData.id
        };

        // 사용된 선수 목록에 추가
        this.usedPlayers.add(playerData.id);

        // UI 업데이트
        this.updateSlot(emptySlot, playerData);
        this.renderPlayers();
        this.saveToStorage(); // 드롭으로 선수 배치 시 저장
    }

    updateSlot(slot, player) {
        const positionSlot = slot.closest('.position-slot');
        const scoreInput = positionSlot.querySelector('.position-score');
        
        // 새로운 컨테이너 생성
        const playerContainer = document.createElement('div');
        playerContainer.className = 'player-container';
        
        const img = document.createElement('img');
        img.src = `${player.position}/${player.file}`;
        img.className = 'player-img';
        img.alt = '선수';
        
        // 선수 이름 표시
        const nameLabel = document.createElement('div');
        nameLabel.className = 'player-name-label';
        nameLabel.textContent = this.getPlayerName(player.file);
        
        // 클릭 시 선수 제거 (확인 없이)
        img.addEventListener('click', () => {
            this.removePlayer(positionSlot, player);
        });

        playerContainer.appendChild(img);
        playerContainer.appendChild(nameLabel);
        
        // 빈 슬롯만 제거하고 선수 컨테이너로 교체
        slot.remove();
        positionSlot.insertBefore(playerContainer, scoreInput);
    }

    removePlayer(slot, player) {
        const teamElement = slot.closest('.team');
        const teamId = parseInt(teamElement.dataset.team);
        const position = player.position;

        // 현재 포지션 점수 가져오기 (팀 포인트 복원을 위해)
        const scoreInput = slot.querySelector('.position-score');
        const currentScore = parseInt(scoreInput?.value) || 0;

        // 팀에서 선수 제거
        this.teams[teamId].players[position] = null;

        // 사용된 선수 목록에서 제거
        this.usedPlayers.delete(player.id);

        // 선수 이미지와 이름만 제거하고 빈 슬롯으로 복원
        const playerContainer = slot.querySelector('.player-container');
        if (playerContainer) {
            playerContainer.remove();
        }

        // 빈 슬롯이 없다면 추가 (HTML에 원래 있어야 하는 구조)
        if (!slot.querySelector('.empty-slot')) {
            const emptySlotHtml = `<div class="empty-slot" data-position="${position}">${this.getPositionName(position)}</div>`;
            slot.insertAdjacentHTML('afterbegin', emptySlotHtml);
        }

        // 포지션 점수 입력란이 있다면 값만 0으로 초기화
        if (position !== 'jgl' && scoreInput) {
            scoreInput.value = '0';
            scoreInput.dataset.oldValue = '0';

            // 팀 포인트 복원 (이전 점수만큼 다시 추가)
            const pointsInput = teamElement.querySelector('.points-input');
            const currentPoints = parseInt(pointsInput.value) || 0;
            const restoredPoints = Math.min(1000, currentPoints + currentScore);
            pointsInput.value = restoredPoints;

            console.log(`[팀 ${teamId}] 선수 제거: ${position} 포지션 점수 ${currentScore} → 0, 팀 포인트 ${currentPoints} → ${restoredPoints} (+${currentScore})`);
        }

        this.renderPlayers();
        this.saveToStorage(); // 선수 제거 시 저장
    }

    // 팀 위치 무작위 섞기
    randomizeTeamPositions() {
        if (confirm('팀들의 위치를 무작위로 섞으시겠습니까? (선수 배치는 유지됩니다)')) {
            // 현재 모든 팀 DOM 요소들을 수집
            const teamElements = Array.from(document.querySelectorAll('.team'));
            const teamsContainer = document.querySelector('.teams-container');
            
            // 각 팀의 현재 데이터와 DOM을 함께 저장
            const teamDataWithDOM = teamElements.map(teamElement => {
                const teamId = parseInt(teamElement.dataset.team);
                return {
                    element: teamElement.cloneNode(true), // DOM 요소 복사
                    data: { ...this.teams[teamId] } // 데이터 복사
                };
            });
            
            // Fisher-Yates 셔플 알고리즘으로 배열 섞기
            for (let i = teamDataWithDOM.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [teamDataWithDOM[i], teamDataWithDOM[j]] = [teamDataWithDOM[j], teamDataWithDOM[i]];
            }
            
            // 기존 팀들 제거
            teamElements.forEach(element => element.remove());
            
            // 섞인 순서로 팀 데이터 업데이트 및 DOM 재배치
            teamDataWithDOM.forEach((teamInfo, index) => {
                // 데이터 업데이트 (새로운 위치 인덱스로)
                this.teams[index] = {
                    ...teamInfo.data,
                    id: index
                };
                
                // DOM 요소의 data-team 속성 업데이트
                teamInfo.element.dataset.team = index.toString();
                
                // 내 팀 버튼의 data-team 속성도 업데이트
                const myTeamBtn = teamInfo.element.querySelector('.my-team-btn');
                if (myTeamBtn) {
                    myTeamBtn.dataset.team = index.toString();
                }
                
                // 팀 컨테이너에 추가
                teamsContainer.appendChild(teamInfo.element);
            });
            
            // 이벤트 리스너 재설정
            this.reattachEventListeners();
            
            // 변경사항 저장
            this.saveToStorage();
            
            console.log('팀 위치가 무작위로 섞였습니다.');
        }
    }

    // 팀 표시 업데이트
    updateTeamDisplay() {
        // 모든 팀 컨테이너 찾기
        const teamElements = document.querySelectorAll('.team');
        
        teamElements.forEach((teamElement, index) => {
            const teamData = this.teams[index];
            
            // 팀 포인트 업데이트
            const pointsInput = teamElement.querySelector('.points-input');
            if (pointsInput) {
                const currentPoints = parseInt(pointsInput.value) || 1000;
                // 포인트는 현재 값 유지 (섞기는 위치만 바뀜)
            }
            
            // 선수 배치 업데이트
            ['top', 'mid', 'bot', 'sup'].forEach(position => {
                const positionSlot = teamElement.querySelector(`.position-slot.${position}`);
                const player = teamData.players[position];
                
                if (positionSlot) {
                    // 기존 선수 컨테이너 제거
                    const existingContainer = positionSlot.querySelector('.player-container');
                    if (existingContainer) {
                        existingContainer.remove();
                    }
                    
                    // 빈 슬롯이 없다면 추가
                    if (!positionSlot.querySelector('.empty-slot')) {
                        const emptySlotHtml = `<div class="empty-slot" data-position="${position}">${this.getPositionName(position)}</div>`;
                        positionSlot.insertAdjacentHTML('afterbegin', emptySlotHtml);
                    }
                    
                    // 선수가 있다면 배치
                    if (player) {
                        const emptySlot = positionSlot.querySelector('.empty-slot');
                        if (emptySlot) {
                            this.updateSlot(emptySlot, {
                                file: player.file,
                                position: position,
                                id: player.id
                            });
                        }
                    }
                }
            });
        });
        
        // 선수 목록 다시 렌더링 (사용된 선수 상태 업데이트)
        this.renderPlayers();
        
        // 이벤트 리스너 재설정
        this.reattachEventListeners();
    }

    resetAllTeams() {
        if (confirm('모든 팀을 리셋하시겠습니까? (선수 배치와 포인트가 초기화됩니다)')) {
            // 팀 데이터 리셋
            this.teams.forEach(team => {
                team.players = { top: null, mid: null, bot: null, sup: null };
            });

            // 사용된 선수 목록 리셋
            this.usedPlayers.clear();

            // 포인트 리셋
            document.querySelectorAll('.points-input').forEach(input => {
                input.value = 1000;
            });

            // 모든 슬롯을 빈 슬롯으로 복원
            document.querySelectorAll('.position-slot:not(.jgl)').forEach(slot => {
                // 슬롯 내용을 완전히 초기화
                const positionClasses = ['top', 'mid', 'bot', 'sup'];
                let position = null;
                
                for (const pos of positionClasses) {
                    if (slot.classList.contains(pos)) {
                        position = pos;
                        break;
                    }
                }
                
                if (position) {
                    // 기존 점수 입력란 찾기
                    const existingScoreInput = slot.querySelector('.position-score');
                    
                    // 슬롯 내용 완전히 초기화
                    slot.innerHTML = '';
                    
                    // 빈 슬롯 생성
                    const emptySlotHtml = `<div class="empty-slot" data-position="${position}">${this.getPositionName(position)}</div>`;
                    slot.insertAdjacentHTML('beforeend', emptySlotHtml);
                    
                    // 점수 입력란 하나만 생성
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

            this.selectedPlayer = null;
            this.renderPlayers();
            
            // 이벤트 리스너 재설정 (새로 생성된 입력 필드들에 대해)
            this.setupPositionScoreEvents();
            
            this.saveToStorage(); // 리셋 후 저장
        }
    }

    getPositionName(position) {
        const positionNames = {
            top: '탑',
            mid: '미드',
            bot: '원딜',
            sup: '서포터'
        };
        return positionNames[position] || position;
    }

    getPlayerName(filename) {
        // .gif 확장자 제거하여 한글 이름 반환
        return filename.replace('.gif', '');
    }

    // 로컬 스토리지에 데이터 저장
    saveToStorage() {
        try {
            const gameData = {
                teams: this.teams,
                usedPlayers: Array.from(this.usedPlayers),
                teamPoints: this.getTeamPoints(),
                positionScores: this.getPositionScores(),
                timestamp: new Date().getTime()
            };
            localStorage.setItem('lol-team-builder', JSON.stringify(gameData));
        } catch (error) {
            console.log('저장 실패:', error);
        }
    }

    // 로컬 스토리지에서 데이터 로드
    loadFromStorage() {
        try {
            const savedData = localStorage.getItem('lol-team-builder');
            if (savedData) {
                const gameData = JSON.parse(savedData);
                
                // 팀 데이터 복원
                if (gameData.teams) {
                    this.teams = gameData.teams;
                }
                
                // 사용된 선수 목록 복원
                if (gameData.usedPlayers) {
                    this.usedPlayers = new Set(gameData.usedPlayers);
                }
                
                // UI 복원은 init 이후에 실행
                setTimeout(() => {
                    this.restoreUI(gameData);
                }, 100);
            }
        } catch (error) {
            console.log('로드 실패:', error);
        }
    }

    // UI 상태 복원
    restoreUI(gameData) {
        // 팀 포인트 복원
        if (gameData.teamPoints) {
            gameData.teamPoints.forEach((points, teamId) => {
                const pointsInput = document.querySelector(`[data-team="${teamId}"] .points-input`);
                if (pointsInput) {
                    pointsInput.value = points;
                }
            });
        }

        // 포지션 점수 복원
        if (gameData.positionScores) {
            gameData.positionScores.forEach(scoreData => {
                const slot = document.querySelector(`[data-team="${scoreData.teamId}"] .position-slot.${scoreData.position} .position-score`);
                if (slot) {
                    slot.value = scoreData.score;
                    slot.dataset.oldValue = scoreData.score;
                }
            });
        }

        // 선수 배치 복원
        this.teams.forEach((team, teamId) => {
            Object.keys(team.players).forEach(position => {
                const player = team.players[position];
                if (player) {
                    const slot = document.querySelector(`[data-team="${teamId}"] .position-slot.${position}`);
                    if (slot) {
                        const emptySlot = slot.querySelector('.empty-slot');
                        if (emptySlot) {
                            this.updateSlot(emptySlot, {
                                file: player.file,
                                position: position,
                                id: player.id
                            });
                        }
                    }
                }
            });
        });

        // 선수 목록 다시 렌더링
        this.renderPlayers();
    }

    // 현재 팀 포인트 수집
    getTeamPoints() {
        const points = [];
        document.querySelectorAll('.points-input').forEach((input, index) => {
            points[index] = parseInt(input.value) || 1000;
        });
        return points;
    }

    // 현재 포지션 점수 수집
    getPositionScores() {
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

    setupDragAndDrop() {
        if (!this.isEditMode) return;
        
        // 기존 이벤트 리스너 제거를 위해 새로 생성
        const teams = document.querySelectorAll('.team');
        
        teams.forEach(team => {
            // 기존 이벤트 리스너들을 정리하고 새로 등록
            const newTeam = team.cloneNode(true);
            team.parentNode.replaceChild(newTeam, team);
        });

        // 새로 생성된 팀 요소들에 이벤트 등록
        const newTeams = document.querySelectorAll('.team');
        
        newTeams.forEach(team => {
            team.addEventListener('dragstart', (e) => {
                if (!this.isEditMode) {
                    e.preventDefault();
                    return;
                }
                team.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', team.dataset.team);
            });

            team.addEventListener('dragend', () => {
                team.classList.remove('dragging');
                this.clearDragOverStyles();
            });

            team.addEventListener('dragover', (e) => {
                if (!this.isEditMode) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                team.classList.add('drag-over');
            });

            team.addEventListener('dragleave', () => {
                team.classList.remove('drag-over');
            });

            team.addEventListener('drop', (e) => {
                if (!this.isEditMode) return;
                e.preventDefault();
                const draggedTeamId = e.dataTransfer.getData('text/plain');
                const targetTeamId = team.dataset.team;
                
                if (draggedTeamId && targetTeamId && draggedTeamId !== targetTeamId) {
                    this.swapTeams(draggedTeamId, targetTeamId);
                }
                
                this.clearDragOverStyles();
            });

            // 내 팀 버튼 이벤트 재등록
            const myTeamBtn = team.querySelector('.my-team-btn');
            if (myTeamBtn) {
                myTeamBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const teamId = parseInt(myTeamBtn.dataset.team);
                    this.selectMyTeam(teamId);
                });
            }
        });
    }

    clearDragOverStyles() {
        document.querySelectorAll('.team').forEach(team => {
            team.classList.remove('drag-over');
        });
    }

    swapTeams(teamId1, teamId2) {
        const team1 = document.querySelector(`[data-team="${teamId1}"]`);
        const team2 = document.querySelector(`[data-team="${teamId2}"]`);
        
        if (!team1 || !team2) {
            console.error('팀 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 팀 데이터 교환
        const tempData = { ...this.teams[teamId1] };
        this.teams[teamId1] = { ...this.teams[teamId2] };
        this.teams[teamId2] = tempData;
        
        // 팀 ID 업데이트
        this.teams[teamId1].id = parseInt(teamId1);
        this.teams[teamId2].id = parseInt(teamId2);
        
        // DOM 요소들의 내용 교환 (data-team 속성은 유지)
        const team1Content = team1.innerHTML;
        const team2Content = team2.innerHTML;
        
        team1.innerHTML = team2Content;
        team2.innerHTML = team1Content;
        
        // 드래그 앤 드롭 이벤트 재설정
        setTimeout(() => {
            this.setupDragAndDrop();
        }, 100);
    }

    highlightActivePositions(position) {
        // 모든 포지션 슬롯에서 active 클래스 제거
        document.querySelectorAll('.position-slot').forEach(slot => {
            slot.classList.remove('active');
        });

        // 선택된 포지션의 모든 슬롯에 active 클래스 추가
        document.querySelectorAll(`.position-slot.${position}`).forEach(slot => {
            slot.classList.add('active');
        });
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const editBtn = document.getElementById('teamEditBtn');
        const teamsContainer = document.querySelector('.teams-container');
        const teams = document.querySelectorAll('.team');
        
        if (this.isEditMode) {
            editBtn.textContent = '편집 완료';
            editBtn.classList.add('active');
            teamsContainer.classList.add('edit-mode');
            teams.forEach(team => {
                team.draggable = true;
            });
            this.setupDragAndDrop();
        } else {
            editBtn.textContent = '팀위치 수정';
            editBtn.classList.remove('active');
            teamsContainer.classList.remove('edit-mode');
            teams.forEach(team => {
                team.draggable = false;
            });
        }
    }

    selectMyTeam(teamId) {
        const teamsContainer = document.querySelector('.teams-container');
        const playersPanel = document.querySelector('.players-panel');
        const container = document.querySelector('.container');
        
        // 현재 모든 팀 요소들을 저장하고 복제 (DOM에서 제거되기 전에)
        const allTeams = Array.from(document.querySelectorAll('.team')).sort((a, b) => {
            return parseInt(a.dataset.team) - parseInt(b.dataset.team);
        }).map(team => team.cloneNode(true)); // 깊은 복사로 모든 내용 보존
        
        // 이전 선택 해제
        document.querySelectorAll('.my-team-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelectorAll('.team').forEach(team => {
            team.classList.remove('my-team', 'other-team');
            team.style.display = '';
        });

        // 기존 other-teams-container 제거
        const existingOtherContainer = document.querySelector('.other-teams-container');
        if (existingOtherContainer) {
            existingOtherContainer.remove();
        }
        
        if (this.selectedTeam === teamId) {
            // 같은 팀을 다시 클릭하면 선택 해제
            this.selectedTeam = null;
            teamsContainer.classList.remove('my-team-mode');
            playersPanel.classList.remove('in-grid');
            
            // 슬롯머신을 일반 모드 위치로 이동 (우측 하단)
            this.updateSlotMachinePosition(false);
            
            // 선수 선택 패널을 확실히 원래 위치로 복원
            if (this.originalPlayersPanelParent && playersPanel.parentNode !== this.originalPlayersPanelParent) {
                this.originalPlayersPanelParent.appendChild(playersPanel);
            }
            
            // teams-container 비우기
            teamsContainer.innerHTML = '';
            
            // 모든 팀들을 순서대로 다시 추가
            allTeams.forEach(team => {
                team.style.display = '';
                team.classList.remove('my-team', 'other-team');
                teamsContainer.appendChild(team);
            });
            
            // 이벤트 리스너 재설정
            this.reattachEventListeners();
        } else {
            // 새로운 팀 선택
            this.selectedTeam = teamId;
            
            // 레이아웃 변경
            teamsContainer.classList.add('my-team-mode');
            playersPanel.classList.add('in-grid');
            
            // 슬롯머신을 내 팀 모드 위치로 이동 (좌측 상단)
            this.updateSlotMachinePosition(true);
            
            // 선택된 팀과 나머지 팀들 분리
            const selectedTeam = allTeams.find(team => parseInt(team.dataset.team) === teamId);
            const otherTeams = allTeams.filter(team => parseInt(team.dataset.team) !== teamId);
            
            // teams-container 비우기
            teamsContainer.innerHTML = '';
            
            // 선택된 팀 추가
            selectedTeam.classList.add('my-team');
            selectedTeam.classList.remove('other-team');
            teamsContainer.appendChild(selectedTeam);
            
            // 나머지 팀들을 위한 컨테이너 생성
            const otherTeamsContainer = document.createElement('div');
            otherTeamsContainer.className = 'other-teams-container';
            
            // 나머지 팀들 추가 (모든 5개 팀 표시)
            otherTeams.forEach((team, index) => {
                team.classList.add('other-team');
                team.classList.remove('my-team');
                team.style.display = '';
                otherTeamsContainer.appendChild(team);
            });
            
            teamsContainer.appendChild(otherTeamsContainer);
            
            // 선수 선택 패널을 other-teams-container에 추가
            otherTeamsContainer.appendChild(playersPanel);
            
            // 이벤트 리스너 재설정
            this.reattachEventListeners();
            
            // 선택된 팀 버튼 활성화
            const selectedBtn = teamsContainer.querySelector(`[data-team="${teamId}"].my-team-btn`);
            if (selectedBtn) {
                selectedBtn.classList.add('selected');
            }
        }
    }

    // 이벤트 리스너 재설정 함수
    reattachEventListeners() {
        // 빈 슬롯 클릭 이벤트 재설정
        document.querySelectorAll('.empty-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                this.assignPlayer(e.target);
            });
        });

        // 내 팀 선택 이벤트 재설정
        document.querySelectorAll('.my-team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const teamId = parseInt(btn.dataset.team);
                this.selectMyTeam(teamId);
            });
        });

        // 플레이어 이미지 클릭 이벤트 재설정
        document.querySelectorAll('.player-img').forEach(img => {
            if (!img.classList.contains('fixed')) {
                img.addEventListener('click', (e) => {
                    const slot = e.target.closest('.position-slot');
                    const teamElement = slot.closest('.team');
                    const teamId = parseInt(teamElement.dataset.team);
                    
                    // position-slot에서 data-position 찾기
                    let position = null;
                    const emptySlot = slot.querySelector('.empty-slot');
                    if (emptySlot) {
                        position = emptySlot.dataset.position;
                    } else {
                        // position-slot의 클래스에서 포지션 추출
                        const positionClasses = ['top', 'mid', 'bot', 'sup'];
                        for (const pos of positionClasses) {
                            if (slot.classList.contains(pos)) {
                                position = pos;
                                break;
                            }
                        }
                    }
                    
                    if (position) {
                        const player = this.teams[teamId].players[position];
                        if (player) {
                            this.removePlayer(slot, player);
                        }
                    }
                });
            }
        });

        // 드래그 앤 드롭 이벤트 재설정
        document.querySelectorAll('.empty-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                try {
                    const jsonData = e.dataTransfer.getData('application/json');
                    if (jsonData) {
                        const playerData = JSON.parse(jsonData);
                        this.assignPlayerByDrop(slot, playerData);
                    }
                } catch (error) {
                    console.log('드롭 데이터 파싱 실패:', error);
                }
            });
        });

        // 포지션 점수 입력 이벤트 재설정
        this.setupPositionScoreEvents();

        // 포인트 입력 변경 이벤트 재설정
        this.setupTeamPointsEvents();
    }

    // 슬롯머신 기능
    startSlotMachine() {
        const slotBtn = document.getElementById('slotMachineBtn');
        const slotReel = document.getElementById('slot-reel');
        const slotResult = document.getElementById('slotResult');
        
        // 할당되지 않은 선수들 수집
        const unassignedPlayers = this.getUnassignedPlayers();
        
        if (unassignedPlayers.length === 0) {
            slotResult.innerHTML = '<p style="color: #e74c3c;">할당되지 않은 선수가 없습니다!</p>';
            return;
        }
        
        // 버튼 비활성화
        slotBtn.disabled = true;
        slotBtn.textContent = '추첨 중...';
        
        // 결과 초기화
        slotResult.innerHTML = '<p>선수를 뽑는 중...</p>';
        slotResult.classList.remove('winner');
        
        // 초기 연속 아이템 표시
        this.initializeSlotReel(unassignedPlayers);
        
        // 슬롯머신 애니메이션 시작 (상하 방향 블러 효과 포함)
        slotReel.classList.add('spinning');
        // 기존 감속 클래스 제거
        slotReel.classList.remove('slowing-1', 'slowing-2', 'slowing-3', 'slowing-4', 'slowing-5');
        
        // 인라인 스타일로 블러 강제 적용 (이미지와 텍스트에만)
        const slotItems = slotReel.querySelectorAll('.slot-item img, .slot-item span');
        slotItems.forEach(item => {
            item.style.filter = 'blur(2px)';
            item.style.webkitFilter = 'blur(2px)';
        });
        
        // 총 0.75초 애니메이션 (절반으로 단축)
        const totalDuration = 750; // 1.5초에서 0.75초로 단축
        const fastPhaseEnd = 500; // 0.5초까지는 빠른 회전
        const slowPhaseStart = 500; // 0.5초부터 감속 시작
        
        let startTime = Date.now();
        let isSlowing = false;
        
        // 빠른 회전 단계 (속도 30% 감소)
        const fastSpinInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= fastPhaseEnd && !isSlowing) {
                isSlowing = true;
                clearInterval(fastSpinInterval);
                this.startSlowingPhase(unassignedPlayers, slotReel, slotBtn, slotResult, startTime, totalDuration);
                return;
            }
            
            // 랜덤 선수 표시
            const randomPlayer = unassignedPlayers[Math.floor(Math.random() * unassignedPlayers.length)];
            this.updateSlotDisplay(randomPlayer);
        }, 70); // 빠른 회전 속도 (시간 단축으로 인해 속도 증가)
    }
    
    // 감속 단계 (easing-in 효과 + 점진적 블러 제거)
    startSlowingPhase(unassignedPlayers, slotReel, slotBtn, slotResult, startTime, totalDuration) {
        let lastUpdate = Date.now();
        let baseInterval = 100; // 기본 감속 간격 (시간 단축으로 인해 조정)
        
        const slowSpin = () => {
            const elapsed = Date.now() - startTime;
            const remainingTime = totalDuration - elapsed;
            
            if (elapsed >= totalDuration) {
                // 최종 완료
                this.finishSlotMachine(unassignedPlayers, slotReel, slotBtn, slotResult);
                return;
            }
            
            // easing-in 계산 (점점 더 느워짐)
            const slowProgress = (elapsed - 500) / 250; // 0~1 (감속 구간에서의 진행도, 0.25초 구간)
            const easingFactor = slowProgress * slowProgress * slowProgress; // cubic easing-in
            const currentInterval = baseInterval + (easingFactor * 200); // 130ms에서 390ms까지 점진적 증가 (30% 느려짐)
            
            // 속도에 따른 블러 단계 적용
            this.updateBlurBySpeed(slotReel, slowProgress);
            
            // 랜덤 선수 표시
            const randomPlayer = unassignedPlayers[Math.floor(Math.random() * unassignedPlayers.length)];
            this.updateSlotDisplay(randomPlayer);
            
            // 다음 업데이트 스케줄링
            setTimeout(slowSpin, currentInterval);
        };
        
        slowSpin();
    }
    
    // 속도에 따른 블러 효과 업데이트
    updateBlurBySpeed(slotReel, slowProgress) {
        // 기존 감속 클래스 제거
        slotReel.classList.remove('slowing-1', 'slowing-2', 'slowing-3', 'slowing-4', 'slowing-5');
        
        // 감속 진행도에 따라 블러 단계 적용 (이미지와 텍스트에만)
        let blurValue;
        if (slowProgress > 0.8) {
            slotReel.classList.add('slowing-5'); // 거의 멈춤 - 최소 블러
            blurValue = '0.1px';
        } else if (slowProgress > 0.6) {
            slotReel.classList.add('slowing-4');
            blurValue = '0.3px';
        } else if (slowProgress > 0.4) {
            slotReel.classList.add('slowing-3');
            blurValue = '0.5px';
        } else if (slowProgress > 0.2) {
            slotReel.classList.add('slowing-2');
            blurValue = '1px';
        } else {
            slotReel.classList.add('slowing-1'); // 초기 감속 - 최대 블러
            blurValue = '1.5px';
        }
        
        // 인라인 스타일로 블러 강제 적용 (이미지와 텍스트에만)
        const slotItems = slotReel.querySelectorAll('.slot-item img, .slot-item span');
        slotItems.forEach(item => {
            item.style.filter = `blur(${blurValue})`;
            item.style.webkitFilter = `blur(${blurValue})`;
        });
    }
    
    // 슬롯머신 완료
    finishSlotMachine(unassignedPlayers, slotReel, slotBtn, slotResult) {
        // 최종 선수 선택
        const finalPlayer = unassignedPlayers[Math.floor(Math.random() * unassignedPlayers.length)];
        
        // 애니메이션 종료 (모든 블러 효과 제거)
        slotReel.classList.remove('spinning', 'slowing-1', 'slowing-2', 'slowing-3', 'slowing-4', 'slowing-5');
        
        // 인라인 스타일로 블러 완전 제거 (이미지와 텍스트에서)
        const slotItems = slotReel.querySelectorAll('.slot-item img, .slot-item span');
        slotItems.forEach(item => {
            item.style.filter = 'none';
            item.style.webkitFilter = 'none';
        });
        
        // 최종 선수만 표시 (애니메이션 없이)
        slotReel.innerHTML = `
            <div class="slot-item" style="top: 0px;">
                <img src="${finalPlayer.position}/${finalPlayer.file}" alt="${finalPlayer.name}">
                <span>${finalPlayer.name}</span>
            </div>
        `;
        
        // 결과 표시
        slotResult.innerHTML = `<p><strong>${finalPlayer.name}</strong> (${this.getPositionName(finalPlayer.position)}) 당첨!</p>`;
        slotResult.classList.add('winner');
        
        // 버튼 활성화
        slotBtn.disabled = false;
        slotBtn.textContent = '선수 추첨';
        
        console.log('슬롯머신 결과:', finalPlayer);
    }
    
    // 슬롯 릴 초기화 (연속적인 아이템 표시)
    initializeSlotReel(unassignedPlayers) {
        const slotReel = document.getElementById('slot-reel');
        const items = [];
        
        // 3개의 랜덤 아이템을 세로로 배치
        for (let i = 0; i < 3; i++) {
            const randomPlayer = unassignedPlayers[Math.floor(Math.random() * unassignedPlayers.length)];
            items.push(`
                <div class="slot-item" style="top: ${i * 110}px;">
                    <img src="${randomPlayer.position}/${randomPlayer.file}" alt="${randomPlayer.name}">
                    <span>${randomPlayer.name}</span>
                </div>
            `);
        }
        
        slotReel.innerHTML = items.join('');
    }
    
    // 슬롯 디스플레이 업데이트 - 연속적인 스크롤 효과
    updateSlotDisplay(player) {
        const slotReel = document.getElementById('slot-reel');
        
        // 현재 표시할 선수와 다음에 올 선수들을 준비
        const unassignedPlayers = this.getUnassignedPlayers();
        const currentIndex = unassignedPlayers.findIndex(p => p.id === player.id);
        
        // 3개의 연속된 아이템을 표시 (현재, 다음, 그 다음)
        const items = [];
        for (let i = 0; i < 3; i++) {
            const index = (currentIndex + i) % unassignedPlayers.length;
            const p = unassignedPlayers[index];
            items.push(`
                <div class="slot-item" style="top: ${i * 110}px;">
                    <img src="${p.position}/${p.file}" alt="${p.name}">
                    <span>${p.name}</span>
                </div>
            `);
        }
        
        slotReel.innerHTML = items.join('');
    }
    
    // 할당되지 않은 선수들 수집
    getUnassignedPlayers() {
        const unassignedPlayers = [];
        
        // 모든 포지션의 모든 선수들을 확인
        Object.keys(this.players).forEach(position => {
            this.players[position].forEach(playerFile => {
                const playerId = `${position}_${playerFile}`;
                if (!this.usedPlayers.has(playerId)) {
                    unassignedPlayers.push({
                        id: playerId,
                        file: playerFile,
                        position: position,
                        name: this.getPlayerName(playerFile)
                    });
                }
            });
        });
        
        return unassignedPlayers;
    }

    // 슬롯머신 위치 업데이트
    updateSlotMachinePosition(isMyTeamMode) {
        const slotMachineSection = document.querySelector('.slot-machine-section');
        if (!slotMachineSection) return;

        if (isMyTeamMode) {
            // 내 팀 모드: 화면 가운데로 이동
            // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 크기 계산
            setTimeout(() => {
                const viewportWidth = document.documentElement.clientWidth;
                const viewportHeight = document.documentElement.clientHeight;
                
                // 슬롯머신 크기 정확히 계산
                const rect = slotMachineSection.getBoundingClientRect();
                const slotWidth = rect.width || slotMachineSection.offsetWidth || 200;
                const slotHeight = rect.height || slotMachineSection.offsetHeight || 300;
                
                const centerX = Math.max(0, (viewportWidth - slotWidth) / 2);
                const centerY = Math.max(0, (viewportHeight - slotHeight) / 2);
                
                slotMachineSection.style.left = centerX + 'px';
                slotMachineSection.style.top = centerY + 'px';
                slotMachineSection.style.right = 'auto';
                slotMachineSection.style.bottom = 'auto';
                
                console.log(`내팀 모드: 슬롯머신을 중앙으로 이동 (${centerX}, ${centerY})`);
            }, 100);
            
            // 내팀 모드에서는 저장된 위치 무시하고 가운데 고정
            localStorage.removeItem('slotMachinePosition');
        } else {
            // 일반 모드: 저장된 위치가 있으면 복원, 없으면 우측 하단
            const savedPosition = localStorage.getItem('slotMachinePosition');
            if (savedPosition) {
                this.loadSlotMachinePosition();
            } else {
                // 기본 위치: 우측 하단
                slotMachineSection.style.top = 'auto';
                slotMachineSection.style.left = 'auto';
                slotMachineSection.style.bottom = '20px';
                slotMachineSection.style.right = '20px';
            }
        }
    }

    // 슬롯머신 드래그 기능 설정
    setupSlotMachineDrag() {
        const slotMachineSection = document.querySelector('.slot-machine-section');
        if (!slotMachineSection) return;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        slotMachineSection.addEventListener('mousedown', (e) => {
            // 슬롯머신 버튼 클릭 시에는 드래그 방지
            if (e.target.classList.contains('slot-machine-btn') || 
                e.target.closest('.slot-machine-btn')) {
                return;
            }

            isDragging = true;
            
            // 마우스 시작 위치
            startX = e.clientX;
            startY = e.clientY;
            
            // 현재 슬롯머신의 실제 위치 가져오기 (getBoundingClientRect 사용)
            const rect = slotMachineSection.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            // 디버깅 정보 출력
            console.log(`드래그 시작: startX=${startX}, startY=${startY}, initialLeft=${initialLeft}, initialTop=${initialTop}`);

            slotMachineSection.classList.add('dragging');
            
            // 드래그 중에는 transition 비활성화
            slotMachineSection.style.transition = 'none';
            
            // CSS 위치를 left, top으로 고정
            slotMachineSection.style.left = initialLeft + 'px';
            slotMachineSection.style.top = initialTop + 'px';
            slotMachineSection.style.right = 'auto';
            slotMachineSection.style.bottom = 'auto';
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // 마우스 이동 거리 계산
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // 새로운 위치 계산
            const newX = initialLeft + deltaX;
            const newY = initialTop + deltaY;

            // 화면 경계 체크 (개발자 도구 영향 없는 실제 뷰포트 크기 사용)
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;
            const maxX = viewportWidth - slotMachineSection.offsetWidth;
            const maxY = viewportHeight - slotMachineSection.offsetHeight;

            // 경계 체크: 화면 밖으로 나가지 않도록 제한
            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));

            // 디버깅 정보 출력 (문제 해결 후 제거 예정)
            if (Math.abs(deltaX) > 5) { // 의미있는 움직임만 로그
                console.log(`드래그 중: newX=${newX}, clampedX=${clampedX}, deltaX=${deltaX}, startX=${startX}, clientX=${e.clientX}`);
            }

            // 위치 설정
            slotMachineSection.style.left = clampedX + 'px';
            slotMachineSection.style.top = clampedY + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            isDragging = false;
            slotMachineSection.classList.remove('dragging');
            
            // 드래그 완료 후 transition 다시 활성화
            slotMachineSection.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            
            // 현재 위치를 로컬 스토리지에 저장
            this.saveSlotMachinePosition();
        });

        // 터치 이벤트 지원 (모바일)
        slotMachineSection.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('slot-machine-btn') || 
                e.target.closest('.slot-machine-btn')) {
                return;
            }

            const touch = e.touches[0];
            isDragging = true;
            
            // 터치 시작 위치
            startX = touch.clientX;
            startY = touch.clientY;
            
            // 현재 슬롯머신의 실제 위치 가져오기
            const computedStyle = window.getComputedStyle(slotMachineSection);
            initialLeft = parseInt(computedStyle.left) || 0;
            initialTop = parseInt(computedStyle.top) || 0;

            slotMachineSection.classList.add('dragging');
            slotMachineSection.style.transition = 'none';
            
            // CSS 위치를 left, top으로 고정
            slotMachineSection.style.left = initialLeft + 'px';
            slotMachineSection.style.top = initialTop + 'px';
            slotMachineSection.style.right = 'auto';
            slotMachineSection.style.bottom = 'auto';
            
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            const touch = e.touches[0];
            
            // 터치 이동 거리 계산
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;

            // 새로운 위치 계산
            const newX = initialLeft + deltaX;
            const newY = initialTop + deltaY;

            // 화면 경계 체크 (개발자 도구 영향 없는 실제 뷰포트 크기 사용)
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;
            const maxX = viewportWidth - slotMachineSection.offsetWidth;
            const maxY = viewportHeight - slotMachineSection.offsetHeight;

            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));

            slotMachineSection.style.left = clampedX + 'px';
            slotMachineSection.style.top = clampedY + 'px';
        });

        document.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            isDragging = false;
            slotMachineSection.classList.remove('dragging');
            slotMachineSection.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            
            this.saveSlotMachinePosition();
        });

        // 저장된 위치 복원
        this.loadSlotMachinePosition();
    }

    // 슬롯머신 위치 저장
    saveSlotMachinePosition() {
        // 내팀 모드일 때는 위치 저장하지 않음
        if (this.selectedTeam !== null) {
            return;
        }

        const slotMachineSection = document.querySelector('.slot-machine-section');
        if (!slotMachineSection) return;

        const rect = slotMachineSection.getBoundingClientRect();
        const position = {
            left: rect.left,
            top: rect.top
        };

        localStorage.setItem('slotMachinePosition', JSON.stringify(position));
    }

    // 슬롯머신 위치 로드
    loadSlotMachinePosition() {
        const savedPosition = localStorage.getItem('slotMachinePosition');
        if (!savedPosition) return;

        try {
            const position = JSON.parse(savedPosition);
            const slotMachineSection = document.querySelector('.slot-machine-section');
            if (!slotMachineSection) return;

            // 화면 크기 변경에 대응하여 위치 조정 (개발자 도구 영향 없는 실제 뷰포트 크기 사용)
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;
            const maxX = viewportWidth - slotMachineSection.offsetWidth;
            const maxY = viewportHeight - slotMachineSection.offsetHeight;

            const clampedX = Math.max(0, Math.min(position.left, maxX));
            const clampedY = Math.max(0, Math.min(position.top, maxY));

            slotMachineSection.style.left = clampedX + 'px';
            slotMachineSection.style.top = clampedY + 'px';
            slotMachineSection.style.right = 'auto';
            slotMachineSection.style.bottom = 'auto';
        } catch (error) {
            console.error('슬롯머신 위치 로드 실패:', error);
        }
    }

    // 윈도우 리사이즈 시 슬롯머신 위치 조정
    adjustSlotMachinePositionOnResize() {
        const slotMachineSection = document.querySelector('.slot-machine-section');
        if (!slotMachineSection) return;

        // 현재 위치가 화면 밖으로 나갔는지 확인하고 조정
        const rect = slotMachineSection.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const maxX = viewportWidth - slotMachineSection.offsetWidth;
        const maxY = viewportHeight - slotMachineSection.offsetHeight;

        let needsAdjustment = false;
        let newX = rect.left;
        let newY = rect.top;

        if (rect.left > maxX) {
            newX = maxX;
            needsAdjustment = true;
        }
        if (rect.left < 0) {
            newX = 0;
            needsAdjustment = true;
        }
        if (rect.top > maxY) {
            newY = maxY;
            needsAdjustment = true;
        }
        if (rect.top < 0) {
            newY = 0;
            needsAdjustment = true;
        }

        if (needsAdjustment) {
            slotMachineSection.style.left = newX + 'px';
            slotMachineSection.style.top = newY + 'px';
            slotMachineSection.style.right = 'auto';
            slotMachineSection.style.bottom = 'auto';
            
            // 조정된 위치 저장
            this.saveSlotMachinePosition();
        }
    }
}

// CSS 스타일 추가
const style = document.createElement('style');
style.textContent = `
    .player-card.selected {
        background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%) !important;
        transform: scale(1.1) !important;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4) !important;
    }
`;
document.head.appendChild(style);

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    new TeamManager();
});
