using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class update_auditlogg : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Check if column exists before renaming
            // Only rename if NewDayNumber exists, otherwise assume DayNumber already exists
            var sql = @"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('itinerary_items') AND name = 'NewDayNumber')
                BEGIN
                    EXEC sp_rename 'itinerary_items.NewDayNumber', 'DayNumber', 'COLUMN';
                END";
            migrationBuilder.Sql(sql);

            migrationBuilder.AlterColumn<string>(
                name: "OldStatus",
                table: "EventAuditLogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "NewStatus",
                table: "EventAuditLogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.CreateTable(
                name: "PlaceReports",
                columns: table => new
                {
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlaceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    ReportedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IsResolved = table.Column<bool>(type: "bit", nullable: false),
                    ResolvedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaceReports", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_PlaceReports_places_PlaceId",
                        column: x => x.PlaceId,
                        principalTable: "places",
                        principalColumn: "PlaceId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlaceReports_users_ReportedByUserId",
                        column: x => x.ReportedByUserId,
                        principalTable: "users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlaceReports_users_ResolvedByUserId",
                        column: x => x.ResolvedByUserId,
                        principalTable: "users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlaceReports_PlaceId",
                table: "PlaceReports",
                column: "PlaceId");

            migrationBuilder.CreateIndex(
                name: "IX_PlaceReports_ReportedByUserId",
                table: "PlaceReports",
                column: "ReportedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PlaceReports_ResolvedByUserId",
                table: "PlaceReports",
                column: "ResolvedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlaceReports");

            // Check if column exists before renaming back
            var sqlDown = @"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('itinerary_items') AND name = 'DayNumber')
                    AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('itinerary_items') AND name = 'NewDayNumber')
                BEGIN
                    EXEC sp_rename 'itinerary_items.DayNumber', 'NewDayNumber', 'COLUMN';
                END";
            migrationBuilder.Sql(sqlDown);

            migrationBuilder.AlterColumn<string>(
                name: "OldStatus",
                table: "EventAuditLogs",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "NewStatus",
                table: "EventAuditLogs",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);
        }
    }
}
