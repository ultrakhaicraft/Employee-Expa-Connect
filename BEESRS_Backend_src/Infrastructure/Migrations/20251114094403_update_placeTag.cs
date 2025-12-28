using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class update_placeTag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "place_tags");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "place_tags",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 1,
                column: "Category",
                value: "Cuisine");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 2,
                column: "Category",
                value: "Cuisine");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 3,
                column: "Category",
                value: "Cuisine");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 4,
                column: "Category",
                value: "Cuisine");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 5,
                column: "Category",
                value: "Cuisine");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 6,
                column: "Category",
                value: "Cuisine");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 7,
                column: "Category",
                value: "Cuisine");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 8,
                column: "Category",
                value: "Cuisine");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 9,
                column: "Category",
                value: "Atmosphere");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 10,
                column: "Category",
                value: "Atmosphere");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 11,
                column: "Category",
                value: "Atmosphere");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 12,
                column: "Category",
                value: "Atmosphere");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 13,
                column: "Category",
                value: "Atmosphere");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 14,
                column: "Category",
                value: "Atmosphere");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 15,
                column: "Category",
                value: "Features");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 16,
                column: "Category",
                value: "Features");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 17,
                column: "Category",
                value: "Features");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 18,
                column: "Category",
                value: "Features");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 19,
                column: "Category",
                value: "Features");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 20,
                column: "Category",
                value: "Features");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 21,
                column: "Category",
                value: "Dietary");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 22,
                column: "Category",
                value: "Dietary");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 23,
                column: "Category",
                value: "Dietary");

            migrationBuilder.UpdateData(
                table: "place_tags",
                keyColumn: "TagId",
                keyValue: 24,
                column: "Category",
                value: "Dietary");
        }
    }
}
