using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Application.Helper
{
	/// <summary>
	/// Handle serialization and deserialization of TimeSpan values from string format "HH:mm:ss" or "HH:mm"
	/// Supports both TimeSpan and TimeSpan? (nullable)
	/// </summary>
	public class TimeSpanConverter : JsonConverterFactory
	{
		public override bool CanConvert(Type typeToConvert)
		{
			return typeToConvert == typeof(TimeSpan) || typeToConvert == typeof(TimeSpan?);
		}

		public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
		{
			if (typeToConvert == typeof(TimeSpan))
			{
				return new TimeSpanNonNullableConverter();
			}
			else if (typeToConvert == typeof(TimeSpan?))
			{
				return new TimeSpanNullableConverter();
			}

			throw new NotSupportedException($"Cannot create converter for type {typeToConvert}");
		}

		private class TimeSpanNonNullableConverter : JsonConverter<TimeSpan>
		{
			public override TimeSpan Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
			{
				if (reader.TokenType == JsonTokenType.String)
				{
					var str = reader.GetString();
					if (string.IsNullOrWhiteSpace(str))
						return TimeSpan.Zero;

					// Parse manually to ensure correct format "HH:mm:ss"
					var parts = str.Split(':');
					if (parts.Length >= 2)
					{
						if (int.TryParse(parts[0], out var hours) && 
						    int.TryParse(parts[1], out var minutes))
						{
							var seconds = parts.Length >= 3 && int.TryParse(parts[2], out var sec) ? sec : 0;
							
							// Validate ranges
							if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60)
							{
								return new TimeSpan(hours, minutes, seconds);
							}
						}
					}

					// Fallback: Try standard parsing
					if (TimeSpan.TryParse(str, out var timeSpan))
					{
						return timeSpan;
					}

					// If parsing fails, return zero (will trigger validation error)
					return TimeSpan.Zero;
				}

				// If not a string, try to read as number (ticks)
				if (reader.TokenType == JsonTokenType.Number)
				{
					var ticks = reader.GetInt64();
					return new TimeSpan(ticks);
				}

				return TimeSpan.Zero;
			}

			public override void Write(Utf8JsonWriter writer, TimeSpan value, JsonSerializerOptions options)
			{
				// Write TimeSpan as "HH:mm:ss" format (24-hour format)
				// Use "HH" for 24-hour format (00-23), not "hh" (01-12)
				var hours = value.Hours.ToString("00");
				var minutes = value.Minutes.ToString("00");
				var seconds = value.Seconds.ToString("00");
				writer.WriteStringValue($"{hours}:{minutes}:{seconds}");
			}
		}

		private class TimeSpanNullableConverter : JsonConverter<TimeSpan?>
		{
			public override TimeSpan? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
			{
				if (reader.TokenType == JsonTokenType.Null)
					return null;

				if (reader.TokenType == JsonTokenType.String)
				{
					var str = reader.GetString();
					if (string.IsNullOrWhiteSpace(str))
						return null;

					// Parse manually to ensure correct format "HH:mm:ss"
					var parts = str.Split(':');
					if (parts.Length >= 2)
					{
						if (int.TryParse(parts[0], out var hours) && 
						    int.TryParse(parts[1], out var minutes))
						{
							var seconds = parts.Length >= 3 && int.TryParse(parts[2], out var sec) ? sec : 0;
							
							// Validate ranges
							if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60)
							{
								return new TimeSpan(hours, minutes, seconds);
							}
						}
					}

					// Fallback: Try standard parsing
					if (TimeSpan.TryParse(str, out var timeSpan))
					{
						return timeSpan;
					}

					// If parsing fails, return null (will trigger validation error)
					return null;
				}

				// If not a string, try to read as number (ticks)
				if (reader.TokenType == JsonTokenType.Number)
				{
					var ticks = reader.GetInt64();
					return new TimeSpan(ticks);
				}

				return null;
			}

			public override void Write(Utf8JsonWriter writer, TimeSpan? value, JsonSerializerOptions options)
			{
				if (value == null)
				{
					writer.WriteNullValue();
					return;
				}

				// Write TimeSpan as "HH:mm:ss" format (24-hour format)
				// Use "HH" for 24-hour format (00-23), not "hh" (01-12)
				var hours = value.Value.Hours.ToString("00");
				var minutes = value.Value.Minutes.ToString("00");
				var seconds = value.Value.Seconds.ToString("00");
				writer.WriteStringValue($"{hours}:{minutes}:{seconds}");
			}
		}
	}
}

