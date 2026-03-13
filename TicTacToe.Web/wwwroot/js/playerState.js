window.tttPlayerState = {
    getPlayerName: function () {
        return localStorage.getItem("ttt.playerName") || "";
    },

    setPlayerName: function (playerName) {
        if (!playerName || !playerName.trim()) {
            localStorage.removeItem("ttt.playerName");
            return;
        }

        localStorage.setItem("ttt.playerName", playerName.trim());
    }
};
