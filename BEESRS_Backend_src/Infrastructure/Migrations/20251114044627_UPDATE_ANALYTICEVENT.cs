using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UPDATE_ANALYTICEVENT : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastRescheduledAt",
                table: "events",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PreviousScheduledDate",
                table: "events",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "PreviousScheduledTime",
                table: "events",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RecurringEventId",
                table: "events",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RescheduleCount",
                table: "events",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "RescheduleReason",
                table: "events",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RsvpDeadline",
                table: "events",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TemplateId",
                table: "events",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EventId",
                table: "conversations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "event_check_ins",
                columns: table => new
                {
                    CheckInId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CheckedInAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CheckInMethod = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    IsNoShow = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_check_ins", x => x.CheckInId);
                    table.ForeignKey(
                        name: "FK_event_check_ins_events_EventId",
                        column: x => x.EventId,
                        principalTable: "events",
                        principalColumn: "EventId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_event_check_ins_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "event_feedbacks",
                columns: table => new
                {
                    FeedbackId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VenueRating = table.Column<int>(type: "int", nullable: false),
                    FoodRating = table.Column<int>(type: "int", nullable: false),
                    OverallRating = table.Column<int>(type: "int", nullable: false),
                    Comments = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Suggestions = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    WouldAttendAgain = table.Column<bool>(type: "bit", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_feedbacks", x => x.FeedbackId);
                    table.ForeignKey(
                        name: "FK_event_feedbacks_events_EventId",
                        column: x => x.EventId,
                        principalTable: "events",
                        principalColumn: "EventId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_event_feedbacks_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "event_templates",
                columns: table => new
                {
                    TemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TemplateName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EventDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EventType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EstimatedDuration = table.Column<int>(type: "int", nullable: true),
                    ExpectedAttendees = table.Column<int>(type: "int", nullable: false),
                    MaxAttendees = table.Column<int>(type: "int", nullable: true),
                    BudgetTotal = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    BudgetPerPerson = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    Timezone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsPublic = table.Column<bool>(type: "bit", nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    UsageCount = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_templates", x => x.TemplateId);
                    table.ForeignKey(
                        name: "FK_event_templates_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "event_waitlists",
                columns: table => new
                {
                    WaitlistId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    NotifiedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RespondedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_waitlists", x => x.WaitlistId);
                    table.ForeignKey(
                        name: "FK_event_waitlists_events_EventId",
                        column: x => x.EventId,
                        principalTable: "events",
                        principalColumn: "EventId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_event_waitlists_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "recurring_events",
                columns: table => new
                {
                    RecurringEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrganizerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EventType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RecurrencePattern = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DaysOfWeek = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DayOfMonth = table.Column<int>(type: "int", nullable: true),
                    Month = table.Column<int>(type: "int", nullable: true),
                    DayOfYear = table.Column<int>(type: "int", nullable: true),
                    ScheduledTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EstimatedDuration = table.Column<int>(type: "int", nullable: true),
                    ExpectedAttendees = table.Column<int>(type: "int", nullable: false),
                    BudgetPerPerson = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OccurrenceCount = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AutoCreateEvents = table.Column<bool>(type: "bit", nullable: false),
                    DaysInAdvance = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastGeneratedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recurring_events", x => x.RecurringEventId);
                    table.ForeignKey(
                        name: "FK_recurring_events_users_OrganizerId",
                        column: x => x.OrganizerId,
                        principalTable: "users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_events_RecurringEventId",
                table: "events",
                column: "RecurringEventId");

            migrationBuilder.CreateIndex(
                name: "IX_events_TemplateId",
                table: "events",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_conversations_EventId",
                table: "conversations",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_event_check_ins_EventId",
                table: "event_check_ins",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_event_check_ins_UserId",
                table: "event_check_ins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_event_feedbacks_EventId",
                table: "event_feedbacks",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_event_feedbacks_UserId",
                table: "event_feedbacks",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_event_templates_CreatedBy",
                table: "event_templates",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_event_waitlists_EventId",
                table: "event_waitlists",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_event_waitlists_UserId",
                table: "event_waitlists",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_recurring_events_OrganizerId",
                table: "recurring_events",
                column: "OrganizerId");

            migrationBuilder.AddForeignKey(
                name: "FK_conversations_events_EventId",
                table: "conversations",
                column: "EventId",
                principalTable: "events",
                principalColumn: "EventId");

            migrationBuilder.AddForeignKey(
                name: "FK_events_event_templates_TemplateId",
                table: "events",
                column: "TemplateId",
                principalTable: "event_templates",
                principalColumn: "TemplateId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_events_recurring_events_RecurringEventId",
                table: "events",
                column: "RecurringEventId",
                principalTable: "recurring_events",
                principalColumn: "RecurringEventId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_conversations_events_EventId",
                table: "conversations");

            migrationBuilder.DropForeignKey(
                name: "FK_events_event_templates_TemplateId",
                table: "events");

            migrationBuilder.DropForeignKey(
                name: "FK_events_recurring_events_RecurringEventId",
                table: "events");

            migrationBuilder.DropTable(
                name: "event_check_ins");

            migrationBuilder.DropTable(
                name: "event_feedbacks");

            migrationBuilder.DropTable(
                name: "event_templates");

            migrationBuilder.DropTable(
                name: "event_waitlists");

            migrationBuilder.DropTable(
                name: "recurring_events");

            migrationBuilder.DropIndex(
                name: "IX_events_RecurringEventId",
                table: "events");

            migrationBuilder.DropIndex(
                name: "IX_events_TemplateId",
                table: "events");

            migrationBuilder.DropIndex(
                name: "IX_conversations_EventId",
                table: "conversations");

            migrationBuilder.DropColumn(
                name: "LastRescheduledAt",
                table: "events");

            migrationBuilder.DropColumn(
                name: "PreviousScheduledDate",
                table: "events");

            migrationBuilder.DropColumn(
                name: "PreviousScheduledTime",
                table: "events");

            migrationBuilder.DropColumn(
                name: "RecurringEventId",
                table: "events");

            migrationBuilder.DropColumn(
                name: "RescheduleCount",
                table: "events");

            migrationBuilder.DropColumn(
                name: "RescheduleReason",
                table: "events");

            migrationBuilder.DropColumn(
                name: "RsvpDeadline",
                table: "events");

            migrationBuilder.DropColumn(
                name: "TemplateId",
                table: "events");

            migrationBuilder.DropColumn(
                name: "EventId",
                table: "conversations");
        }
    }
}
