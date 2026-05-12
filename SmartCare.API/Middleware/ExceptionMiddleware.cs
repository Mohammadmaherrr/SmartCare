using System.Net;
using System.Text.Json;
using SmartCare.Application.Common;
using SmartCare.Application.Exceptions;

namespace SmartCare.API.Middleware;

public class ExceptionMiddleware(RequestDelegate next,
    ILogger<ExceptionMiddleware> logger, IHostEnvironment env)
{
    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{message}", ex.Message);
            await WriteErrorResponse(context, ex);
        }
    }

    private async Task WriteErrorResponse(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = ex switch
        {
            BadRequestException   => (HttpStatusCode.BadRequest,          ex.Message),
            UnauthorizedException => (HttpStatusCode.Unauthorized,        ex.Message),
            ForbiddenException    => (HttpStatusCode.Forbidden,           ex.Message),
            ConflictException     => (HttpStatusCode.Conflict,            ex.Message),
            _                     => (HttpStatusCode.InternalServerError,
                                      env.IsDevelopment() ? ex.Message : "Internal server error")
        };

        context.Response.StatusCode = (int)statusCode;

        List<string>? errors = null;
        if (ex is not (BadRequestException or UnauthorizedException or ForbiddenException or ConflictException)
            && env.IsDevelopment() && ex.StackTrace is not null)
        {
            errors = [ex.StackTrace];
        }

        var response = ApiResponse<object>.Fail(message, (int)statusCode, errors);
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
    }
}
