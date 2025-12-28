using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.NotificationDTO
{

	//Use for boardcast, notify and stuff
	public class GeneralNotificationMessage
	{
		public required string Title { get; set; }
		public required string Message { get; set; }
		public string Type { get; set; } = "Success"; //Success, Error, Info
		public Guid? SenderId { get; set; } = Guid.Empty;  //User send (If setting SenderID isn't possible, use Guid.Empty)
		public Guid? TargetUserId { get; set; } = Guid.Empty; //Send to userId (optional)
		public string SenderRole { get; set; } = string.Empty; //Role of the user send to userId whenever possible
		public string? TargetRole { get; set; } = string.Empty; //Send to role group (optional)
		public DateTimeOffset SentAt { get; set; } = DateTimeOffset.UtcNow;

	}

	public class OnConnectedMessage
	{
		public required string Message { get; set; }
		public string Type = "User connection";
		public required Guid CurrentUserID { get; set; }
		public required string CurrentUserRole { get; set; }
		public DateTimeOffset ConnectAt { get; set; } = DateTimeOffset.UtcNow;
	}
}
