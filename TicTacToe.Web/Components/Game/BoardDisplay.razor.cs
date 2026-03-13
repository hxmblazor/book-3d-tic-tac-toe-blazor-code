using Microsoft.AspNetCore.Components;
using TicTacToe.Engine;

namespace TicTacToe.Web.Components.Game;

public partial class BoardDisplay : ComponentBase
{
    [Parameter]
    public GameBoard Board { get; set; } = default!;

    [Parameter]
    public EventCallback<(int x, int y, int z)> OnCellClick { get; set; }

    [Parameter]
    public (int x, int y, int z)? PendingMove { get; set; }

    private bool IsWinningCell(int x, int y, int z)
    {
        if (Board.Winner == Player.None) return false;
        // Engine stores winning positions as compact "xyz" strings (1-based), e.g. "123".
        return Board.WinningPositions.Contains($"{x}{y}{z}");
    }

    private bool IsPendingCell(int x, int y, int z)
    {
        return PendingMove.HasValue && 
               PendingMove.Value.x == x && 
               PendingMove.Value.y == y && 
               PendingMove.Value.z == z;
    }

    private string GetCellSize()
    {
        return Board.Size switch
        {
            3 => "60px",
            4 => "50px",
            5 => "45px",
            _ => "60px"
        };
    }
}