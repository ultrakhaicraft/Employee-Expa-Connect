using System;
using System.Collections.Generic;
using System.Linq;
using Application.Interfaces;
using Application.Models;
using Domain.Entities;

namespace Application.Services
{
    public class VenueScoringService : IVenueScoringService
    {
        public double CalculateScore(
            Place venue, 
            AggregatedPreferences preferences, 
            Event eventEntity,
            List<(double Latitude, double Longitude)> participantLocations)
        {
            double score = 0;
            const double maxScore = 100;

            // 1. Cuisine Match (25 points) - Weighted by popularity
            if (venue.PlaceCategory != null && preferences.CuisineTypes.Contains(venue.PlaceCategory.Name))
            {
                int frequency = preferences.PreferenceWeights.GetValueOrDefault(venue.PlaceCategory.Name, 0);
                double participantCount = Math.Max(preferences.ParticipantIds.Count, 1); // Avoid division by zero
                double popularityRatio = frequency / participantCount;
                // Full points if 50%+ prefer, partial otherwise
                score += 25 * Math.Min(popularityRatio * 2, 1.0); // Scale up: 50% preference = full points
            }
            else if (venue.PlaceCategory != null)
            {
                // Give partial credit if category exists but doesn't match preferences
                score += 5;
            }

            // 2. Budget Match (20 points) - Fixed normalization for USD
            if (venue.PriceLevel.HasValue)
            {
                double priceDiff = Math.Abs((double)venue.PriceLevel.Value - preferences.AverageBudget);
                // Normalize: $0 diff = full points, $20+ diff = 0 points
                // Use exponential decay for better scoring
                double normalizedDiff = Math.Min(priceDiff / 20.0, 1.0); // $20 difference = 0 points
                score += 20 * (1 - normalizedDiff);
            }
            else
            {
                // Give partial credit if price not available
                score += 5;
            }

            // 3. Capacity Match (20 points) - Reward adequate or spacious venues
            if (!string.IsNullOrEmpty(venue.SuitableFor) && int.TryParse(venue.SuitableFor, out int capacity))
            {
                if (capacity >= eventEntity.ExpectedAttendees)
                {
                    // Reward venues that fit well (not too small, not too large)
                    double idealCapacity = eventEntity.ExpectedAttendees * 1.2; // 20% buffer is ideal
                    if (capacity <= idealCapacity)
                    {
                        // Perfect fit: capacity between ExpectedAttendees and 1.2x
                        score += 20; // Full points
                    }
                    else
                    {
                        // Spacious but still good
                        double spaciousRatio = Math.Min(idealCapacity / capacity, 1.0);
                        score += 20 * (0.7 + 0.3 * spaciousRatio); // 70-100% of points
                    }
                }
                else
                {
                    // Too small: give partial credit based on how close it is
                    double fitRatio = (double)capacity / eventEntity.ExpectedAttendees;
                    score += 20 * Math.Max(fitRatio - 0.3, 0); // At least 30% capacity needed for any points
                }
            }
            else
            {
                // Give partial credit if capacity not available
                score += 5;
            }

            // 4. Location Convenience (15 points)
            if (participantLocations.Any())
            {
                double avgDistance = CalculateAverageDistance(
                    venue.Latitude, 
                    venue.Longitude, 
                    participantLocations);

                if (avgDistance <= preferences.MaxDistanceRadius)
                {
                    // Exponential decay: closer = much better
                    double distanceRatio = avgDistance / preferences.MaxDistanceRadius;
                    score += 15 * Math.Pow(1 - distanceRatio, 1.5); // Exponential curve
                }
                // No points if outside radius
            }
            else
            {
                // Give partial score if location data not available
                score += 7.5;
            }

            // 5. Rating & Reviews (15 points) - Combined rating and review count
            if (venue.AverageRating > 0)
            {
                // Base rating score (10 points)
                double ratingScore = 10 * ((double)venue.AverageRating / 5.0);
                
                // Review count bonus (5 points)
                double reviewScore = 0;
                if (venue.TotalReviews >= 100)
                {
                    reviewScore = 5; // Full bonus
                }
                else if (venue.TotalReviews >= 50)
                {
                    reviewScore = 4; // High bonus
                }
                else if (venue.TotalReviews >= 20)
                {
                    reviewScore = 3; // Medium bonus
                }
                else if (venue.TotalReviews >= 10)
                {
                    reviewScore = 2; // Low bonus
                }
                else if (venue.TotalReviews >= 5)
                {
                    reviewScore = 1; // Minimal bonus
                }
                
                score += ratingScore + reviewScore;
            }
            else
            {
                // No rating: give minimal points
                score += 2;
            }

            // 6. Additional Factors (5 points)
            // Tags/Features match
            if (venue.PlaceTagAssignments != null && venue.PlaceTagAssignments.Any(pta => 
                pta.PlaceTag != null && pta.PlaceTag.IsActive))
            {
                score += 2; // Has features/tags
            }
            
            // Popularity (likes)
            if (venue.TotalLikes > 20)
            {
                score += 2; // Popular venue
            }
            else if (venue.TotalLikes > 0)
            {
                score += 1; // Some popularity
            }
            
            // Verified status
            if (venue.VerificationStatus == Domain.Enums.PlaceVerificationStatus.Approved)
            {
                score += 1; // Verified by moderator
            }

            return Math.Min(score, maxScore);
        }

        public string GenerateReasoning(
            Place venue, 
            AggregatedPreferences preferences, 
            Event eventEntity)
        {
            var reasons = new List<string>();

            if (venue.PlaceCategory != null && preferences.CuisineTypes.Contains(venue.PlaceCategory.Name))
            {
                int frequency = preferences.PreferenceWeights.GetValueOrDefault(venue.PlaceCategory.Name, 0);
                double percentage = (frequency / (double)preferences.ParticipantIds.Count) * 100;
                reasons.Add($"{percentage:F0}% of team members prefer {venue.PlaceCategory.Name} cuisine");
            }

            // Treat price level and budgets as USD values; consider a venue a good match if within $10 of team average
            if (venue.PriceLevel.HasValue && Math.Abs((double)venue.PriceLevel.Value - preferences.AverageBudget) < 10)
            {
                reasons.Add($"Price range matches team budget (around {preferences.AverageBudget:N2} USD/person)");
            }

            if (!string.IsNullOrEmpty(venue.SuitableFor) && int.TryParse(venue.SuitableFor, out int capacity) && capacity >= eventEntity.ExpectedAttendees)
            {
                reasons.Add($"Can accommodate your group of {eventEntity.ExpectedAttendees} people comfortably");
            }

            if (venue.AverageRating >= 4.0m)
            {
                reasons.Add($"Excellent rating ({venue.AverageRating:F1}/5 from {venue.TotalReviews} reviews)");
            }

            return reasons.Any() ? string.Join(", ", reasons) : "Good match for your event";
        }

        public List<string> GeneratePros(
            Place venue, 
            AggregatedPreferences preferences, 
            Event eventEntity)
        {
            var pros = new List<string>();

            // 1. Cuisine Match
            if (venue.PlaceCategory != null && preferences.CuisineTypes.Contains(venue.PlaceCategory.Name))
            {
                int frequency = preferences.PreferenceWeights.GetValueOrDefault(venue.PlaceCategory.Name, 0);
                double percentage = (frequency / (double)preferences.ParticipantIds.Count) * 100;
                pros.Add($"Popular cuisine choice: {percentage:F0}% of team prefers {venue.PlaceCategory.Name}");
            }

            // 2. Rating
            if (venue.AverageRating >= 4.5m)
            {
                pros.Add($"Excellent rating ({venue.AverageRating:F1}/5 from {venue.TotalReviews} reviews)");
            }
            else if (venue.AverageRating >= 4.0m)
            {
                pros.Add($"High rating ({venue.AverageRating:F1}/5 from {venue.TotalReviews} reviews)");
            }
            else if (venue.AverageRating >= 3.5m && venue.TotalReviews > 20)
            {
                pros.Add($"Good rating ({venue.AverageRating:F1}/5) with {venue.TotalReviews} reviews");
            }

            // 3. Review Count
            if (venue.TotalReviews > 100)
            {
                pros.Add($"Highly reviewed with {venue.TotalReviews} reviews from colleagues");
            }
            else if (venue.TotalReviews > 50)
            {
                pros.Add($"Well-reviewed with {venue.TotalReviews} reviews");
            }
            else if (venue.TotalReviews > 20)
            {
                pros.Add($"Good number of reviews ({venue.TotalReviews} reviews)");
            }

            // 4. Capacity
            if (!string.IsNullOrEmpty(venue.SuitableFor) && int.TryParse(venue.SuitableFor, out int capacity))
            {
                if (capacity >= eventEntity.ExpectedAttendees * 1.2)
                {
                    pros.Add($"Spacious venue: can comfortably accommodate {eventEntity.ExpectedAttendees} people (capacity: {capacity})");
                }
                else if (capacity >= eventEntity.ExpectedAttendees)
                {
                    pros.Add($"Perfect capacity for {eventEntity.ExpectedAttendees} people");
                }
            }

            // 5. Budget Match
            if (venue.PriceLevel.HasValue)
            {
                double priceDiff = Math.Abs((double)venue.PriceLevel.Value - preferences.AverageBudget);
                if (priceDiff <= 5)
                {
                    pros.Add($"Budget-friendly: matches team budget (${venue.PriceLevel.Value:F2}/person)");
                }
                else if (priceDiff <= 10)
                {
                    pros.Add($"Reasonable pricing: close to team budget (${venue.PriceLevel.Value:F2}/person)");
                }
            }

            // 6. Tags/Features
            if (venue.PlaceTagAssignments != null && venue.PlaceTagAssignments.Any())
            {
                var activeTags = venue.PlaceTagAssignments
                    .Where(pta => pta.PlaceTag != null && pta.PlaceTag.IsActive)
                    .Select(pta => pta.PlaceTag.Name)
                    .Take(3)
                    .ToList();
                
                if (activeTags.Any())
                {
                    pros.Add($"Features: {string.Join(", ", activeTags)}");
                }
            }

            // 7. Likes/Popularity
            if (venue.TotalLikes > 50)
            {
                pros.Add($"Popular choice: {venue.TotalLikes} colleagues have liked this place");
            }
            else if (venue.TotalLikes > 20)
            {
                pros.Add($"Well-liked by {venue.TotalLikes} colleagues");
            }

            // 8. Best Time to Visit
            if (!string.IsNullOrEmpty(venue.BestTimeToVisit))
            {
                pros.Add($"Best time to visit: {venue.BestTimeToVisit}");
            }

            // 9. Description highlights (if available)
            if (!string.IsNullOrEmpty(venue.Description) && venue.Description.Length > 20)
            {
                var shortDesc = venue.Description.Length > 100 
                    ? venue.Description.Substring(0, 100) + "..." 
                    : venue.Description;
                // Only add if description seems meaningful
                if (shortDesc.Split(' ').Length > 5)
                {
                    pros.Add($"Description: {shortDesc}");
                }
            }

            // 10. Operating Hours (if matches event time)
            if (venue.OpenTime.HasValue && venue.CloseTime.HasValue)
            {
                var eventTime = eventEntity.ScheduledTime;
                if (eventTime >= venue.OpenTime.Value && eventTime <= venue.CloseTime.Value)
                {
                    pros.Add($"Open during event time ({venue.OpenTime.Value:hh\\:mm} - {venue.CloseTime.Value:hh\\:mm})");
                }
            }

            return pros;
        }

        public List<string> GenerateCons(
            Place venue, 
            AggregatedPreferences preferences, 
            Event eventEntity)
        {
            var cons = new List<string>();

            // 1. Capacity Issues
            if (!string.IsNullOrEmpty(venue.SuitableFor) && int.TryParse(venue.SuitableFor, out int capacity))
            {
                if (capacity < eventEntity.ExpectedAttendees)
                {
                    cons.Add($"May be too small: capacity is {capacity} but event has {eventEntity.ExpectedAttendees} attendees");
                }
                else if (capacity < eventEntity.ExpectedAttendees * 1.1)
                {
                    cons.Add($"Tight capacity: venue fits {capacity} people, event has {eventEntity.ExpectedAttendees} attendees");
                }
            }

            // 2. Budget Concerns
            if (venue.PriceLevel.HasValue)
            {
                double priceDiff = (double)venue.PriceLevel.Value - preferences.AverageBudget;
                if (priceDiff > 20)
                {
                    cons.Add($"Price above budget: ${venue.PriceLevel.Value:F2}/person vs team budget ${preferences.AverageBudget:F2}/person");
                }
                else if (priceDiff > 10)
                {
                    cons.Add($"Slightly above budget: ${venue.PriceLevel.Value:F2}/person (budget: ${preferences.AverageBudget:F2}/person)");
                }
            }

            // 3. Rating Concerns
            if (venue.AverageRating > 0 && venue.AverageRating < 3.0m)
            {
                cons.Add($"Low rating: {venue.AverageRating:F1}/5 may not meet expectations");
            }
            else if (venue.AverageRating >= 3.0m && venue.AverageRating < 3.5m)
            {
                cons.Add($"Moderate rating: {venue.AverageRating:F1}/5 - consider other options");
            }

            // 4. Review Count
            if (venue.TotalReviews == 0)
            {
                cons.Add("No reviews available yet - venue is new or unrated");
            }
            else if (venue.TotalReviews < 5)
            {
                cons.Add($"Very few reviews ({venue.TotalReviews}) - limited feedback from colleagues");
            }
            else if (venue.TotalReviews < 10)
            {
                cons.Add($"Limited reviews available ({venue.TotalReviews} reviews)");
            }

            // 5. Operating Hours
            if (venue.OpenTime.HasValue && venue.CloseTime.HasValue)
            {
                var eventTime = eventEntity.ScheduledTime;
                if (eventTime < venue.OpenTime.Value || eventTime > venue.CloseTime.Value)
                {
                    cons.Add($"May be closed during event time (hours: {venue.OpenTime.Value:hh\\:mm} - {venue.CloseTime.Value:hh\\:mm})");
                }
            }

            // 6. Busy Time Warning
            if (!string.IsNullOrEmpty(venue.BusyTime))
            {
                cons.Add($"Note: Busy during {venue.BusyTime} - may be crowded");
            }

            // 7. No Tags/Features
            if (venue.PlaceTagAssignments == null || !venue.PlaceTagAssignments.Any(pta => pta.PlaceTag != null && pta.PlaceTag.IsActive))
            {
                cons.Add("Limited feature information available");
            }

            // 8. Low Popularity
            if (venue.TotalLikes == 0 && venue.TotalReviews < 5)
            {
                cons.Add("New or less popular venue - few colleagues have tried it");
            }

            // 9. Missing Information
            var missingInfo = new List<string>();
            if (string.IsNullOrEmpty(venue.Description) || venue.Description.Length < 20)
            {
                missingInfo.Add("description");
            }
            if (!venue.PriceLevel.HasValue)
            {
                missingInfo.Add("pricing");
            }
            if (string.IsNullOrEmpty(venue.SuitableFor))
            {
                missingInfo.Add("capacity");
            }
            
            if (missingInfo.Count >= 2)
            {
                cons.Add($"Missing key information: {string.Join(", ", missingInfo)}");
            }

            return cons;
        }

        private double CalculateAverageDistance(
            double venueLat, 
            double venueLng, 
            List<(double Latitude, double Longitude)> locations)
        {
            if (!locations.Any()) return 0;

            double totalDistance = 0;
            foreach (var location in locations)
            {
                totalDistance += CalculateDistance(venueLat, venueLng, location.Latitude, location.Longitude);
            }

            return totalDistance / locations.Count;
        }

        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            // Haversine formula for distance calculation
            const double R = 6371; // Earth radius in km
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);

            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private double ToRadians(double degrees)
        {
            return degrees * Math.PI / 180;
        }
    }
}

