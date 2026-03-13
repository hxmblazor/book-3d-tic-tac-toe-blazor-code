namespace TicTacToe.Engine;

/// <summary>
/// Represents the player state for each cell in the 3D Tic-Tac-Toe board
/// </summary>
public enum Player
{
    None = 0,
    X = 1,
    O = 2
}

/// <summary>
/// Immutable record for storing move history with timestamp
/// </summary>
public readonly record struct MoveRecord(int X, int Y, int Z, Player Player, DateTime Timestamp)
{
    // Auto-generated: Equals, GetHashCode, ToString, Deconstruction
    // Struct = stack allocation for better performance
}

/// <summary>
/// Serializable game state record for save/load functionality
/// </summary>
public record GameState(
    int Size,
    Player CurrentPlayer,
    bool IsGameOver,
    Player Winner,
    Player[][][] Board,
    IReadOnlyList<string> WinningPositions,
    List<MoveRecord> MoveHistory
);
