using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class updateUserPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotificationPreferences",
                table: "user_preferences");

            migrationBuilder.DropColumn(
                name: "PrivacySettings",
                table: "user_preferences");

            migrationBuilder.AddColumn<string>(
                name: "ResolvedNote",
                table: "PlaceReports",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "events",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "planning",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldDefaultValue: "planning");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResolvedNote",
                table: "PlaceReports");

            migrationBuilder.AddColumn<string>(
                name: "NotificationPreferences",
                table: "user_preferences",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PrivacySettings",
                table: "user_preferences",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "events",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "planning",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "planning");

            migrationBuilder.UpdateData(
                table: "user_preferences",
                keyColumn: "PreferenceId",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "NotificationPreferences", "PrivacySettings" },
                values: new object[] { "{\"email\":true,\"push\":true,\"sms\":false}", "{\"showProfile\":true,\"showActivity\":false,\"showLocation\":false}" });
        }
    }
}
