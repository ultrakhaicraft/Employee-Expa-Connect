using Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendVerificationEmailAsync(string email, string otpCode)
        {
            try
            {
                var subject = "BEESRS - Email Verification Code";
                var body = GetVerificationEmailTemplate(otpCode);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending verification email to: {Email}", email);
                return false;
            }
        }

        public async Task<bool> SendWelcomeEmailAsync(string email, string fullName)
        {
            try
            {
                var subject = "Welcome to BEESRS - Your Account is Ready!";
                var body = GetWelcomeEmailTemplate(fullName);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending welcome email to: {Email}", email);
                return false;
            }
        }

        public async Task<bool> SendPasswordResetEmailAsync(string email, string firstName, string resetLink)
        {
            try
            {
                var subject = "BEESRS - Password Reset Request";
                var body = GetPasswordResetEmailTemplate(firstName, resetLink);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending password reset email to: {Email}", email);
                return false;
            }
        }

        public async Task<bool> SendPasswordChangedNotificationAsync(string email, string firstName)
        {
            try
            {
                var subject = "BEESRS - Password Changed Successfully";
                var body = GetPasswordChangedEmailTemplate(firstName);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending password changed notification to: {Email}", email);
                return false;
            }
        }

        public async Task<bool> SendEventShareEmailAsync(string email, Domain.Entities.Event eventEntity, string organizerName, string shareLink)
        {
            try
            {
                var subject = $"BEESRS - Event Shared: {eventEntity.Title}";
                var body = GetEventShareEmailTemplate(eventEntity, organizerName, shareLink);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending event share email to: {Email}", email);
                return false;
            }
        }

        public async Task<bool> SendEventCancellationEmailAsync(string email, Domain.Entities.Event eventEntity, string organizerName, string cancellationReason)
        {
            try
            {
                var subject = $"BEESRS - Event Cancelled: {eventEntity.Title}";
                var body = GetEventCancellationEmailTemplate(eventEntity, organizerName, cancellationReason);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending event cancellation email to: {Email}", email);
                return false;
            }
        }

        private async Task<bool> SendEmailAsync(string to, string subject, string body)
        {
            try
            {
                var emailSettings = _configuration.GetSection("EmailSettings");
                var smtpHost = emailSettings["SmtpHost"];
                var smtpPort = int.Parse(emailSettings["SmtpPort"] ?? "587");
                var fromEmail = emailSettings["FromEmail"];
                var fromName = emailSettings["FromName"];
                var username = emailSettings["Username"];
                var password = emailSettings["Password"];
                var enableSsl = bool.Parse(emailSettings["EnableSsl"] ?? "true");

                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = enableSsl
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true,
                    BodyEncoding = Encoding.UTF8,
                    SubjectEncoding = Encoding.UTF8
                };

                mailMessage.To.Add(to);

                await client.SendMailAsync(mailMessage);

                _logger.LogInformation("Email sent successfully to: {Email}", to);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to: {Email}", to);
                return false;
            }
        }

        private static string GetVerificationEmailTemplate(string otpCode)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Email Verification</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .otp-code {{ font-size: 24px; font-weight: bold; color: #007bff; text-align: center; padding: 15px; background-color: #e9ecef; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>BEESRS Email Verification</h1>
        </div>
        <div class='content'>
            <h2>Welcome to BEESRS!</h2>
            <p>Thank you for registering with BEESRS. To complete your account setup, please verify your email address using the verification code below:</p>
            
            <div class='otp-code'>{otpCode}</div>
            
            <p>This verification code will expire in 10 minutes for security reasons.</p>
            
            <p>If you didn't create an account with BEESRS, please ignore this email.</p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        private static string GetWelcomeEmailTemplate(string fullName)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Welcome to BEESRS</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .feature {{ background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Welcome to BEESRS!</h1>
        </div>
        <div class='content'>
            <h2>Hello {fullName},</h2>
            <p>Your email has been successfully verified and your BEESRS account is now active!</p>
            
            <p>BEESRS (Broadcom Employee Eating & Sight Recommendation System) is designed to help you discover the best dining and sightseeing experiences. Here's what you can do:</p>
            
            <div class='feature'>
                <h3>🍽️ Discover Great Food</h3>
                <p>Find restaurants and food spots tailored to your preferences and budget.</p>
            </div>
            
            <div class='feature'>
                <h3>🗺️ Explore Attractions</h3>
                <p>Discover interesting sights and attractions in your area or travel destinations.</p>
            </div>
            
            <div class='feature'>
                <h3>👥 Team Events</h3>
                <p>Organize and participate in team lunches, dinners, and group activities.</p>
            </div>
            
            <div class='feature'>
                <h3>🤖 AI Assistant</h3>
                <p>Get personalized recommendations and cultural advice from our AI chatbot.</p>
            </div>
            
            <p>Ready to get started? Log in to your account and begin exploring!</p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        private static string GetPasswordResetEmailTemplate(string firstName, string resetLink)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Password Reset Request</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #ffc107; color: #212529; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .reset-button {{ display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Password Reset Request</h1>
        </div>
        <div class='content'>
            <h2>Hello {firstName},</h2>
            <p>We received a request to reset your BEESRS account password. If you made this request, click the button below to reset your password:</p>
            
            <div style='text-align: center;'>
                <a href='{resetLink}' class='reset-button'>Reset My Password</a>
            </div>
            
            <div class='warning'>
                <strong>Important:</strong>
                <ul>
                    <li>This reset link will expire in 1 hour for security reasons</li>
                    <li>You can only use this link once</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                </ul>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style='word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 3px;'>{resetLink}</p>
            
            <p>If you continue to have problems, please contact our support team.</p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        private static string GetPasswordChangedEmailTemplate(string firstName)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Password Changed Successfully</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .security-notice {{ background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Password Changed Successfully</h1>
        </div>
        <div class='content'>
            <h2>Hello {firstName},</h2>
            <p>This email confirms that your BEESRS account password has been successfully changed.</p>
            
            <div class='security-notice'>
                <strong>Security Information:</strong>
                <ul>
                    <li>Your password was changed on {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</li>
                    <li>All existing sessions have been logged out for security</li>
                    <li>You'll need to log in again with your new password</li>
                </ul>
            </div>
            
            <p>If you didn't make this change, please contact our support team immediately as your account may have been compromised.</p>
            
            <p>For your security, we recommend:</p>
            <ul>
                <li>Using a strong, unique password</li>
                <li>Not sharing your login credentials</li>
                <li>Logging out from shared devices</li>
            </ul>
            
            <p>Thank you for keeping your account secure.</p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        private static string GetEventShareEmailTemplate(Domain.Entities.Event eventEntity, string organizerName, string shareLink)
        {
            var eventDate = eventEntity.ScheduledDate.ToString("dddd, MMMM dd, yyyy");
            var eventTime = eventEntity.ScheduledTime.ToString(@"hh\:mm");
            var description = string.IsNullOrWhiteSpace(eventEntity.Description) ? "No description provided." : eventEntity.Description;
            var budgetInfo = eventEntity.BudgetPerPerson > 0 
                ? $"{eventEntity.BudgetPerPerson:N2} USD per person" 
                : "Not specified";
            var status = eventEntity.Status ?? "Unknown";

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Event Shared with You</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .event-card {{ background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .event-title {{ font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 15px; }}
        .event-detail {{ margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }}
        .event-detail:last-child {{ border-bottom: none; }}
        .event-detail-label {{ font-weight: bold; color: #666; display: inline-block; width: 150px; }}
        .event-detail-value {{ color: #333; }}
        .view-button {{ display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; text-align: center; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Event Shared with You</h1>
        </div>
        <div class='content'>
            <h2>Hello,</h2>
            <p><strong>{organizerName}</strong> has shared an event with you on BEESRS. Here are the event details:</p>
            
            <div class='event-card'>
                <div class='event-title'>{eventEntity.Title}</div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Description:</span>
                    <span class='event-detail-value'>{description}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Event Type:</span>
                    <span class='event-detail-value'>{eventEntity.EventType ?? "N/A"}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Date:</span>
                    <span class='event-detail-value'>{eventDate}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Time:</span>
                    <span class='event-detail-value'>{eventTime}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Expected Attendees:</span>
                    <span class='event-detail-value'>{eventEntity.ExpectedAttendees} people</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Budget:</span>
                    <span class='event-detail-value'>{budgetInfo}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Status:</span>
                    <span class='event-detail-value'>{status}</span>
                </div>
            </div>
            
            <div style='text-align: center;'>
                <a href='{shareLink}' class='view-button'>View Event Details</a>
            </div>
            
            <p style='margin-top: 20px;'>Click the button above to view the full event details and join the event if you're interested.</p>
            
            <p>If you have any questions, please contact the event organizer: <strong>{organizerName}</strong></p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
            <p>This email was sent because {organizerName} shared an event with you.</p>
        </div>
    </div>
</body>
</html>";
        }

        private static string GetEventCancellationEmailTemplate(Domain.Entities.Event eventEntity, string organizerName, string cancellationReason)
        {
            var eventDate = eventEntity.ScheduledDate.ToString("dddd, MMMM dd, yyyy");
            var eventTime = eventEntity.ScheduledTime.ToString(@"hh\:mm");
            var cancellationDate = DateTimeOffset.UtcNow.ToString("dddd, MMMM dd, yyyy 'at' HH:mm");
            var reason = string.IsNullOrWhiteSpace(cancellationReason) ? "No reason provided by the organizer." : cancellationReason;

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Event Cancelled</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #dc3545; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .event-card {{ background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #dc3545; }}
        .event-title {{ font-size: 24px; font-weight: bold; color: #dc3545; margin-bottom: 15px; }}
        .event-detail {{ margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }}
        .event-detail:last-child {{ border-bottom: none; }}
        .event-detail-label {{ font-weight: bold; color: #666; display: inline-block; width: 150px; }}
        .event-detail-value {{ color: #333; }}
        .cancellation-notice {{ background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .reason-box {{ background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; border-radius: 4px; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>⚠️ Event Cancelled</h1>
        </div>
        <div class='content'>
            <h2>Hello,</h2>
            <p>We regret to inform you that the event you were invited to has been <strong>cancelled</strong> by the organizer.</p>
            
            <div class='cancellation-notice'>
                <strong>⚠️ Important:</strong> This event will no longer take place as scheduled.
            </div>
            
            <div class='event-card'>
                <div class='event-title'>{eventEntity.Title}</div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Organizer:</span>
                    <span class='event-detail-value'>{organizerName}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Scheduled Date:</span>
                    <span class='event-detail-value'>{eventDate}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Scheduled Time:</span>
                    <span class='event-detail-value'>{eventTime}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Cancelled On:</span>
                    <span class='event-detail-value'>{cancellationDate} UTC</span>
                </div>
            </div>
            
            <div class='reason-box'>
                <strong>📝 Cancellation Reason:</strong>
                <p style='margin-top: 10px;'>{reason}</p>
            </div>
            
            <p>We apologize for any inconvenience this may cause. If you have any questions, please contact the event organizer: <strong>{organizerName}</strong></p>
            
            <p>Thank you for your understanding.</p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
            <p>This is an automated notification about event cancellation.</p>
        </div>
    </div>
</body>
</html>";
        }

        public async Task<bool> SendEventReminderEmailAsync(string email, Domain.Entities.Event eventEntity, string reminderType)
        {
            try
            {
                var subject = reminderType == "24h" 
                    ? $"BEESRS - Event Reminder: {eventEntity.Title} (24 hours)"
                    : $"BEESRS - Event Reminder: {eventEntity.Title} (1 hour)";
                var body = GetEventReminderEmailTemplate(eventEntity, reminderType);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending event reminder email to: {Email}", email);
                return false;
            }
        }

        public async Task<bool> SendEventRescheduleEmailAsync(string email, Domain.Entities.Event eventEntity, string organizerName, string reason, DateTime previousDate, TimeSpan previousTime)
        {
            try
            {
                var subject = $"BEESRS - Event Rescheduled: {eventEntity.Title}";
                var body = GetEventRescheduleEmailTemplate(eventEntity, organizerName, reason, previousDate, previousTime);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending event reschedule email to: {Email}", email);
                return false;
            }
        }

        public async Task<bool> SendVotingDeadlineReminderEmailAsync(string email, Domain.Entities.Event eventEntity)
        {
            try
            {
                var subject = $"BEESRS - Voting Deadline Reminder: {eventEntity.Title}";
                var body = GetVotingDeadlineReminderEmailTemplate(eventEntity);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending voting deadline reminder email to: {Email}", email);
                return false;
            }
        }

        public async Task<bool> SendRsvpDeadlineReminderEmailAsync(string email, Domain.Entities.Event eventEntity)
        {
            try
            {
                var subject = $"BEESRS - RSVP Deadline Reminder: {eventEntity.Title}";
                var body = GetRsvpDeadlineReminderEmailTemplate(eventEntity);

                return await SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending RSVP deadline reminder email to: {Email}", email);
                return false;
            }
        }

        private static string GetEventReminderEmailTemplate(Domain.Entities.Event eventEntity, string reminderType)
        {
            var eventDate = eventEntity.ScheduledDate.ToString("dddd, MMMM dd, yyyy");
            var eventTime = eventEntity.ScheduledTime.ToString(@"hh\:mm");
            var timeUntil = reminderType == "24h" ? "24 hours" : "1 hour";
            var urgencyColor = reminderType == "24h" ? "#ffc107" : "#dc3545";

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Event Reminder</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {urgencyColor}; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .event-card {{ background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .event-title {{ font-size: 24px; font-weight: bold; color: {urgencyColor}; margin-bottom: 15px; }}
        .event-detail {{ margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }}
        .event-detail:last-child {{ border-bottom: none; }}
        .event-detail-label {{ font-weight: bold; color: #666; display: inline-block; width: 150px; }}
        .event-detail-value {{ color: #333; }}
        .reminder-notice {{ background-color: #fff3cd; border: 1px solid {urgencyColor}; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>⏰ Event Reminder</h1>
        </div>
        <div class='content'>
            <h2>Hello,</h2>
            <p>This is a friendly reminder that you have an event coming up in <strong>{timeUntil}</strong>!</p>
            
            <div class='reminder-notice'>
                <strong>📅 Don't forget:</strong> Your event is scheduled to start soon.
            </div>
            
            <div class='event-card'>
                <div class='event-title'>{eventEntity.Title}</div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Date:</span>
                    <span class='event-detail-value'>{eventDate}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Time:</span>
                    <span class='event-detail-value'>{eventTime}</span>
                </div>
                
                {(eventEntity.FinalPlace != null ? $@"
                <div class='event-detail'>
                    <span class='event-detail-label'>Location:</span>
                    <span class='event-detail-value'>{eventEntity.FinalPlace.Name}</span>
                </div>
                
                <div class='event-detail'>
                    <span class='event-detail-label'>Address:</span>
                    <span class='event-detail-value'>{eventEntity.FinalPlace.Name ?? "N/A"}</span>
                </div>
                " : "")}
            </div>
            
            <p>We look forward to seeing you there!</p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
            <p>This is an automated reminder for your upcoming event.</p>
        </div>
    </div>
</body>
</html>";
        }

        private static string GetEventRescheduleEmailTemplate(Domain.Entities.Event eventEntity, string organizerName, string reason, DateTime previousDate, TimeSpan previousTime)
        {
            var newDate = eventEntity.ScheduledDate.ToString("dddd, MMMM dd, yyyy");
            var newTime = eventEntity.ScheduledTime.ToString(@"hh\:mm");
            var oldDate = previousDate.ToString("dddd, MMMM dd, yyyy");
            var oldTime = previousTime.ToString(@"hh\:mm");
            var reasonText = string.IsNullOrWhiteSpace(reason) ? "No reason provided." : reason;

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Event Rescheduled</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #ffc107; color: #212529; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .event-card {{ background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .event-title {{ font-size: 24px; font-weight: bold; color: #ffc107; margin-bottom: 15px; }}
        .event-detail {{ margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }}
        .event-detail:last-child {{ border-bottom: none; }}
        .event-detail-label {{ font-weight: bold; color: #666; display: inline-block; width: 150px; }}
        .event-detail-value {{ color: #333; }}
        .change-notice {{ background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .old-schedule {{ background-color: #f8d7da; padding: 10px; border-radius: 5px; margin: 10px 0; }}
        .new-schedule {{ background-color: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0; }}
        .reason-box {{ background-color: #e9ecef; padding: 15px; margin: 15px 0; border-radius: 4px; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🔄 Event Rescheduled</h1>
        </div>
        <div class='content'>
            <h2>Hello,</h2>
            <p><strong>{organizerName}</strong> has rescheduled the event you're invited to. Please note the new date and time below.</p>
            
            <div class='change-notice'>
                <strong>⚠️ Important:</strong> The event schedule has been changed.
            </div>
            
            <div class='event-card'>
                <div class='event-title'>{eventEntity.Title}</div>
                
                <div class='old-schedule'>
                    <strong>❌ Previous Schedule:</strong><br>
                    Date: {oldDate}<br>
                    Time: {oldTime}
                </div>
                
                <div class='new-schedule'>
                    <strong>✅ New Schedule:</strong><br>
                    Date: {newDate}<br>
                    Time: {newTime}
                </div>
            </div>
            
            <div class='reason-box'>
                <strong>📝 Reason for Rescheduling:</strong>
                <p style='margin-top: 10px;'>{reasonText}</p>
            </div>
            
            <p>Please update your calendar accordingly. We apologize for any inconvenience.</p>
            
            <p>If you have any questions, please contact the event organizer: <strong>{organizerName}</strong></p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
            <p>This is an automated notification about event rescheduling.</p>
        </div>
    </div>
</body>
</html>";
        }

        private static string GetVotingDeadlineReminderEmailTemplate(Domain.Entities.Event eventEntity)
        {
            var deadline = eventEntity.VotingDeadline?.ToString("dddd, MMMM dd, yyyy 'at' HH:mm") ?? "N/A";
            var eventDate = eventEntity.ScheduledDate.ToString("dddd, MMMM dd, yyyy");

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Voting Deadline Reminder</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .deadline-notice {{ background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🗳️ Voting Deadline Reminder</h1>
        </div>
        <div class='content'>
            <h2>Hello,</h2>
            <p>This is a reminder that the voting deadline for event <strong>""{eventEntity.Title}""</strong> is approaching.</p>
            
            <div class='deadline-notice'>
                <strong>⏰ Voting Deadline:</strong> {deadline}
            </div>
            
            <p>Event Date: {eventDate}</p>
            
            <p>Please make sure to cast your vote before the deadline. Your input is important!</p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        private static string GetRsvpDeadlineReminderEmailTemplate(Domain.Entities.Event eventEntity)
        {
            var deadline = eventEntity.RsvpDeadline?.ToString("dddd, MMMM dd, yyyy 'at' HH:mm") ?? "N/A";
            var eventDate = eventEntity.ScheduledDate.ToString("dddd, MMMM dd, yyyy");

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>RSVP Deadline Reminder</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .deadline-notice {{ background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>📋 RSVP Deadline Reminder</h1>
        </div>
        <div class='content'>
            <h2>Hello,</h2>
            <p>This is a reminder that the RSVP deadline for event <strong>""{eventEntity.Title}""</strong> is approaching.</p>
            
            <div class='deadline-notice'>
                <strong>⏰ RSVP Deadline:</strong> {deadline}
            </div>
            
            <p>Event Date: {eventDate}</p>
            
            <p>Please respond to the invitation before the deadline so the organizer can plan accordingly.</p>
            
            <p>Best regards,<br>The BEESRS Team</p>
        </div>
        <div class='footer'>
            <p>© 2025 BEESRS. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }
    }
}