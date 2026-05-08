using System.Net;
using System.Text.Json;
using SmartCare.API.Errors;
using SmartCare.Application.Exceptions;

namespace SmartCare.API.Middleware;

public class ExceptionMiddleware(RequestDelegate next,
    ILogger<ExceptionMiddleware> logger, IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{message}", ex.Message);
            await WriteErrorResponse(context, ex, env);
        }
    }

    private static async Task WriteErrorResponse(HttpContext context, Exception ex, IHostEnvironment env)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = ex switch
        {
            BadRequestException    => (HttpStatusCode.BadRequest,           ex.Message),
            UnauthorizedException  => (HttpStatusCode.Unauthorized,         ex.Message),
            ForbiddenException     => (HttpStatusCode.Forbidden,            ex.Message),
            ConflictException      => (HttpStatusCode.Conflict,             ex.Message),
            _                      => (HttpStatusCode.InternalServerError,
                                       env.IsDevelopment() ? ex.Message : "Internal server error")
        };

        context.Response.StatusCode = (int)statusCode;

        var details = ex is BadRequestException or UnauthorizedException or ForbiddenException or ConflictException
            ? null
            : env.IsDevelopment() ? ex.StackTrace : null;

        var response = new ApiException(context.Response.StatusCode, message, details);
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }
}
