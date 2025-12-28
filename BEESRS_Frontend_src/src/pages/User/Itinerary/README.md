# Itinerary Management System

## Overview
A comprehensive itinerary planning and management system that allows users to create, manage, and optimize travel itineraries with detailed scheduling, cost tracking, and route optimization.

## Features

### ✅ Itinerary CRUD Operations
- Create new itineraries with detailed trip information
- Update itinerary details
- Delete itineraries
- Duplicate existing itineraries
- Save itineraries as templates

### ✅ Itinerary Items Management
- Add individual places/activities to itineraries
- Batch add multiple items
- Update item details
- Delete items
- Reorder items within itinerary

### ✅ Advanced Features
- **Route Optimization**: Optimize travel routes for minimum distance
- **Distance Calculation**: Calculate total distance between locations
- **PDF Export**: Export itinerary to PDF format
- **Sharing**: Share itineraries with other users
- **Templates**: Create and use itinerary templates
- **Analytics**: View statistics and completion rates

## API Integration

### Itinerary Endpoints

#### Create Itinerary
```
POST /api/itinerary/create-new
```

#### Create as Template
```
POST /api/itinerary/create-as-template
```

#### Get Itinerary Details
```
GET /api/itinerary/detail/{itineraryId}
```

#### Search All Itineraries
```
GET /api/itinerary/search-all
```

#### Update Itinerary
```
PUT /api/itinerary/update-itinerary/{itineraryId}
```

#### Delete Itinerary
```
DELETE /api/itinerary/delete-itinerary/{itineraryId}
```

### Itinerary Item Endpoints

#### Add Single Item
```
POST /api/itinerary/{itineraryId}/add-item
```
**Request Body:**
```json
{
  "placeId": "uuid",
  "dayNumber": 1,
  "startTime": "09:00",
  "endTime": "11:00",
  "estimatedDuration": 120,
  "activityTitle": "Temple Visit",
  "activityDescription": "Visit the Grand Palace",
  "activityType": "Sightseeing",
  "estimatedCost": 50.00,
  "actualCost": 45.00,
  "bookingReference": "ABC123",
  "bookingStatus": "Confirmed",
  "transportMethod": "Walking",
  "transportCost": 0,
  "isCompleted": false,
  "completionNotes": "",
  "sortOrder": 1
}
```

#### Add Multiple Items (Batch)
```
POST /api/itinerary/{itineraryId}/add-batch
```
**Request Body:** Array of item objects

#### Get All Items
```
GET /api/itinerary/{itineraryId}/get-all
```

#### Update Item
```
PUT /api/itinerary/update/{itineraryItemId}
```

#### Delete Item
```
DELETE /api/itinerary/delete/{itineraryItemId}
```

#### Reorder Items
```
PATCH /api/itinerary/{itineraryId}/reorder
```
**Request Body:**
```json
[
  {
    "itemId": "uuid",
    "newSortOrder": 1,
    "newDayNumber": 1,
    "newActivityType": "Sightseeing"
  }
]
```

### Export Endpoints

#### Export to PDF
```
GET /api/export-to-pdf/{itineraryId}
```
Returns a PDF blob that can be downloaded

### Analytics Endpoints

#### User Statistics
```
GET /api/itinerary/user-statistics
```

#### Itinerary Statistics
```
GET /api/itinerary/{itineraryId}/itinerary-statistics
```

## Data Models

### Itinerary Item Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| placeId | UUID | Yes | Reference to the place |
| dayNumber | number | Yes | Which day in the itinerary |
| sortOrder | number | Yes | Order within the day |
| startTime | string | No | Start time (HH:mm format) |
| endTime | string | No | End time (HH:mm format) |
| estimatedDuration | number | No | Duration in minutes |
| activityTitle | string | No | Title of the activity |
| activityDescription | string | No | Description of activity |
| activityType | string | No | Type/category of activity |
| estimatedCost | number | No | Estimated cost |
| actualCost | number | No | Actual cost incurred |
| bookingReference | string | No | Booking reference number |
| bookingStatus | string | No | Status: NotBooked, Pending, Confirmed, Cancelled |
| transportMethod | string | No | Walking, Driving, PublicTransport, etc. |
| transportCost | number | No | Cost of transportation |
| isCompleted | boolean | No | Whether activity is completed |
| completionNotes | string | No | Notes after completion |

### Booking Status Values
- `NotBooked` - Not yet booked
- `Pending` - Booking in progress
- `Confirmed` - Booking confirmed
- `Cancelled` - Booking cancelled

### Transport Methods
- `Walking`
- `Driving`
- `PublicTransport`
- `Bicycle`
- `Flight`

## Components

### CreateItinerary
Create a new itinerary with basic information (dates, destination, budget, etc.)

### ItineraryList
View all user's itineraries with filtering and search capabilities

### ItineraryDetail
View and manage a specific itinerary with all its items

### AddItemModal
Modal for adding places/activities to an itinerary with complete scheduling details

### RouteOptimization
Optimize the order of places to minimize travel distance

### ShareModal
Share itinerary with other users

### TemplateGallery
Browse and use itinerary templates

### ItineraryAnalytics
View statistics and insights about itineraries

## Usage Examples

### Creating an Itinerary with Items

```typescript
import { createItinerary, addItineraryItem } from '@/services/itineraryService';

// Create itinerary
const itinerary = await createItinerary({
  title: "Bangkok Weekend Trip",
  description: "Exploring temples and markets",
  startDate: "2025-03-15",
  endDate: "2025-03-17",
  tripType: "Leisure",
  destinationCity: "Bangkok",
  destinationCountry: "Thailand",
  totalBudget: 1000,
  currency: "USD"
});

// Add item
await addItineraryItem(itinerary.itineraryId, {
  placeId: "place-uuid",
  dayNumber: 1,
  sortOrder: 1,
  startTime: "09:00",
  endTime: "11:00",
  estimatedDuration: 120,
  activityTitle: "Grand Palace Visit",
  activityType: "Sightseeing",
  estimatedCost: 50,
  bookingStatus: "Confirmed"
});
```

### Exporting to PDF

```typescript
import { exportToPDF } from '@/services/itineraryService';

const pdfBlob = await exportToPDF(itineraryId);
const url = window.URL.createObjectURL(pdfBlob);
const a = document.createElement('a');
a.href = url;
a.download = 'itinerary.pdf';
a.click();
```

### Reordering Items

```typescript
import { reorderItineraryItems } from '@/services/itineraryService';

await reorderItineraryItems(itineraryId, {
  items: [
    { itemId: "item1", newSortOrder: 2, newDayNumber: 1 },
    { itemId: "item2", newSortOrder: 1, newDayNumber: 1 }
  ]
});
```

## Recent Updates

### API Endpoint Changes (Latest)
- Updated PDF export endpoint to `/api/export-to-pdf/{itineraryId}`
- Changed itinerary items endpoints to match new API structure:
  - `/api/itinerary/{itineraryId}/add-item` (single item)
  - `/api/itinerary/{itineraryId}/add-batch` (batch)
  - `/api/itinerary/{itineraryId}/get-all` (get items)
  - `/api/itinerary/delete/{itineraryItemId}` (delete)
  - `/api/itinerary/{itineraryId}/reorder` (reorder)

### Type System Updates
- Updated `CreateItineraryItemRequest` to include new fields:
  - `activityTitle`, `activityDescription`, `activityType`
  - `actualCost`, `transportCost`, `transportDuration`
  - `bookingReference`, `isCompleted`, `completionNotes`
  - Changed `orderInDay` to `sortOrder`
  - Changed `durationMinutes` to `estimatedDuration`

### UI Enhancements
- Added activity title and type fields in AddItemModal
- Added actual cost tracking
- Added transport cost tracking
- Added booking reference field
- Added completion tracking with notes
- Enhanced form layout for better user experience

## Future Enhancements

- [ ] Real-time collaboration on itineraries
- [ ] Integration with booking platforms
- [ ] Weather information integration
- [ ] Budget tracking and alerts
- [ ] Mobile app version
- [ ] Offline mode support
- [ ] AI-powered itinerary suggestions

## Troubleshooting

### Common Issues

**Issue**: PDF export not working
- **Solution**: Ensure the API endpoint is correct and returns blob data

**Issue**: Items not appearing in correct order
- **Solution**: Use the reorder endpoint to adjust sortOrder values

**Issue**: Cost calculations incorrect
- **Solution**: Verify that both estimatedCost and transportCost are included

## Support

For issues or feature requests, please contact the development team or create an issue in the repository.
