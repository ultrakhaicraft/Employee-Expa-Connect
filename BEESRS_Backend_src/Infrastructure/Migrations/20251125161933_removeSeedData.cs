using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class removeSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "user_preferences",
                keyColumn: "PreferenceId",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "user_profiles",
                keyColumn: "ProfileId",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "users",
                keyColumn: "UserId",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "users", 
                columns: new[] { "UserId", "CreatedAt", "CurrentBranchId", "Email", "EmailVerified", "EmployeeId", "FirstName", "IsActive", "JobTitle", "LastLoginAt", "LastName", "PasswordHash", "PhoneNumber", "RoleId", "UpdatedAt" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("C2F29E9E-FB89-46B2-A71B-04C55C67B0C6"), "admin@fpt.edu.vn", true, "ADMIN001", "System", true, "System Administrator", null, "Administrator", "AQAAAAIAAYagAAAAEFa+9SPJx6ioxaB1lRR5xoR099KWrfSfqtvBdVhtwR8qULGyOwwUdEquzhP8CRWMsA==", "0000000000", 1, new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.InsertData(
                table: "user_preferences",
                columns: new[] { "PreferenceId", "BudgetPreference", "CreatedAt", "CuisinePreferences", "DistanceRadius", "UpdatedAt", "UserId" },
                values: new object[] { new Guid("33333333-3333-3333-3333-333333333333"), 3, new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "{\"preferences\":[\"Vietnamese\",\"Asian\",\"International\"]}", 10000, new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.InsertData(
                table: "user_profiles",
                columns: new[] { "ProfileId", "Bio", "CreatedAt", "CurrentLocationCity", "CurrentLocationCountry", "DateFormat", "HomeCountry", "ProfilePictureUrl", "Timezone", "UpdatedAt", "UserId" },
                values: new object[] { new Guid("22222222-2222-2222-2222-222222222222"), "System Administrator - BEESRS Platform", new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Ho Chi Minh City", "VN", "dd/MM/yyyy", "VN", null, "Asia/Ho_Chi_Minh", new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("11111111-1111-1111-1111-111111111111") });
        }
    }
}
