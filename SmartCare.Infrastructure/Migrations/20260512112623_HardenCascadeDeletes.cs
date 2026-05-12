using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartCare.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HardenCascadeDeletes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EmergencyRequests_Users_PatientId",
                table: "EmergencyRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_LaboratoryResults_Users_PatientId",
                table: "LaboratoryResults");

            migrationBuilder.DropForeignKey(
                name: "FK_MedicalRecords_Users_PatientId",
                table: "MedicalRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_Prescriptions_MedicalRecords_MedicalRecordId",
                table: "Prescriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_VisitSummaries_Appointments_AppointmentId",
                table: "VisitSummaries");

            migrationBuilder.AddForeignKey(
                name: "FK_EmergencyRequests_Users_PatientId",
                table: "EmergencyRequests",
                column: "PatientId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LaboratoryResults_Users_PatientId",
                table: "LaboratoryResults",
                column: "PatientId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MedicalRecords_Users_PatientId",
                table: "MedicalRecords",
                column: "PatientId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Prescriptions_MedicalRecords_MedicalRecordId",
                table: "Prescriptions",
                column: "MedicalRecordId",
                principalTable: "MedicalRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_VisitSummaries_Appointments_AppointmentId",
                table: "VisitSummaries",
                column: "AppointmentId",
                principalTable: "Appointments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EmergencyRequests_Users_PatientId",
                table: "EmergencyRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_LaboratoryResults_Users_PatientId",
                table: "LaboratoryResults");

            migrationBuilder.DropForeignKey(
                name: "FK_MedicalRecords_Users_PatientId",
                table: "MedicalRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_Prescriptions_MedicalRecords_MedicalRecordId",
                table: "Prescriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_VisitSummaries_Appointments_AppointmentId",
                table: "VisitSummaries");

            migrationBuilder.AddForeignKey(
                name: "FK_EmergencyRequests_Users_PatientId",
                table: "EmergencyRequests",
                column: "PatientId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LaboratoryResults_Users_PatientId",
                table: "LaboratoryResults",
                column: "PatientId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MedicalRecords_Users_PatientId",
                table: "MedicalRecords",
                column: "PatientId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Prescriptions_MedicalRecords_MedicalRecordId",
                table: "Prescriptions",
                column: "MedicalRecordId",
                principalTable: "MedicalRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VisitSummaries_Appointments_AppointmentId",
                table: "VisitSummaries",
                column: "AppointmentId",
                principalTable: "Appointments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
