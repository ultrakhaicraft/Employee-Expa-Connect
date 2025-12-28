using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Enums
{
    public enum ChatIntent
    {
        SearchLocation,
        CultureAdvice,
        WorkplaceEtiquette,
        EmergencyAssistance,
        EventPlanning,
        ItineraryPlanning,
        GeneralQuery
    }

    public enum BotResponseType
    {
        Text,
        LocationList,
        Map,
        CultureAdvice,
        Emergency,
        EventSuggestion
    }

    public enum EntityType
    {
        Cuisine,
        PriceRange,
        Location,
        Distance,
        Dietary,
        Features,
        Time,
        PartySize,
        Country,
        Topic
    }
}
