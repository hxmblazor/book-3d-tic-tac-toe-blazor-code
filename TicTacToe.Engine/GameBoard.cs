using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TicTacToe.Engine;

/// <summary>
/// AI difficulty levels (Chapter 9)
/// </summary>
public enum AiDifficulty
{
    Easy,       // Mostly random moves
    Medium,     // Blocks wins but doesn't seek them
    Hard        // Full heuristic (win > block > strategic)
}

/// <summary>
/// JSON serialization context for GameState - enables source generation
/// </summary>
[JsonSerializable(typeof(GameState))]
internal partial class GameStateContext : JsonSerializerContext { }

/// <summary>
/// Core game logic for 3D Tic-Tac-Toe
/// Supports board sizes from 3x3x3 to 5x5x5
/// </summary>
public class GameBoard(int size = 3)
{
    // Validation in primary constructor
    private readonly int _validatedSize = size is >= 3 and <= 5
        ? size
        : throw new ArgumentException("Board size must be between 3 and 5.", nameof(size));

    private readonly Player[,,] _board = new Player[size, size, size];
    private Player _currentPlayer = Player.X;
    private bool _gameOver = false;
    private List<string> _winningPositions = [];

    public int Size => _validatedSize;
    public Player CurrentPlayer => _currentPlayer;
    public bool IsGameOver => _gameOver;
    public Player Winner { get; private set; } = Player.None;
    public IReadOnlyList<string> WinningPositions => _winningPositions.AsReadOnly();
    
    // Move history using record type
    private List<MoveRecord> _moveHistory = [];
    public IReadOnlyList<MoveRecord> MoveHistory => _moveHistory;

    /// <summary>
    /// Gets the player at the specified position (1-based coordinates)
    /// </summary>
    public Player GetPlayer(int x, int y, int z)
    {
        if (!ValidateCoordinates(x, y, z))
            return Player.None;

        return _board[x - 1, y - 1, z - 1];
    }

    /// <summary>
    /// Makes a move at the specified position
    /// </summary>
    /// <returns>True if the move was successful</returns>
    public bool MakeMove(int x, int y, int z)
    {
        // Early returns with validation
        if (_gameOver) return false;
        if (!ValidateCoordinates(x, y, z)) return false;

        // Reference to array element with pattern matching
        ref Player cell = ref _board[x - 1, y - 1, z - 1];
        if (cell is not Player.None)
            return false;

        // Make the move
        cell = _currentPlayer;
        _moveHistory.Add(new MoveRecord(x, y, z, _currentPlayer, DateTime.UtcNow));

        // Check for victory
        if (CheckForWin(x, y, z))
        {
            _gameOver = true;
            Winner = _currentPlayer;
            return true;
        }

        // Check for draw
        if (CheckForDraw())
        {
            _gameOver = true;
            return true;
        }

        // Continue game - switch players using extension method
        _currentPlayer = _currentPlayer.Opponent();
        return true;
    }

    /// <summary>
    /// Resets the board to start a new game
    /// </summary>
    public void Reset()
    {
        // Clear board efficiently
        Array.Clear(_board);

        // Reset state
        _currentPlayer = Player.X;
        _gameOver = false;
        _winningPositions = [];
        _moveHistory = [];
        Winner = Player.None;
    }

    /// <summary>
    /// Validates that coordinates are within board boundaries (1-based)
    /// </summary>
    private bool ValidateCoordinates(int x, int y, int z) =>
        x >= 1 && x <= Size &&
        y >= 1 && y <= Size &&
        z >= 1 && z <= Size;

    /// <summary>
    /// Generates all 26 possible directions in 3D space
    /// </summary>
    private List<(int dx, int dy, int dz)> GetAllDirections()
    {
        List<(int dx, int dy, int dz)> directions = [];

        for (int dx = -1; dx <= 1; dx++)
        {
            for (int dy = -1; dy <= 1; dy++)
            {
                for (int dz = -1; dz <= 1; dz++)
                {
                    // Skip (0,0,0) — that's the origin
                    if (dx != 0 || dy != 0 || dz != 0)
                        directions.Add((dx, dy, dz));
                }
            }
        }

        return directions;
    }

    /// <summary>
    /// Checks if the last move created a winning line using vector scanning
    /// </summary>
    private bool CheckForWin(int lastX, int lastY, int lastZ)
    {
        // Translate from 1-based to 0-based
        int x = lastX - 1;
        int y = lastY - 1;
        int z = lastZ - 1;

        Player player = _board[x, y, z];
        List<(int, int, int)> winningLine = [];
        List<(int dx, int dy, int dz)> directions = GetAllDirections();

        Debug.WriteLine($"[WIN-CHECK] Checking win for {player} at ({lastX},{lastY},{lastZ})");

        foreach (var dir in directions)
        {
            winningLine.Clear();
            winningLine.Add((x, y, z)); // Always start at the origin

            int count = 1;

            // Scan in the positive direction
            for (int i = 1; i < Size; i++)
            {
                int nx = x + i * dir.dx;
                int ny = y + i * dir.dy;
                int nz = z + i * dir.dz;

                if (nx < 0 || nx >= Size || ny < 0 || ny >= Size || nz < 0 || nz >= Size)
                    break;

                if (_board[nx, ny, nz] != player)
                    break;

                count++;
                winningLine.Add((nx, ny, nz));
            }

            // Now scan in the opposite direction
            for (int i = 1; i < Size; i++)
            {
                int nx = x - i * dir.dx;
                int ny = y - i * dir.dy;
                int nz = z - i * dir.dz;

                if (nx < 0 || nx >= Size || ny < 0 || ny >= Size || nz < 0 || nz >= Size)
                    break;

                if (_board[nx, ny, nz] != player)
                    break;

                count++;
                winningLine.Add((nx, ny, nz));
            }

            if (count >= Size)
            {
                Debug.WriteLine($"[WIN-CHECK] Found winning line! Direction: ({dir.dx},{dir.dy},{dir.dz})");
                Debug.WriteLine($"[WIN-CHECK] Count: {count}, Positions in line: {winningLine.Count}");

                _winningPositions = winningLine
                    .Select(pos => $"{pos.Item1 + 1}{pos.Item2 + 1}{pos.Item3 + 1}")
                    .ToList();

                Debug.WriteLine($"[WIN-CHECK] Winning positions: {string.Join(", ", _winningPositions)}");
                return true;
            }
        }

        Debug.WriteLine($"[WIN-CHECK] No win found");
        return false;
    }

    /// <summary>
    /// Checks if the board is full (draw condition)
    /// </summary>
    private bool CheckForDraw()
    {
        for (int x = 0; x < Size; x++)
            for (int y = 0; y < Size; y++)
                for (int z = 0; z < Size; z++)
                    if (_board[x, y, z] == Player.None)
                        return false;

        return true;
    }

    /// <summary>
    /// Serializes the current game state to JSON using source-generated serialization
    /// </summary>
    public string SerializeGame()
    {
        var state = new GameState(
            Size,
            _currentPlayer,
            _gameOver,
            Winner,
            ToSerializableBoard(),
            _winningPositions,
            MoveHistory.ToList()
        );

        return System.Text.Json.JsonSerializer.Serialize(state, GameStateContext.Default.GameState);
    }

    /// <summary>
    /// Restores a game board from a JSON snapshot created by SerializeGame().
    /// </summary>
    public static GameBoard DeserializeGame(string json)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(json);

        var state = JsonSerializer.Deserialize(json, GameStateContext.Default.GameState)
            ?? throw new InvalidOperationException("Saved game data could not be deserialized.");

        return FromState(state);
    }

    private static GameBoard FromState(GameState state)
    {
        var board = new GameBoard(state.Size);

        if (state.Board.Length != state.Size)
        {
            throw new InvalidOperationException("Saved game board dimensions do not match the saved size.");
        }

        for (int x = 0; x < state.Size; x++)
        {
            if (state.Board[x].Length != state.Size)
            {
                throw new InvalidOperationException("Saved game board dimensions do not match the saved size.");
            }

            for (int y = 0; y < state.Size; y++)
            {
                if (state.Board[x][y].Length != state.Size)
                {
                    throw new InvalidOperationException("Saved game board dimensions do not match the saved size.");
                }

                for (int z = 0; z < state.Size; z++)
                {
                    board._board[x, y, z] = state.Board[x][y][z];
                }
            }
        }

        board._currentPlayer = state.CurrentPlayer;
        board._gameOver = state.IsGameOver;
        board.Winner = state.Winner;
        board._winningPositions = state.WinningPositions.ToList();
        board._moveHistory = state.MoveHistory.ToList();

        return board;
    }

    private Player[][][] ToSerializableBoard()
    {
        var result = new Player[Size][][];

        for (int x = 0; x < Size; x++)
        {
            result[x] = new Player[Size][];

            for (int y = 0; y < Size; y++)
            {
                result[x][y] = new Player[Size];

                for (int z = 0; z < Size; z++)
                {
                    result[x][y][z] = _board[x, y, z];
                }
            }
        }

        return result;
    }

    // ========== AI METHODS (Chapter 9) ==========

    /// <summary>
    /// Gets the computer's next move using heuristic analysis
    /// </summary>
    public (int x, int y, int z) GetComputerMove() => GetComputerMove(AiDifficulty.Hard);

    /// <summary>
    /// Gets the computer's next move at the specified difficulty
    /// </summary>
    public (int x, int y, int z) GetComputerMove(AiDifficulty difficulty)
    {
        if (_gameOver) return (0, 0, 0);

        return difficulty switch
        {
            AiDifficulty.Easy => GetEasyMove(),
            AiDifficulty.Medium => GetMediumMove(),
            _ => GetHardMove()
        };
    }

    /// <summary>
    /// Easy: 80% random, 20% strategic (rarely blocks or wins)
    /// </summary>
    private (int x, int y, int z) GetEasyMove()
    {
        // Occasionally play smart (20% chance)
        if (Random.Shared.Next(5) == 0)
            return GetMediumMove();

        return GetRandomMove();
    }

    /// <summary>
    /// Medium: Always blocks opponent wins, but doesn't seek its own
    /// </summary>
    private (int x, int y, int z) GetMediumMove()
    {
        // Always block if opponent is about to win
        var blockingMove = FindWinningMoveFor(_currentPlayer.Opponent());
        if (blockingMove is not null)
            return blockingMove.Value;

        // 50% chance to play strategically, 50% random
        if (Random.Shared.Next(2) == 0)
            return GetStrategicMove();

        return GetRandomMove();
    }

    /// <summary>
    /// Hard: Full heuristic — win > block > strategic > random
    /// </summary>
    private (int x, int y, int z) GetHardMove()
    {
        // 1. Try to win
        var winningMove = FindWinningMoveFor(_currentPlayer);
        if (winningMove is not null) 
            return winningMove.Value;

        // 2. Block the opponent
        var blockingMove = FindWinningMoveFor(_currentPlayer.Opponent());
        if (blockingMove is not null) 
            return blockingMove.Value;

        // 3. Pick strategically
        return GetStrategicMove();
    }

    /// <summary>
    /// Finds a winning move for the specified player
    /// </summary>
    private (int x, int y, int z)? FindWinningMoveFor(Player player)
    {
        for (int x = 1; x <= Size; x++)
        {
            for (int y = 1; y <= Size; y++)
            {
                for (int z = 1; z <= Size; z++)
                {
                    // Pattern matching for empty cell check
                    if (_board[x - 1, y - 1, z - 1] is not Player.None) 
                        continue;

                    // Simulate the move
                    _board[x - 1, y - 1, z - 1] = player;
                    bool wouldWin = CheckForWin(x, y, z);
                    _board[x - 1, y - 1, z - 1] = Player.None; // Undo

                    if (wouldWin) return (x, y, z);
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Gets a strategic move (prefers center, then corners, then random)
    /// </summary>
    private (int x, int y, int z) GetStrategicMove()
    {
        // Prefer center cell if available
        int center = (Size + 1) / 2;
        if (_board[center - 1, center - 1, center - 1] is Player.None)
            return (center, center, center);

        // Prefer corner cells using collection expression
        List<(int x, int y, int z)> corners =
        [
            (1, 1, 1), (1, 1, Size), (1, Size, 1), (1, Size, Size),
            (Size, 1, 1), (Size, 1, Size), (Size, Size, 1), (Size, Size, Size)
        ];

        // Find first available corner
        var availableCorner = corners
            .FirstOrDefault(c => _board[c.x - 1, c.y - 1, c.z - 1] is Player.None);

        if (availableCorner != default)
            return availableCorner;

        // Otherwise, pick random available cell
        return GetRandomMove();
    }

    /// <summary>
    /// Gets a random available move
    /// </summary>
    private (int x, int y, int z) GetRandomMove()
    {
        // Build list of available cells using collection expression
        List<(int x, int y, int z)> available = [];

        for (int x = 1; x <= Size; x++)
        {
            for (int y = 1; y <= Size; y++)
            {
                for (int z = 1; z <= Size; z++)
                {
                    if (_board[x - 1, y - 1, z - 1] is Player.None)
                        available.Add((x, y, z));
                }
            }
        }

        if (available is []) return (0, 0, 0);  // List pattern for empty

        return available[Random.Shared.Next(available.Count)];
    }
}  // End of GameBoard class

/// <summary>
/// Extension methods for the Player enum (Chapter 9)
/// </summary>
public static class PlayerExtensions
{
    /// <summary>
    /// Gets the opponent of the current player
    /// </summary>
    public static Player Opponent(this Player player) => player switch
    {
        Player.X => Player.O,
        Player.O => Player.X,
        _ => Player.None
    };
}
