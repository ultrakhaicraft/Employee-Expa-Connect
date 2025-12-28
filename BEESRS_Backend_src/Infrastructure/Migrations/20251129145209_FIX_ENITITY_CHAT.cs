using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FIX_ENITITY_CHAT : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_chat_conversations_users_UserId1",
                table: "chat_conversations");

            migrationBuilder.DropIndex(
                name: "IX_chat_conversations_UserId1",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "chat_conversations");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserId1",
                table: "chat_conversations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_UserId1",
                table: "chat_conversations",
                column: "UserId1");

            migrationBuilder.AddForeignKey(
                name: "FK_chat_conversations_users_UserId1",
                table: "chat_conversations",
                column: "UserId1",
                principalTable: "users",
                principalColumn: "UserId");
        }
    }
}
