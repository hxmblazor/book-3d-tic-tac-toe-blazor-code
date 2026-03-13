using Microsoft.EntityFrameworkCore;
using TicTacToe.Engine;
using TicTacToe.Web.Data;

namespace TicTacToe.Web.Services;

/// <summary>
/// Encapsulates saved-game persistence for the Blazor app.
/// </summary>
public class GameDataService(ApplicationDbContext context)
{
    private const string AutoSaveFriendlyName = "__autosave__";

    public async Task<SavedGame> SaveGameAsync(
        GameSession session,
        string playerName,
        string? friendlyName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(playerName);

        var normalizedPlayerName = playerName.Trim();
        var savedAt = DateTime.UtcNow;
        var board = session.Board;
        var normalizedFriendlyName = NormalizeFriendlyName(friendlyName, savedAt);

        var savedGame = new SavedGame
        {
            Id = Guid.NewGuid(),
            PlayerName = normalizedPlayerName,
            FriendlyName = normalizedFriendlyName,
            GameJson = session.SerializeGame(),
            BoardSize = board.Size,
            Winner = board.Winner is Player.None ? null : board.Winner.ToString(),
            MoveCount = board.MoveHistory.Count,
            CreatedAt = savedAt,
            UpdatedAt = savedAt
        };

        context.SavedGames.Add(savedGame);
        await context.SaveChangesAsync(cancellationToken);

        return savedGame;
    }

    public async Task<SavedGame> UpsertAutoSaveAsync(
        GameSession session,
        string playerName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(playerName);

        var normalizedPlayerName = playerName.Trim();
        var savedAt = DateTime.UtcNow;
        var board = session.Board;

        var savedGame = await context.SavedGames.FirstOrDefaultAsync(
            x => x.PlayerName == normalizedPlayerName && x.FriendlyName == AutoSaveFriendlyName,
            cancellationToken);

        if (savedGame is null)
        {
            savedGame = new SavedGame
            {
                Id = Guid.NewGuid(),
                PlayerName = normalizedPlayerName,
                FriendlyName = AutoSaveFriendlyName,
                CreatedAt = savedAt
            };

            context.SavedGames.Add(savedGame);
        }

        savedGame.GameJson = session.SerializeGame();
        savedGame.BoardSize = board.Size;
        savedGame.Winner = board.Winner is Player.None ? null : board.Winner.ToString();
        savedGame.MoveCount = board.MoveHistory.Count;
        savedGame.UpdatedAt = savedAt;

        await context.SaveChangesAsync(cancellationToken);
        return savedGame;
    }

    public Task<List<SavedGame>> GetGamesByPlayerNameAsync(
        string playerName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(playerName))
        {
            return Task.FromResult(new List<SavedGame>());
        }

        var normalizedPlayerName = playerName.Trim();

        return context.SavedGames
            .AsNoTracking()
            .Where(x => x.PlayerName == normalizedPlayerName && x.FriendlyName != AutoSaveFriendlyName)
            .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<SavedGame?> GetGameByIdAsync(
        Guid id,
        string playerName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(playerName);

        var normalizedPlayerName = playerName.Trim();

        return context.SavedGames
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == id && x.PlayerName == normalizedPlayerName,
                cancellationToken);
    }

    public Task<SavedGame?> GetLatestAutoSaveAsync(
        string playerName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(playerName);

        var normalizedPlayerName = playerName.Trim();

        return context.SavedGames
            .AsNoTracking()
            .Where(x => x.PlayerName == normalizedPlayerName && x.FriendlyName == AutoSaveFriendlyName)
            .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
            .ThenByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<bool> DeleteGameAsync(
        Guid id,
        string playerName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(playerName);

        var normalizedPlayerName = playerName.Trim();
        var savedGame = await context.SavedGames
            .FirstOrDefaultAsync(
                x => x.Id == id && x.PlayerName == normalizedPlayerName,
                cancellationToken);

        if (savedGame is null)
        {
            return false;
        }

        context.SavedGames.Remove(savedGame);
        await context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string NormalizeFriendlyName(string? friendlyName, DateTime savedAt)
    {
        if (string.IsNullOrWhiteSpace(friendlyName))
        {
            return $"Game {savedAt.ToLocalTime():yyyy-MM-dd HH:mm}";
        }

        var trimmedFriendlyName = friendlyName.Trim();
        return string.Equals(trimmedFriendlyName, AutoSaveFriendlyName, StringComparison.OrdinalIgnoreCase)
            ? $"Game {savedAt.ToLocalTime():yyyy-MM-dd HH:mm}"
            : trimmedFriendlyName;
    }
}
