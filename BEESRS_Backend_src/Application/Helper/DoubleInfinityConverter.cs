using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Application.Helper
{

	/// <summary>
	/// Handle serialization and deserialization of double values, converting NaN and Infinity to default(double) (0.0)
	/// </summary>
	public class DoubleInfinityConverter : JsonConverter<double>
	{
		public override double Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
		{
			if (reader.TokenType == JsonTokenType.String)
			{
				var str = reader.GetString();
				if (string.Equals(str, "Infinity", StringComparison.OrdinalIgnoreCase))
					return double.PositiveInfinity;
				if (string.Equals(str, "-Infinity", StringComparison.OrdinalIgnoreCase))
					return double.NegativeInfinity;
				if (string.Equals(str, "NaN", StringComparison.OrdinalIgnoreCase))
					return double.NaN;

				if (double.TryParse(str, out var result))
					return result;

				return 0;
			}

			if (reader.TokenType == JsonTokenType.Number)
				return reader.GetDouble();

			return 0;
		}

		public override void Write(Utf8JsonWriter writer, double value, JsonSerializerOptions options)
		{
			if (double.IsPositiveInfinity(value))
				writer.WriteStringValue("Infinity");
			else if (double.IsNegativeInfinity(value))
				writer.WriteStringValue("-Infinity");
			else if (double.IsNaN(value))
				writer.WriteStringValue("NaN");
			else
				writer.WriteNumberValue(value);
		}
	}
}