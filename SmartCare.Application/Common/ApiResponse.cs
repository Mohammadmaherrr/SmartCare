namespace SmartCare.Application.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public List<string> Errors { get; set; } = [];
    public int StatusCode { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null, int statusCode = 200) =>
        new() { Success = true, Data = data, Message = message, StatusCode = statusCode, Errors = [] };

    public static ApiResponse<T> Fail(string message, int statusCode = 500, List<string>? errors = null) =>
        new() { Success = false, Message = message, StatusCode = statusCode, Errors = errors ?? [] };
}
