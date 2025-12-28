using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Enums
{
	public enum NotificationMessageType
	{
		None = 0,
		DataCreated = 1,
		DataDeleted = 2,
		DataUpdated = 3,
		DataViewed = 4
	}
}
