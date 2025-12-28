using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Application.Helper
{
	public static class ExtractVehicleDescriptionHelper
	{
		private static readonly Regex StartRegex = new(@"StartItemId:\s*([0-9a-fA-F\-]+)", RegexOptions.Compiled);
		private static readonly Regex EndRegex = new(@"EndItemId:\s*([0-9a-fA-F\-]+)", RegexOptions.Compiled);

		public static (Guid? StartId, Guid? EndId) ExtractItemIds(string? description)
		{
			if (string.IsNullOrWhiteSpace(description))
				return (null, null);

			Guid? startId = null;
			Guid? endId = null;

			var startMatch = StartRegex.Match(description);
			if (startMatch.Success && Guid.TryParse(startMatch.Groups[1].Value, out var sId))
				startId = sId;

			var endMatch = EndRegex.Match(description);
			if (endMatch.Success && Guid.TryParse(endMatch.Groups[1].Value, out var eId))
				endId = eId;

			return (startId, endId);
		}
	}
}
