using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class update_event_notification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // AssignedBy and ConfidenceScore already exist in the table from initial migration (20251108154019_update)
            // Only add OneHourReminderSentAt if it doesn't exist
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "OneHourReminderSentAt",
                table: "event_participants",
                type: "datetimeoffset",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OneHourReminderSentAt",
                table: "event_participants");
        }
    }
}
