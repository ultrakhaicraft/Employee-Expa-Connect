using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class update_event_notification1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "TimeZone",
                value: "UTC+07:00");

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "TimeZone",
                value: "UTC+07:00");

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "TimeZone",
                value: "UTC+08:00");

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "TimeZone",
                value: "UTC+08:00");

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "TimeZone",
                value: "UTC+07:00");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "TimeZone",
                value: "Asia/Ho_Chi_Minh");

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "TimeZone",
                value: "Asia/Bangkok");

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "TimeZone",
                value: "Asia/Singapore");

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "TimeZone",
                value: "Asia/Manila");

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "CountryId",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "TimeZone",
                value: "Asia/Jakarta");
        }
    }
}
