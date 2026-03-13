using Microsoft.EntityFrameworkCore;

namespace TicTacToe.Web.Data;

/// <summary>
/// EF Core context for saved games.
/// </summary>
public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options)
{
    public DbSet<SavedGame> SavedGames => Set<SavedGame>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var savedGame = modelBuilder.Entity<SavedGame>();

        savedGame.HasKey(x => x.Id);
        savedGame.Property(x => x.PlayerName)
            .HasMaxLength(100)
            .IsRequired();
        savedGame.Property(x => x.FriendlyName)
            .HasMaxLength(150);
        savedGame.Property(x => x.GameJson)
            .IsRequired();
        savedGame.Property(x => x.Winner)
            .HasMaxLength(16);
        savedGame.HasIndex(x => new { x.PlayerName, x.CreatedAt });
    }
}
