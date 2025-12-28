using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUnusedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remove Notes column from event_check_ins table
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "event_check_ins");

            // Remove Description column from event_templates table
            migrationBuilder.DropColumn(
                name: "Description",
                table: "event_templates");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restore Notes column in event_check_ins table
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "event_check_ins",
                type: "nvarchar(max)",
                nullable: true);

            // Restore Description column in event_templates table
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "event_templates",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);
        }
    }
}

