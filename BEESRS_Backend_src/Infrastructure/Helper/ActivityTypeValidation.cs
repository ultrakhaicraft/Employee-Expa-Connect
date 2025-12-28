using Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace Infrastructure.Helper
{
	public class ActivityTypeValidationAttribute : ValidationAttribute
	{
		protected override ValidationResult IsValid(object value, ValidationContext validationContext)
		{
			if (value is string strValue && !string.IsNullOrWhiteSpace(strValue))
			{
				if (System.Enum.TryParse(typeof(ActivityType), strValue, true, out _))
				{
					return ValidationResult.Success;
				}
			}

			return new ValidationResult($"Invalid ActivityType: {value}. Must be one of: {string.Join(", ", System.Enum.GetNames(typeof(ActivityType)))}");
		}
	}
}
