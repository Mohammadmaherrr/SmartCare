using Microsoft.EntityFrameworkCore;
using SmartCare.Application.Interfaces;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Repositories;

public class Repository<T>(AppDbContext context) : IRepository<T> where T : class
{
    public async Task<T?> GetByIdAsync(Guid id) => await context.Set<T>().FindAsync(id);

    public async Task<IReadOnlyList<T>> GetAllAsync() =>
        await context.Set<T>().ToListAsync();

    public async Task AddAsync(T entity) => await context.Set<T>().AddAsync(entity);

    public void Update(T entity) => context.Entry(entity).State = EntityState.Modified;

    public void Delete(T entity) => context.Set<T>().Remove(entity);

    public async Task<bool> SaveChangesAsync() => await context.SaveChangesAsync() > 0;
}
