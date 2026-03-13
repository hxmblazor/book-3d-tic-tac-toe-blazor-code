using TicTacToe.Engine;

namespace TicTacToe.Web.Services;

/// <summary>
/// Scoped service to manage game state per user session
/// </summary>
public class GameSession
{
    public GameBoard Board { get; private set; }
    public bool IsSinglePlayer { get; set; }  // AI mode toggle
    public AiDifficulty Difficulty { get; set; } = AiDifficulty.Medium; // Default to medium
    public Player AiPlayer { get; set; } = Player.O; // Which side the AI plays
    public event Action? OnStateChanged;

    public GameSession()
    {
        Board = new GameBoard(3); // Default board size
    }

    public void StartNewGame(int size)
    {
        Board = new GameBoard(size);
        AiPlayer = Player.O;
        NotifyStateChanged();
    }

    public void ResetGame()
    {
        Board.Reset();
        AiPlayer = Player.O;
        NotifyStateChanged();
    }

    public bool MakeMove(int x, int y, int z)
    {
        bool success = Board.MakeMove(x, y, z);
        if (success) NotifyStateChanged();
        return success;
    }

    /// <summary>
    /// Async version that supports AI response (Chapter 9)
    /// </summary>
    public async Task<bool> MakeMoveAsync(int x, int y, int z)
    {
        bool success = Board.MakeMove(x, y, z);
        if (!success) return false;

        NotifyStateChanged();

        // AI response using pattern matching
        if (IsSinglePlayer && !Board.IsGameOver && Board.CurrentPlayer == AiPlayer)
        {
            await Task.Delay(500); // Simulate "thinking"

            var cpuMove = Board.GetComputerMove(Difficulty);

            // Pattern match to check valid move
            if (cpuMove is not (0, 0, 0))
            {
                Board.MakeMove(cpuMove.x, cpuMove.y, cpuMove.z);
                NotifyStateChanged();
            }
        }

        return true;
    }

    /// <summary>
    /// Lets the AI make the opening move as X on an empty board
    /// </summary>
    public async Task AiGoesFirstAsync()
    {
        if (Board.MoveHistory.Count > 0) return;

        AiPlayer = Player.X;
        var cpuMove = Board.GetComputerMove(Difficulty);
        if (cpuMove is not (0, 0, 0))
        {
            await Task.Delay(300); // Brief pause for visual feedback
            Board.MakeMove(cpuMove.x, cpuMove.y, cpuMove.z);
            NotifyStateChanged();
        }
    }

    private void NotifyStateChanged() => OnStateChanged?.Invoke();

    // Statistics
    public int GamesPlayed { get; private set; }
    public int PlayerXWins { get; private set; }
    public int PlayerOWins { get; private set; }
    public int Draws { get; private set; }

    public void RecordGameResult()
    {
        GamesPlayed++;
        if (Board.Winner == Player.X) PlayerXWins++;
        else if (Board.Winner == Player.O) PlayerOWins++;
        else Draws++;
    }

    // Save/Load functionality
    public string SerializeGame() => Board.SerializeGame();

    public void LoadGame(string jsonState)
    {
        Board = GameBoard.DeserializeGame(jsonState);
        NotifyStateChanged();
    }
}
