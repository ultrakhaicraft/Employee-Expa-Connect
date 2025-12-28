using Application.Interfaces;
using Infrastructure.Models.Chat;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Application.Services
{
    public class IntentDetectionService : IIntentDetectionService
    {
        public Task<IntentResultDto> DetectIntentAsync(string message)
        {
            var messageLower = message.ToLower().Trim();

            // Intent: FOOD_CONSULTATION (Check early - high priority for consultation queries)
            if (IsFoodConsultationIntent(messageLower))
            {
                var foodTopic = ExtractFoodTopic(messageLower);
                var country = ExtractCountry(messageLower);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "FOOD_CONSULTATION",
                    Confidence = 0.9,
                    Reasoning = "User wants food consultation or advice",
                    Slots = new Dictionary<string, string>
                    {
                        { "food_topic", foodTopic },
                        { "country", country }
                    }
                });
            }

            // Intent: CULTURE_CONSULTATION (Check early - high priority for consultation queries)
            if (IsCultureConsultationIntent(messageLower))
            {
                var country = ExtractCountry(messageLower);
                var cultureTopic = ExtractCultureTopic(messageLower);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "CULTURE_CONSULTATION",
                    Confidence = 0.9,
                    Reasoning = "User wants cultural consultation or advice",
                    Slots = new Dictionary<string, string>
                    {
                        { "country", country },
                        { "culture_topic", cultureTopic }
                    }
                });
            }

            // Intent: GET_PLACE_DETAIL_BY_NAME (Highest priority - check first)
            if (IsGetDetailByNameIntent(messageLower))
            {
                var placeName = ExtractPlaceName(message);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "GET_PLACE_DETAIL_BY_NAME",
                    Confidence = 0.9,
                    Reasoning = "User wants details about a place by name",
                    Slots = new Dictionary<string, string>
                    {
                        { "place_name", placeName }
                    }
                });
            }

            // Intent: FIND_NEAREST_PLACES
            if (IsNearestPlacesIntent(messageLower))
            {
                var count = ExtractPlaceCount(messageLower);
                var category = ExtractCategory(messageLower);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "FIND_NEAREST_PLACES",
                    Confidence = 0.95,
                    Reasoning = "User wants to find nearest places",
                    Slots = new Dictionary<string, string>
                    {
                        { "count", count.ToString() },
                        { "category", category }
                    }
                });
            }

            // Intent: FIND_BY_FOOD
            if (IsFindByFoodIntent(messageLower))
            {
                var foodType = ExtractFoodType(messageLower);
                var count = ExtractPlaceCount(messageLower);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "FIND_BY_FOOD",
                    Confidence = 0.9,
                    Reasoning = "User wants to find places by food type",
                    Slots = new Dictionary<string, string>
                    {
                        { "food_type", foodType },
                        { "count", count.ToString() }
                    }
                });
            }

            // Intent: FIND_BY_CATEGORY
            if (IsFindByCategoryIntent(messageLower))
            {
                var category = ExtractCategory(messageLower);
                var count = ExtractPlaceCount(messageLower);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "FIND_BY_CATEGORY",
                    Confidence = 0.9,
                    Reasoning = "User wants to find places by category",
                    Slots = new Dictionary<string, string>
                    {
                        { "category", category },
                        { "count", count.ToString() }
                    }
                });
            }

            // Intent: FIND_BY_PRICE
            if (IsFindByPriceIntent(messageLower))
            {
                var priceLevel = ExtractPriceLevel(messageLower);
                var category = ExtractCategory(messageLower);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "FIND_BY_PRICE",
                    Confidence = 0.85,
                    Reasoning = "User wants to find places by price range",
                    Slots = new Dictionary<string, string>
                    {
                        { "price_level", priceLevel },
                        { "category", category }
                    }
                });
            }

            // Intent: FIND_OPEN_NOW
            if (IsFindOpenNowIntent(messageLower))
            {
                var category = ExtractCategory(messageLower);
                var count = ExtractPlaceCount(messageLower);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "FIND_OPEN_NOW",
                    Confidence = 0.9,
                    Reasoning = "User wants to find places currently open",
                    Slots = new Dictionary<string, string>
                    {
                        { "category", category },
                        { "count", count.ToString() }
                    }
                });
            }

            // Intent: GET_PLACE_DETAIL (by index)
            if (IsGetDetailIntent(messageLower))
            {
                var placeReference = ExtractPlaceReference(messageLower);

                return Task.FromResult(new IntentResultDto
                {
                    Intent = "GET_PLACE_DETAIL",
                    Confidence = 0.85,
                    Reasoning = "User wants details about a specific place",
                    Slots = new Dictionary<string, string>
                    {
                        { "place_reference", placeReference }
                    }
                });
            }

            // GENERAL_CHAT
            return Task.FromResult(new IntentResultDto
            {
                Intent = "GENERAL_CHAT",
                Confidence = 0.7,
                Reasoning = "General conversation",
                Slots = new Dictionary<string, string>()
            });
        }

        // ============= GET DETAIL BY NAME =============

        private bool IsGetDetailByNameIntent(string message)
        {
            // VN & EN question patterns asking for info about a place
            var questionPatterns = new[]
            {
                // Vietnamese
                @"^(thông tin|chi tiết|địa chỉ|sdt|số điện thoại|giờ mở cửa|review)\s+",
                @"\s+(thế nào|ra sao|như thế nào|ở đâu)$",
                @"^cho (tôi|mình) biết (về|thông tin)\s+",

                // English
                @"^(info|information|details?|address|phone|phone number|opening hours?|reviews?)\s+",
                @"^tell me (about|information about)\s+",
                @"(what (is|'s) the (info|information|address|phone|phone number))\s+"
            };

            if (questionPatterns.Any(p => Regex.IsMatch(message, p, RegexOptions.IgnoreCase)))
                return true;

            // Generic search keywords (VN + EN). If none of these appear,
            // the message is likely a place name.
            var searchKeywords = new[]
            {
                // Vietnamese
                "tìm", "tìm kiếm", "gợi ý", "cho tôi", "muốn", "cần", "định",
                "gần", "quanh đây", "xung quanh", "rẻ", "đắt", "mở cửa",

                // English
                "find", "search", "show", "suggest", "near", "nearby",
                "around here", "closest", "cheapest", "expensive", "open now"
            };

            var hasSearchKeyword = searchKeywords.Any(k => message.Contains(k));
            if (!hasSearchKeyword && message.Length > 3)
            {
                return true;
            }

            return false;
        }

        private string ExtractPlaceName(string message)
        {
            // Remove question & place-type prefixes (VN + EN)
            var removePatterns = new[]
            {
                // Vietnamese
                @"^(thông tin|chi tiết|địa chỉ|sdt|số điện thoại|giờ mở cửa|review|về)\s+",
                @"\s+(thế nào|ra sao|như thế nào|ở đâu)$",
                @"^cho (tôi|mình) biết (về|thông tin)\s+",
                @"(quán|nhà hàng|quán ăn|quán cafe)\s+",

                // English
                @"^(info|information|details?|address|phone|phone number|opening hours?|reviews?|about)\s+",
                @"^tell me (about|information about)\s+",
                @"(restaurant|restaurants|cafe|cafes|coffee shop|coffee shops|place|places)\s+"
            };

            var cleanName = message;
            foreach (var pattern in removePatterns)
            {
                cleanName = Regex.Replace(cleanName, pattern, "", RegexOptions.IgnoreCase);
            }

            return cleanName.Trim();
        }

        // ============= NEAREST PLACES =============

        private bool IsNearestPlacesIntent(string message)
        {
            var patterns = new[]
            {
                // Vietnamese
                @"(tìm|tìm kiếm|gợi ý|cho tôi|cho mình)\s*.*\s*(gần|gần đây|gần nhất|quanh đây|xung quanh)",
                @"(quán|nhà hàng|quán ăn|quán cà phê|quán cafe)\s*(gần|gần đây|gần nhất|quanh đây)",
                @"(có|có gì)\s*(gần|quanh đây|xung quanh)",
                @"^\d+\s*(quán|nhà hàng)\s*gần",

                // English
                @"(find|search|show|suggest)\s*.*\s*(near|nearby|closest|nearest|around here)",
                @"(restaurants?|caf(es)?|coffee shops?|places?)\s*(near|nearby|closest|nearest|around here)",
                @"(any|some)\s*(restaurants?|caf(es)?|places?)\s*(near|nearby|around here)",
                @"\b\d+\s*(restaurants?|places?|spots?)\s*(near|nearby|closest|nearest)"
            };

            return patterns.Any(p => Regex.IsMatch(message, p, RegexOptions.IgnoreCase));
        }

        // ============= FIND BY FOOD =============

        private bool IsFindByFoodIntent(string message)
        {
            var foodKeywords = new[]
            {
                // Vietnamese dishes
                "phở", "bún bò", "bún", "cơm", "bánh mì", "hủ tiếu", "mì",
                "bún chả", "cơm tấm", "bánh xèo", "gỏi cuốn", "nem", "chả giò",
                "lẩu", "nướng",

                // International
                "pizza", "burger", "pasta", "sushi", "dimsum", "hotpot", "bbq", "steak"
            };

            return foodKeywords.Any(k => message.Contains(k));
        }

        // ============= FIND BY CATEGORY =============

        private bool IsFindByCategoryIntent(string message)
        {
            var patterns = new[]
            {
                // Vietnamese
                @"(tìm|tìm kiếm|cho tôi)\s*(quán|nhà hàng|quán ăn|quán cafe|quán cà phê)",
                @"(quán|nhà hàng|quán ăn)\s*(nào|gì)",
                @"(muốn|cần|định)\s*(ăn|uống|đi ăn|đi uống)",

                // English
                @"(find|search for|show me)\s*(restaurants?|caf(es)?|coffee shops?|bars?|pubs?)",
                @"(any|some)\s*(restaurants?|caf(es)?|places?)",
                @"(i want|i'd like|we want)\s*(to eat|to drink|food|drinks)"
            };

            return patterns.Any(p => Regex.IsMatch(message, p, RegexOptions.IgnoreCase));
        }

        // ============= FIND BY PRICE =============

        private bool IsFindByPriceIntent(string message)
        {
            var priceKeywords = new[]
            {
                // Vietnamese
                "rẻ", "bình dân", "phải chăng", "tiết kiệm",
                "sang", "cao cấp", "đắt", "hạng sang",

                // English
                "cheap", "affordable", "budget", "budget-friendly", "low price",
                "expensive", "pricey", "luxury", "fine dining", "high-end"
            };

            return priceKeywords.Any(k => message.Contains(k));
        }

        // ============= FIND OPEN NOW =============

        private bool IsFindOpenNowIntent(string message)
        {
            var patterns = new[]
            {
                // Vietnamese
                @"(mở cửa|đang mở|hoạt động)\s*(bây giờ|lúc này|hiện tại)",
                @"(quán|nhà hàng)\s*nào\s*(mở|đang mở)",
                @"(bây giờ|lúc này|giờ này)\s*(có|có gì)\s*(mở)",

                // English
                @"(open now|open right now|currently open)",
                @"(which|what)\s*(restaurants?|places?|caf(es)?).*(open now|open right now)",
                @"(any|some)\s*(places?|restaurants?|caf(es)?)\s*(open now|open right now)"
            };

            return patterns.Any(p => Regex.IsMatch(message, p, RegexOptions.IgnoreCase));
        }

        // ============= GET DETAIL BY INDEX =============

        private bool IsGetDetailIntent(string message)
        {
            var patterns = new[]
            {
                // Vietnamese
                @"(thứ|số)\s*\d+",
                @"(đầu|đầu tiên|thứ nhất)",
                @"(thứ hai|thứ 2)",
                @"(cuối|cuối cùng)",

                // English
                @"\b(first|1st)\b",
                @"\b(second|2nd)\b",
                @"\b(third|3rd)\b",
                @"\b(last|final)\b"
            };

            return patterns.Any(p => Regex.IsMatch(message, p, RegexOptions.IgnoreCase));
        }

        // ============= SLOT EXTRACTORS =============

        private int ExtractPlaceCount(string message)
        {
            // Vietnamese + English units
            var match = Regex.Match(
                message,
                @"\b(\d+)\s*(quán|nhà hàng|địa điểm|chỗ|nơi|restaurants?|places?|spots?)",
                RegexOptions.IgnoreCase);

            if (match.Success && int.TryParse(match.Groups[1].Value, out int count))
            {
                return Math.Min(count, 20);
            }

            return 5;
        }

        private string ExtractCategory(string message)
        {
            var categoryMap = new Dictionary<string, string>
            {
                { "quán ăn|nhà hàng|quán cơm|restaurant|restaurants|food place|food places", "restaurant" },
                { "quán cà phê|quán cafe|coffee shop|coffee shops|coffee|cafe|cafes", "cafe" },
                { "bar|quán bar|pub|pubs|bars", "bar" },
                { "quán ăn vặt|ăn vặt|fast food", "food" },
                { "tiệm bánh|bánh ngọt|bakery|bakeries|cake shop|cake shops", "bakery" },
                { "buffet|tiệc|lẩu|hotpot|bbq", "restaurant" }
            };

            foreach (var kvp in categoryMap)
            {
                if (Regex.IsMatch(message, kvp.Key, RegexOptions.IgnoreCase))
                {
                    return kvp.Value;
                }
            }

            return "restaurant";
        }

        private string ExtractFoodType(string message)
        {
            var foodMap = new Dictionary<string, string>
            {
                { "phở", "pho" },
                { "bún bò", "bun bo hue" },
                { "bún", "bun" },
                { "cơm tấm", "com tam" },
                { "bánh mì", "banh mi" },
                { "lẩu", "hotpot" },
                { "nướng|bbq", "bbq" },
                { "pizza", "pizza" },
                { "burger", "burger" },
                { "sushi", "sushi" }
            };

            foreach (var kvp in foodMap)
            {
                if (Regex.IsMatch(message, kvp.Key, RegexOptions.IgnoreCase))
                {
                    return kvp.Value;
                }
            }

            return "food";
        }

        private string ExtractPriceLevel(string message)
        {
            if (Regex.IsMatch(message, @"rẻ|bình dân|phải chăng|tiết kiệm|cheap|affordable|budget(-friendly)?|low price",
                RegexOptions.IgnoreCase))
                return "cheap";

            if (Regex.IsMatch(message, @"sang|cao cấp|đắt|hạng sang|luxury|expensive|pricey|fine dining|high-end",
                RegexOptions.IgnoreCase))
                return "expensive";

            return "moderate";
        }

        private string ExtractPlaceReference(string message)
        {
            // By number: "thứ 2", "số 3", "2nd", "3rd"
            var numberMatch = Regex.Match(message, @"(thứ|số)\s*(\d+)", RegexOptions.IgnoreCase);
            if (numberMatch.Success)
            {
                return $"place_{numberMatch.Groups[2].Value}";
            }

            var englishNumberMatch = Regex.Match(message, @"\b(\d+)(st|nd|rd|th)\b", RegexOptions.IgnoreCase);
            if (englishNumberMatch.Success)
            {
                return $"place_{englishNumberMatch.Groups[1].Value}";
            }

            // Ordinals
            if (Regex.IsMatch(message, @"(đầu|đầu tiên|thứ nhất|first|1st)", RegexOptions.IgnoreCase))
                return "place_1";

            if (Regex.IsMatch(message, @"(thứ hai|thứ 2|second|2nd)", RegexOptions.IgnoreCase))
                return "place_2";

            if (Regex.IsMatch(message, @"(cuối|cuối cùng|last|final)", RegexOptions.IgnoreCase))
                return "place_last";

            return "place_1";
        }

        // ============= FOOD CONSULTATION =============

        private bool IsFoodConsultationIntent(string message)
        {
            // Check for explicit consultation keywords first
            if (Regex.IsMatch(message, @"\b(tư vấn|hỏi về|consultation|advice|recommend)\b", RegexOptions.IgnoreCase))
            {
                var foodKeywords = new[] { "đồ ăn", "món ăn", "ẩm thực", "thức ăn", "đồ uống", "food", "cuisine", "dish", "dishes" };
                if (foodKeywords.Any(k => message.Contains(k)))
                {
                    return true;
                }
            }

            // Check for "tell me about" + food keywords (flexible pattern)
            if (Regex.IsMatch(message, @"\b(tell me about|tell me|what about|what is|what are|information about|learn about|can you tell me about)\b", RegexOptions.IgnoreCase))
            {
                var foodKeywords = new[] { 
                    "đồ ăn", "món ăn", "ẩm thực", "thức ăn", "đồ uống",
                    "food", "cuisine", "dish", "dishes", "dish", "cuisines",
                    "vietnamese food", "thai food", "japanese food", "korean food", "chinese food",
                    "vietnamese dishes", "thai dishes", "japanese dishes", "korean dishes", "chinese dishes",
                    "vietnamese cuisine", "thai cuisine", "japanese cuisine", "korean cuisine", "chinese cuisine"
                };
                if (foodKeywords.Any(k => message.Contains(k, StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }

            // Check for food + country patterns
            if (Regex.IsMatch(message, @"\b(vietnamese|thai|japanese|korean|chinese|vietnam|thailand|japan|korea)\s+(food|cuisine|dishes?|dish)\b", RegexOptions.IgnoreCase))
            {
                return true;
            }

            // Check for food descriptors + food keywords
            if (Regex.IsMatch(message, @"\b(famous|traditional|popular|local|authentic|typical|signature|must-try)\s+.*\s+(food|cuisine|dishes?|dish)\b", RegexOptions.IgnoreCase))
            {
                return true;
            }

            var patterns = new[]
            {
                // Vietnamese - explicit consultation patterns
                @"(tư vấn|hỏi về)\s+(về\s+)?(đồ ăn|món ăn|ẩm thực|thức ăn|đồ uống)",
                @"(tư vấn|hỏi về)\s+(đồ ăn|món ăn|ẩm thực)\s+(việt nam|vietnam|thái lan|thailand|nhật|japan|hàn|korea|trung|china)",
                @"(tư vấn|hỏi về)\s+(ẩm thực|đồ ăn|món ăn)\s+(của|từ)\s+(việt nam|vietnam|thái lan|thailand|nhật|japan|hàn|korea|trung|china)",
                @"(cho tôi biết về|tell me about)\s+(đồ ăn|món ăn|ẩm thực|food|cuisine)",
                @"(món ăn|đồ ăn|ẩm thực)\s+(nào|gì|thế nào|ra sao|what|which)",
                @"(cách|hướng dẫn|how to)\s+(nấu|chế biến|ăn|thưởng thức|cook|eat)\s+(món|đồ ăn|food|dish)",
                @"(giới thiệu|review|đánh giá|introduce)\s+(về|món|đồ ăn|food|about)",
                @"(ăn|thử|nên ăn|should eat|try)\s+(gì|món gì|đồ gì|what)",
                @"(món|đồ ăn|food)\s+(nổi tiếng|đặc sản|truyền thống|famous|traditional|popular)",
                @"(đồ ăn|món ăn|ẩm thực|food|cuisine)\s+(việt nam|vietnam|thái lan|thailand|nhật|japan|hàn|korea|trung|china)",

                // English - comprehensive patterns
                @"(food|cuisine|dish)\s+(consultation|advice|recommendation)",
                @"(what|which|how)\s+(food|dish|cuisine|to eat|should i eat)",
                @"(recommend|suggest|advise)\s+(food|dish|cuisine|what to eat)",
                @"(tell me about|information about|learn about|can you tell me about)\s+(food|cuisine|dishes)",
                @"(tell me about|tell me)\s+.*\s+(food|cuisine|dishes?|dish)",
                @"(traditional|famous|popular|local|authentic|typical|signature|must-try)\s+(food|dish|cuisine)",
                @"(food|cuisine)\s+(of|from|in)\s+(vietnam|thailand|japan|korea|china|viet nam)",
                @"(vietnamese|thai|japanese|korean|chinese)\s+(food|cuisine|dishes?|dish)",
                @"(famous|traditional|popular|local)\s+(vietnamese|thai|japanese|korean|chinese)\s+(food|cuisine|dishes?|dish)",
                @"(tell me about|what are|what is)\s+(famous|traditional|popular|local)\s+(food|cuisine|dishes?|dish)"
            };

            return patterns.Any(p => Regex.IsMatch(message, p, RegexOptions.IgnoreCase));
        }

        private string ExtractFoodTopic(string message)
        {
            var foodTopics = new Dictionary<string, string>
            {
                { "cách nấu|how to cook|recipe|hướng dẫn nấu", "cooking" },
                { "món nổi tiếng|famous dish|popular dish|đặc sản", "famous_dishes" },
                { "món truyền thống|traditional food|traditional dish", "traditional" },
                { "ăn gì|what to eat|nên ăn", "recommendation" },
                { "đánh giá|review|giới thiệu", "review" },
                { "ẩm thực|cuisine|food culture", "cuisine" }
            };

            foreach (var kvp in foodTopics)
            {
                if (Regex.IsMatch(message, kvp.Key, RegexOptions.IgnoreCase))
                {
                    return kvp.Value;
                }
            }

            return "general";
        }

        // ============= CULTURE CONSULTATION =============

        private bool IsCultureConsultationIntent(string message)
        {
            // Check for "tell me about" + culture keywords (flexible pattern)
            if (Regex.IsMatch(message, @"\b(tell me about|tell me|what about|what is|what are|information about|learn about|can you tell me about)\b", RegexOptions.IgnoreCase))
            {
                var cultureKeywords = new[] { 
                    "văn hóa", "phong tục", "tập quán",
                    "culture", "cultural", "customs", "traditions", "etiquette", "manners",
                    "vietnamese culture", "thai culture", "japanese culture", "korean culture", "chinese culture"
                };
                if (cultureKeywords.Any(k => message.Contains(k, StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }

            // Check for country + culture patterns
            if (Regex.IsMatch(message, @"\b(vietnamese|thai|japanese|korean|chinese|vietnam|thailand|japan|korea)\s+(culture|cultural|customs|traditions|etiquette)\b", RegexOptions.IgnoreCase))
            {
                return true;
            }

            var patterns = new[]
            {
                // Vietnamese
                @"(tư vấn|hỏi|cho tôi biết về|tìm hiểu về)\s*(văn hóa|culture|cultural)",
                @"(tư vấn|hỏi về)\s*(văn hóa)\s+(việt nam|vietnam|thái lan|thailand|nhật|japan|hàn|korea|trung|china)",
                @"(văn hóa|culture)\s*(của|từ|ở)\s*(việt nam|vietnam|thái lan|thailand|nhật|japan|hàn|korea|trung|china)",
                @"(phong tục|tập quán|custom|tradition|etiquette)",
                @"(văn hóa|culture)\s*(nào|gì|thế nào|ra sao)",
                @"(tư vấn|hỏi về)\s*(văn hóa|phong tục|tập quán)",
                @"(cách|hướng dẫn)\s*(ứng xử|giao tiếp|behavior|etiquette)",
                @"(lễ hội|festival|traditions|truyền thống)",

                // English - comprehensive patterns
                @"(culture|cultural|customs|traditions|etiquette)",
                @"(what|tell me about|information about|learn about|can you tell me about)\s*(culture|cultural|customs)",
                @"(tell me about|tell me)\s+.*\s+(culture|cultural|customs)",
                @"(culture|cultural|customs)\s*(of|from|in)\s*(vietnam|thailand|japan|korea|china|viet nam)",
                @"(cultural|culture)\s*(advice|consultation|information|tips)",
                @"(how to|etiquette|behavior|manners)\s*(in|at|for)",
                @"(vietnamese|thai|japanese|korean|chinese)\s+(culture|cultural|customs|traditions|etiquette)",
                @"(tell me about|what is|what are)\s+(vietnamese|thai|japanese|korean|chinese)\s+(culture|cultural|customs)"
            };

            return patterns.Any(p => Regex.IsMatch(message, p, RegexOptions.IgnoreCase));
        }

        private string ExtractCultureTopic(string message)
        {
            var cultureTopics = new Dictionary<string, string>
            {
                { "phong tục|etiquette|manners|behavior", "etiquette" },
                { "lễ hội|festival|traditions|truyền thống", "festivals" },
                { "tập quán|customs|practices", "customs" },
                { "giao tiếp|communication|social", "communication" },
                { "tôn giáo|religion|religious", "religion" },
                { "lịch sử|history|historical", "history" }
            };

            foreach (var kvp in cultureTopics)
            {
                if (Regex.IsMatch(message, kvp.Key, RegexOptions.IgnoreCase))
                {
                    return kvp.Value;
                }
            }

            return "general";
        }

        private string ExtractCountry(string message)
        {
            var countryMap = new Dictionary<string, string>
            {
                { "việt nam|vietnam|viet nam|vn", "vietnam" },
                { "thái lan|thailand|thai", "thailand" },
                { "nhật|japan|japanese", "japan" },
                { "hàn|korea|korean", "korea" },
                { "trung|china|chinese", "china" },
                { "singapore|sing", "singapore" },
                { "malaysia|malay", "malaysia" },
                { "indonesia|indo", "indonesia" },
                { "philippines|phil", "philippines" }
            };

            foreach (var kvp in countryMap)
            {
                if (Regex.IsMatch(message, kvp.Key, RegexOptions.IgnoreCase))
                {
                    return kvp.Value;
                }
            }

            return "general";
        }
    }
}
