using TicTacToe.Engine;

Console.Title = "3D Tic-Tac-Toe";
Console.ForegroundColor = ConsoleColor.White;

ShowWelcome();

int boardSize = GetBoardSize();
var game = new GameBoard(boardSize);

while (!game.IsGameOver)
{
    DisplayBoard(game);

    var move = GetMoveInput();
    if (move == null) break; // Quit
    if (move.Value.x == 0) continue; // Retry

    bool success = game.MakeMove(move.Value.x, move.Value.y, move.Value.z);

    if (!success)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("\n❌ Invalid Move! That cell is occupied or out of bounds.");
        Console.ResetColor();
        Console.ReadKey();
    }
}

DisplayBoard(game);

if (game.Winner != Player.None)
{
    Console.ForegroundColor = ConsoleColor.Green;
    Console.WriteLine($"\n🎉 GAME OVER! Winner: {game.Winner}");
    Console.WriteLine($"Winning positions: {string.Join(", ", game.WinningPositions)}");
    Console.ResetColor();
}
else
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("\n🤝 GAME OVER! It's a Draw.");
    Console.ResetColor();
}

Console.WriteLine("\nPress any key to exit...");
Console.ReadKey();

// ===== HELPER METHODS =====

void ShowWelcome()
{
    Console.Clear();
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine("╔════════════════════════════════════════╗");
    Console.WriteLine("║     3D TIC-TAC-TOE CONSOLE EDITION     ║");
    Console.WriteLine("╚════════════════════════════════════════╝");
    Console.ResetColor();
    Console.WriteLine();
}

int GetBoardSize()
{
    while (true)
    {
        Console.Write("Enter board size (3, 4, or 5): ");
        string? input = Console.ReadLine();

        if (int.TryParse(input, out int size) && size >= 3 && size <= 5)
            return size;

        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("Invalid size. Please enter 3, 4, or 5.");
        Console.ResetColor();
    }
}

void DisplayBoard(GameBoard game)
{
    Console.Clear();
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine($"═══ 3D Tic-Tac-Toe ({game.Size}×{game.Size}×{game.Size}) ═══");
    Console.ResetColor();
    Console.WriteLine($"Current Player: {game.CurrentPlayer}");
    Console.WriteLine("─────────────────────────────────────");

    for (int z = 1; z <= game.Size; z++)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"\nLAYER {z}:");
        Console.ResetColor();

        // Print column headers
        Console.Write("    ");
        for (int h = 1; h <= game.Size; h++)
            Console.Write($"{h}   ");
        Console.WriteLine();

        // Print each row
        for (int y = 1; y <= game.Size; y++)
        {
            Console.Write($"{y} |");
            for (int x = 1; x <= game.Size; x++)
            {
                var player = game.GetPlayer(x, y, z);
                string symbol = player == Player.None ? "." : player.ToString();
                bool isWinningCell = game.WinningPositions.Contains($"{x}{y}{z}");

                if (isWinningCell)
                {
                    Console.BackgroundColor = ConsoleColor.Green;
                    Console.ForegroundColor = ConsoleColor.Black;
                }
                else if (player == Player.X)
                {
                    Console.ForegroundColor = ConsoleColor.Cyan;
                }
                else if (player == Player.O)
                {
                    Console.ForegroundColor = ConsoleColor.Magenta;
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.DarkGray;
                }

                Console.Write($" {symbol} ");
                Console.ResetColor();
                Console.Write("|");
            }
            Console.WriteLine();
        }
    }
}

(int x, int y, int z)? GetMoveInput()
{
    Console.WriteLine();
    Console.Write("Enter move (x,y,z) or 'q' to quit: ");
    string? input = Console.ReadLine();

    if (string.IsNullOrWhiteSpace(input) || input.ToLower() == "q")
        return null;

    try
    {
        var parts = input.Split(',');
        if (parts.Length == 3 &&
            int.TryParse(parts[0].Trim(), out int x) &&
            int.TryParse(parts[1].Trim(), out int y) &&
            int.TryParse(parts[2].Trim(), out int z))
        {
            return (x, y, z);
        }
    }
    catch { }

    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("Invalid format. Use x,y,z — like 2,2,1");
    Console.ResetColor();
    Console.ReadKey();
    return (0, 0, 0); // retry flag
}
