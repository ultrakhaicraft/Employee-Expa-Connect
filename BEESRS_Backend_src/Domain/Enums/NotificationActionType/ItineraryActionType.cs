using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Enums.NotificationActionType
{
	public enum ItineraryActionType
	{
		Create,
		Delete,
		Update,
		Duplicate,
		AddImage,
		EnableShare, //Itinerary owner perform share
		ReceivedShare, //Friend receive share from Itinerary owner
		RevokeShare
	}
}
