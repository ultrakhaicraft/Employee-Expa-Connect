using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IEmailService
    {
        Task<bool> SendVerificationEmailAsync(string email, string otpCode);
        Task<bool> SendWelcomeEmailAsync(string email, string fullName);
        Task<bool> SendPasswordResetEmailAsync(string email, string firstName, string resetLink);
        Task<bool> SendPasswordChangedNotificationAsync(string email, string firstName);
        Task<bool> SendEventShareEmailAsync(string email, Domain.Entities.Event eventEntity, string organizerName, string shareLink);
        Task<bool> SendEventCancellationEmailAsync(string email, Domain.Entities.Event eventEntity, string organizerName, string cancellationReason);
        Task<bool> SendEventReminderEmailAsync(string email, Domain.Entities.Event eventEntity, string reminderType);
        Task<bool> SendEventRescheduleEmailAsync(string email, Domain.Entities.Event eventEntity, string organizerName, string reason, DateTime previousDate, TimeSpan previousTime);
        Task<bool> SendVotingDeadlineReminderEmailAsync(string email, Domain.Entities.Event eventEntity);
        Task<bool> SendRsvpDeadlineReminderEmailAsync(string email, Domain.Entities.Event eventEntity);
    }
}
