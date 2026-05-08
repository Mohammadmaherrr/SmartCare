using SmartCare.Domain.Entities;

namespace SmartCare.Application.Interfaces;

public interface ITokenService
{
    string CreateToken(User user);
}
