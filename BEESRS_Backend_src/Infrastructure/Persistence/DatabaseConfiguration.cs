using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Persistence
{
    public static class DatabaseConfiguration
    {
        public static IServiceCollection AddDatabaseServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<BEESRSDBContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("BEESRSDB"),
                sqlOptions => sqlOptions.UseNetTopologySuite()));

            return services;
        }
    }
}
