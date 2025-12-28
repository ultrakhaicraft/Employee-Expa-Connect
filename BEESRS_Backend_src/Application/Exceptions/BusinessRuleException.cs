using System;

namespace Application.Exceptions
{
    public class BusinessRuleException : Exception
    {
        public string RuleCode { get; }

        public BusinessRuleException(string message, string ruleCode = null) 
            : base(message)
        {
            RuleCode = ruleCode;
        }
    }
}



















































































