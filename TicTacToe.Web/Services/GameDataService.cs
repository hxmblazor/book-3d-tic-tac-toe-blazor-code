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

        if (board.MoveHistory.Count == 0 || board.IsGameOver)
        {
            await DeleteAutoSaveAsync(normalizedPlayerName, cancellationToken);
            return new SavedGame
            {
                PlayerName = normalizedPlayerName,
                FriendlyName = AutoSaveFriendlyName,
                BoardSize = board.Size,
                Winner = board.Winner is Player.None ? null : board.Winner.ToString(),
                MoveCount = board.MoveHistory.Count,
                CreatedAt = savedAt,
                UpdatedAt = savedAt,
                GameJson = session.SerializeGame()
            };
        }

        var autoSaves = await GetAutoSavesAsync(normalizedPlayerName, cancellationToken);
        var savedGame = autoSaves.FirstOrDefault();

        if (autoSaves.Count > 1)
        {
            context.SavedGames.RemoveRange(autoSaves.Skip(1));
        }

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

    public async Task<SavedGame?> GetLatestAutoSaveAsync(
        string playerName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(playerName);

        var normalizedPlayerName = playerName.Trim();

        var autoSaves = await GetAutoSavesAsync(normalizedPlayerName, cancellationToken);
        if (autoSaves.Count == 0)
        {
            return null;
        }

        SavedGame? latestValidAutoSave = null;
        var staleAutoSaves = new List<SavedGame>();

        foreach (var autoSave in autoSaves)
        {
            try
            {
                var board = GameBoard.DeserializeGame(autoSave.GameJson);
                if (board.MoveHistory.Count > 0 && !board.IsGameOver && latestValidAutoSave is null)
                {
                    latestValidAutoSave = autoSave;
                    continue;
                }
            }
            catch
            {
                // Treat corrupt autosaves as stale rows that should be discarded.
            }

            staleAutoSaves.Add(autoSave);
        }

        if (latestValidAutoSave is not null)
        {
            staleAutoSaves.AddRange(autoSaves.Where(x => x.Id != latestValidAutoSave.Id));
        }

        if (staleAutoSaves.Count > 0)
        {
            context.SavedGames.RemoveRange(staleAutoSaves.DistinctBy(x => x.Id));
            await context.SaveChangesAsync(cancellationToken);
        }

        return latestValidAutoSave;
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

    public async Task DeleteAutoSaveAsync(
        string playerName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(playerName);

        var normalizedPlayerName = playerName.Trim();
        var autoSaves = await GetAutoSavesAsync(normalizedPlayerName, cancellationToken);
        if (autoSaves.Count == 0)
        {
            return;
        }

        context.SavedGames.RemoveRange(autoSaves);
        await context.SaveChangesAsync(cancellationToken);
    }

    private Task<List<SavedGame>> GetAutoSavesAsync(
        string normalizedPlayerName,
        CancellationToken cancellationToken = default) =>
        context.SavedGames
            .Where(x => x.PlayerName == normalizedPlayerName && x.FriendlyName == AutoSaveFriendlyName)
            .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

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
