namespace SmartCare.Application.DTOs.Doctors;

public class DoctorResponseDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
}
