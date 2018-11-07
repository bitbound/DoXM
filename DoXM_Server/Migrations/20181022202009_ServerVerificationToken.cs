using Microsoft.EntityFrameworkCore.Migrations;

namespace DoXM_Server.Migrations
{
    public partial class ServerVerificationToken : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ServerVerificationToken",
                table: "Machines",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ServerVerificationToken",
                table: "Machines");
        }
    }
}
