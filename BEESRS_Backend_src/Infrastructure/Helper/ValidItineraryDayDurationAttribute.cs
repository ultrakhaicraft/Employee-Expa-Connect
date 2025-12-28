using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Helper
{
	public class ValidItineraryDayDurationAttribute : ValidationAttribute
	{
		private readonly int _maxDays;

		public ValidItineraryDayDurationAttribute(int maxDays)
		{
			_maxDays = maxDays;
			ErrorMessage = $"The date range cannot exceed {_maxDays} days.";
		}

		protected override ValidationResult IsValid(object value, ValidationContext validationContext)
		{
			var dto = validationContext.ObjectInstance;

			var startDateProp = validationContext.ObjectType.GetProperty("StartDate");
			var endDateProp = validationContext.ObjectType.GetProperty("EndDate");

			if (startDateProp == null || endDateProp == null)
				return ValidationResult.Success;

			var startDate = (DateTime)startDateProp.GetValue(dto);
			var endDate = (DateTime)endDateProp.GetValue(dto);

			if (endDate < startDate)
				return new ValidationResult("EndDate must be greater than or equal to StartDate.");

			if ((endDate - startDate).TotalDays > _maxDays)
				return new ValidationResult(ErrorMessage);

			return ValidationResult.Success;
		}
	}
}
