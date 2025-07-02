
// js/state.js

const state = {
    teams: [
        { id: 0, players: { top: null, mid: null, bot: null, sup: null } },
        { id: 1, players: { top: null, mid: null, bot: null, sup: null } },
        { id: 2, players: { top: null, mid: null, bot: null, sup: null } },
        { id: 3, players: { top: null, mid: null, bot: null, sup: null } },
        { id: 4, players: { top: null, mid: null, bot: null, sup: null } },
        { id: 5, players: { top: null, mid: null, bot: null, sup: null } }
    ],
    usedPlayers: new Set(),
    currentPosition: 'top',
    selectedPlayer: null,
    isEditMode: false,
    selectedTeam: null,
    originalPlayersPanelParent: null
};
