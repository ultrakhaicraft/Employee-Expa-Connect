using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Helper
{
	[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
	public class ValidTimeRangeAttribute : ValidationAttribute
	{
		public string StartProperty { get; }
		public string EndProperty { get; }

		public ValidTimeRangeAttribute(string startProperty, string endProperty)
		{
			StartProperty = startProperty;
			EndProperty = endProperty;
			ErrorMessage = "Start time must be earlier than end time.";
		}

		protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
		{
			if (value == null)
				return ValidationResult.Success;

			//var type = validationContext.ObjectType;
			var type = value.GetType(); //Get type during runtime instead


			var startProp = type.GetProperty(StartProperty, BindingFlags.Public | BindingFlags.Instance);
			var endProp = type.GetProperty(EndProperty, BindingFlags.Public | BindingFlags.Instance);

			//Check if properties exist
			if (startProp == null || endProp == null)
				return new ValidationResult($"Properties '{StartProperty}' or '{EndProperty}' not found.");

			var startValue = startProp.GetValue(value) as TimeSpan?;
			var endValue = endProp.GetValue(value) as TimeSpan?;

			if (startValue == null || endValue == null)
				return ValidationResult.Success;

			//Check that start time is before end time
			if (startValue >= endValue)
				return new ValidationResult(ErrorMessage ?? "Start time must be earlier than end time.");

			//Check that duration between them is at least 30 minutes
			var duration = endValue.Value - startValue.Value;
			if (duration.TotalMinutes < 30)
				return new ValidationResult("The duration between start and end time must be at least 30 minutes.");

			return ValidationResult.Success;
		}
	}
}
