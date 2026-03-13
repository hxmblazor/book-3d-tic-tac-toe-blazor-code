namespace TicTacToe.Web.Data;

/// <summary>
/// Entity representing a persisted game snapshot for a named player.
/// </summary>
public class SavedGame
{
    public Guid Id { get; set; }

    public string PlayerName { get; set; } = string.Empty;

    public string? FriendlyName { get; set; }

    public string GameJson { get; set; } = string.Empty;

    public int BoardSize { get; set; }

    public string? Winner { get; set; }

    public int MoveCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
