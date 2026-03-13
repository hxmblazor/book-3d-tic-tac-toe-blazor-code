using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using TicTacToe.Web;
using TicTacToe.Web.Components;
using TicTacToe.Web.Data;
using TicTacToe.Web.Services;

var builder = WebApplication.CreateBuilder(args);

// ✨ NEW in .NET 10: Better observability with structured logging
builder.Logging
    .AddConsole()
    .AddDebug();

// Add services to the container.
builder.Services
    .AddRazorComponents()
    .AddInteractiveServerComponents();

// ✨ IMPROVED in .NET 10: Better antiforgery configuration
builder.Services.AddAntiforgery(options =>
{
    options.FormFieldName = "AntiforgeryToken";
    options.HeaderName = "X-CSRF-TOKEN";
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("TicTacToeDb")
        ?? "Data Source=tictactoe.db"));

// Register game session and persistence services as scoped (per user)
builder.Services.AddScoped<GameSession>();
builder.Services.AddScoped<GameDataService>();

// ✨ NEW in .NET 10: HTTP/3 support configuration
builder.WebHost.ConfigureKestrel(options =>
{
    options.ConfigureEndpointDefaults(listenOptions =>
    {
        // Full HTTP/3 support in .NET 10
        listenOptions.Protocols = HttpProtocols.Http1AndHttp2AndHttp3;
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseAntiforgery();

app.MapStaticAssets();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
