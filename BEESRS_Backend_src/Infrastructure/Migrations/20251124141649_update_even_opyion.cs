using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class update_even_opyion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_event_place_options_places_PlaceId",
                table: "event_place_options");

            migrationBuilder.AlterColumn<Guid>(
                name: "PlaceId",
                table: "event_place_options",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "ExternalAddress",
                table: "event_place_options",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExternalCategory",
                table: "event_place_options",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "ExternalLatitude",
                table: "event_place_options",
                type: "float(53)",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "ExternalLongitude",
                table: "event_place_options",
                type: "float(53)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalPhoneNumber",
                table: "event_place_options",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExternalPhotoUrl",
                table: "event_place_options",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExternalPlaceId",
                table: "event_place_options",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExternalPlaceName",
                table: "event_place_options",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExternalProvider",
                table: "event_place_options",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "ExternalRating",
                table: "event_place_options",
                type: "decimal(3,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ExternalTotalReviews",
                table: "event_place_options",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalWebsite",
                table: "event_place_options",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_event_place_options_places_PlaceId",
                table: "event_place_options",
                column: "PlaceId",
                principalTable: "places",
                principalColumn: "PlaceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_event_place_options_places_PlaceId",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalAddress",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalCategory",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalLatitude",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalLongitude",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalPhoneNumber",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalPhotoUrl",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalPlaceId",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalPlaceName",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalProvider",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalRating",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalTotalReviews",
                table: "event_place_options");

            migrationBuilder.DropColumn(
                name: "ExternalWebsite",
                table: "event_place_options");

            migrationBuilder.AlterColumn<Guid>(
                name: "PlaceId",
                table: "event_place_options",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_event_place_options_places_PlaceId",
                table: "event_place_options",
                column: "PlaceId",
                principalTable: "places",
                principalColumn: "PlaceId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
