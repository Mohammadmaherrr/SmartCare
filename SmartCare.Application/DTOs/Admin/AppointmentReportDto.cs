namespace SmartCare.Application.DTOs.Admin;

public class AppointmentReportDto
{
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int Total { get; set; }
    public int Completed { get; set; }
    public int NoShows { get; set; }
    public int Cancelled { get; set; }
    public int Pending { get; set; }
    public int Confirmed { get; set; }
    public IReadOnlyList<DoctorAppointmentBreakdownDto> ByDoctor { get; set; } = [];
}

public class DoctorAppointmentBreakdownDto
{
    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Completed { get; set; }
    public int NoShows { get; set; }
    public int Cancelled { get; set; }
}
