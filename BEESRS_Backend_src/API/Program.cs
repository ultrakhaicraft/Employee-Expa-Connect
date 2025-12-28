using Application;
using Application.Interfaces;
using Application.Helper;
using Application.Interfaces.ThirdParty;
using Application.Services;
using Application.Services.ThirdParty;
using CloudinaryDotNet;
using Infrastructure;
using Infrastructure.Configurations;
using Infrastructure.Models.Common;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using System.Reflection;
using System.Text;
using System.Text.Json.Serialization;
using Application.Hubs;

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddMemoryCache();

        // Load appsettings.json
        builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

        // --- MVC / JSON ---
        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                options.JsonSerializerOptions.Converters.Add(new DoubleInfinityConverter()); // nếu bạn có converter này
                options.JsonSerializerOptions.Converters.Add(new Application.Helper.TimeSpanConverter()); // TimeSpan converter for parsing "HH:mm:ss" format
                options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            });

        builder.Services.AddEndpointsApiExplorer();

        // DB + DI
        builder.Services
            .AddDatabaseServices(builder.Configuration)
            .AddInfratructure()
            .AddApplication();

        builder.Services.AddHttpContextAccessor();

        // ===== REDIS CACHE (fallback Memory) =====
        var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            builder.Services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnectionString;
                options.InstanceName = "BEESRS_";
            });
            builder.Services.AddScoped<ICacheService, RedisCacheService>();
        }
        else
        {
            // Fallback to MemoryCache if Redis is not configured
            builder.Services.AddScoped<ICacheService, MemoryCacheService>();
        }
        // ===== GROQ AI SERVICE =====
        builder.Services.AddHttpClient<IAIService, GroqAIService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // ===== IMAGE GENERATION SERVICE (Gemini) =====
        builder.Services.AddHttpClient<IImageGenerationService, ImageGenerationService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(120); // Longer timeout for image generation
        });

        // ===== CHAT SERVICES =====
        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
        builder.Services.AddScoped<IChatService, ChatService>();

        // ===== JWT AUTH =====
        var jwtSettings = builder.Configuration.GetSection("JwtSettings");
        var key = Encoding.ASCII.GetBytes(jwtSettings["SecretKey"]!);

        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidAudience = jwtSettings["Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.Zero
            };

            // SignalR: nhận token từ query string
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;

                    var isSignalRHub =
                        path.StartsWithSegments("/hubs/chat") ||
                        path.StartsWithSegments("/hubs/converstation") ||
                        path.StartsWithSegments("/hubs/general"); // 👈 thêm dòng này


                    if (!string.IsNullOrEmpty(accessToken) && isSignalRHub)
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };

        });

        // ===== SIGNALR =====
        builder.Services.AddSignalR(o =>
        {
            o.EnableDetailedErrors = true;
            o.MaximumReceiveMessageSize = 102_400; // 100KB
            o.ClientTimeoutInterval = TimeSpan.FromSeconds(60); // Increased from 15s to 60s
            o.KeepAliveInterval = TimeSpan.FromSeconds(15); // Decreased from 30s to 15s for more frequent pings
            o.HandshakeTimeout = TimeSpan.FromSeconds(30); // Handshake timeout
        });

        //config ure Kestrel server to listen on specific ports

        //builder.WebHost.ConfigureKestrel(options =>
        //{
        //    options.ListenAnyIP(8880); // HTTP
        //    options.ListenAnyIP(2053, listenOptions =>
        //    {
        //        listenOptions.UseHttps("/app/https/beesrs.io.vn.pfx", "12345");
        //    });
        //});

        // ===== CORS =====
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowSpecificOrigin", policy =>
            {
                policy.WithOrigins(
                        "http://localhost:5173",
                        "http://localhost:3000",
                        "https://localhost:5173",
                        "https://localhost:3000",
                        "https://beesrs.io.vn")
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        // ===== SWAGGER =====
            builder.Services.AddSwaggerGen(c =>
            {
                try
                {
                    c.SwaggerDoc("v1", new OpenApiInfo
                    {
                        Title = "BEESRS API",
                        Version = "v1.0",
                        Description = "BEESRS - Restaurant Discovery & AI Chatbot System"
                    });
                    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                    if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);

                    c.CustomSchemaIds(type => type.FullName);

                    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                    {
                        In = ParameterLocation.Header,
                        Description = "Nhập JWT token (không cần thêm 'Bearer')",
                        Name = "Authorization",
                        Type = SecuritySchemeType.Http,
                        Scheme = "bearer",
                        BearerFormat = "JWT"
                    });

                    c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
            });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Swagger config error: {ex.Message}");
                    Console.WriteLine($"Stack trace: {ex.StackTrace}");
                }
            });

        // ===== CLOUDINARY =====
        builder.Services.Configure<CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));
        builder.Services.AddSingleton(provider =>
        {
            var cfg = provider.GetRequiredService<IOptions<CloudinarySettings>>().Value;
            var account = new Account(cfg.CloudName, cfg.ApiKey, cfg.ApiSecret);
            return new Cloudinary(account);
        });

        // ===== TRACKASIA (typed client) =====
        builder.Services.AddHttpClient<TrackAsiaService>(c => c.Timeout = TimeSpan.FromSeconds(15));
        builder.Services.AddSingleton<ITrackAsiaService>(sp =>
        {
            var factory = sp.GetRequiredService<IHttpClientFactory>();
            var config = sp.GetRequiredService<IConfiguration>();
            var logger = sp.GetRequiredService<ILogger<TrackAsiaService>>();
            return new TrackAsiaService(factory, config, logger);
        });

        // ===== MAPBOX (typed client, gọn) =====
        builder.Services.AddHttpClient<IMapBoxService, MapBoxService>(c =>
        {
            c.Timeout = TimeSpan.FromSeconds(15);
        });

        // ===== QuestPDF license =====
        QuestPDF.Settings.License = LicenseType.Community;

        // ===== BUILD APP (1 lần thôi) =====
        var app = builder.Build();

        // ===== PIPELINE =====
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "BEESRS API V1");
            c.DocumentTitle = "BEESRS API Documentation";
        });

        app.UseHttpsRedirection();
        app.UseStaticFiles();
        app.UseRouting();
        app.UseCors("AllowSpecificOrigin");
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();
        app.MapHub<API.Hubs.ChatHub>("/hubs/chat");
        app.MapHub<ConverstationHub>("/hubs/converstation");
        app.MapHub<GeneralHub>("/hubs/general");
        app.Run();
    }
}