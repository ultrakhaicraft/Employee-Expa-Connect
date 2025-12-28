using System.Collections.Generic;
using Application.Models;
using Domain.Entities;

namespace Application.Interfaces
{
    public interface IVenueScoringService
    {
        double CalculateScore(
            Place venue, 
            AggregatedPreferences preferences, 
            Event eventEntity,
            List<(double Latitude, double Longitude)> participantLocations);
        
        string GenerateReasoning(
            Place venue, 
            AggregatedPreferences preferences, 
            Event eventEntity);
        
        List<string> GeneratePros(
            Place venue, 
            AggregatedPreferences preferences, 
            Event eventEntity);
        
        List<string> GenerateCons(
            Place venue, 
            AggregatedPreferences preferences, 
            Event eventEntity);
    }
}



















































































